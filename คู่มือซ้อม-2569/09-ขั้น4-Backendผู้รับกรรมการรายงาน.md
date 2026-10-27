# 09 ขั้น 4 Back-end ผู้รับการประเมิน กรรมการ รายงาน ไฟล์ สำรองข้อมูล (คนที่ 1)

## 4.1 `backend/routes/self.js` — ผู้รับการประเมิน (ข้อ 5.2)

- `GET /self/periods/:id` คืน `progress` (ร้อยละความก้าวหน้า ข้อ 5.2.7) และ `committees` (ความเห็นกรรมการ ข้อ 5.2.9)
- `POST /self/details` รับ **form-data** มีไฟล์ได้ (ข้อ 5.2.4, 6.5) และเพิ่มได้หลายรายการ (ข้อ 5.2.3)
- `lockReason()` ล็อกการแก้ไขทุก API ที่เปลี่ยนข้อมูล (กรอกคะแนน เพิ่ม/แก้/ลบรายละเอียด) เมื่อ **อยู่นอกช่วงวันเปิด-ปิด** หรือ **กรรมการเริ่มประเมินแล้ว** (บันทึกร่างหรือยืนยันผล) กันผู้รับแก้คะแนนตนเองหลังกรรมการตรวจไปแล้ว
- ความก้าวหน้า (`progress`) นับข้อที่ **มีทั้งคะแนนตนเองและรายละเอียดอย่างน้อย 1 รายการ** ข้อที่มีแค่คะแนนยังไม่นับ

ไฟล์ `backend/routes/self.js`

```js
// /api/self — ผู้รับการประเมิน: ประเมินตนเอง เพิ่มรายละเอียด แนบหลักฐาน (evaluatee)
const router = require('express').Router();
const { query } = require('../db');
const { ok, error, isOpen, validScore, getIndicators, getPeriodOfIndicator } = require('../helpers');
const { upload } = require('../upload');

// แก้ไขการประเมินตนเองได้หรือไม่: ต้องอยู่ในช่วงเปิด และกรรมการยังไม่เริ่มให้คะแนน
// (กรรมการบันทึกร่างหรือยืนยันผลแล้ว = ล็อก) คืนข้อความเหตุผลเมื่อแก้ไม่ได้ / คืน null เมื่อแก้ได้
async function lockReason(period, userId) {
  if (!isOpen(period)) return 'อยู่นอกช่วงเวลาประเมิน แก้ไขไม่ได้';
  const rows = await query(
    "SELECT id FROM assignments WHERE period_id = ? AND evaluatee_id = ? AND status <> 'pending'",
    [period.id, userId],
  );
  if (rows.length > 0) return 'กรรมการประเมินแล้ว แก้ไขการประเมินตนเองไม่ได้';
  return null;
}

// หารอบจาก id ของรายละเอียด (ใช้ตอนแก้/ลบรายละเอียด)
async function getPeriodOfDetail(detailId, userId) {
  const rows = await query('SELECT indicator_id FROM self_details WHERE id = ? AND evaluatee_id = ?', [
    detailId, userId,
  ]);
  return rows[0] ? getPeriodOfIndicator(rows[0].indicator_id) : null;
}

// GET /api/self/periods  รอบที่ฉันถูกประเมิน
router.get('/periods', async (req, res) => {
  const rows = await query(
    `SELECT DISTINCT p.* FROM periods p
     JOIN assignments a ON a.period_id = p.id
     WHERE a.evaluatee_id = ? ORDER BY p.id DESC`,
    [req.user.id],
  );
  ok(res, rows);
});

// GET /api/self/periods/:id  ข้อมูลประเมินตนเองของรอบนี้ + ความก้าวหน้า + ความเห็นกรรมการ
router.get('/periods/:id', async (req, res) => {
  const periods = await query('SELECT * FROM periods WHERE id = ?', [req.params.id]);
  if (periods.length === 0) return error(res, 404, 'ไม่พบรอบการประเมิน');

  const indicators = await getIndicators(req.params.id);
  const scores = await query('SELECT * FROM self_scores WHERE evaluatee_id = ?', [req.user.id]);
  const details = await query('SELECT * FROM self_details WHERE evaluatee_id = ?', [req.user.id]);

  // ใส่คะแนนและรายละเอียดลงในตัวชี้วัดแต่ละข้อ
  let done = 0;
  for (const item of indicators) {
    const row = scores.find((s) => s.indicator_id === item.id);
    item.my_score = row ? row.score : null;
    item.details = details.filter((d) => d.indicator_id === item.id);
    if (item.my_score !== null && item.details.length > 0) done++;
  }

  // ความเห็นกรรมการ แสดงเมื่อกรรมการยืนยันผลแล้ว
  const committees = await query(
    `SELECT u.full_name, a.committee_role, a.status,
       IF(a.status = 'confirmed', a.comment, NULL) AS comment
     FROM assignments a JOIN users u ON u.id = a.evaluator_id
     WHERE a.period_id = ? AND a.evaluatee_id = ?`,
    [req.params.id, req.user.id],
  );

  const reason = await lockReason(periods[0], req.user.id);
  ok(res, {
    period: periods[0],
    can_edit: reason === null,
    lock_reason: reason,
    indicators,
    progress: indicators.length ? Math.round((done / indicators.length) * 100) : 0,
    committees,
  });
});

// PUT /api/self/scores  กรอก/แก้คะแนนตนเอง  body: indicator_id, score
router.put('/scores', async (req, res) => {
  const { indicator_id, score } = req.body;
  const period = await getPeriodOfIndicator(indicator_id);
  if (!period) return error(res, 404, 'ไม่พบตัวชี้วัด');
  const reason = await lockReason(period, req.user.id);
  if (reason) return error(res, 403, reason);

  const indicators = await query('SELECT * FROM indicators WHERE id = ?', [indicator_id]);
  if (!validScore(indicators[0], score)) return error(res, 400, 'คะแนนไม่ถูกต้อง');

  // มีแล้วให้แก้ ยังไม่มีให้เพิ่ม
  await query(
    `INSERT INTO self_scores (evaluatee_id, indicator_id, score) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE score = VALUES(score)`,
    [req.user.id, indicator_id, score],
  );
  ok(res, null, 'บันทึกคะแนนแล้ว');
});

// POST /api/self/details  เพิ่มรายละเอียด/หลักฐาน (form-data)  fields: indicator_id, detail, url, file
// เพิ่มได้หลายรายการต่อตัวชี้วัด
router.post('/details', upload.single('file'), async (req, res) => {
  const { indicator_id, detail, url } = req.body;
  if (!detail) return error(res, 400, 'กรอกรายละเอียด');
  if (url && !url.startsWith('http')) return error(res, 400, 'URL ต้องขึ้นต้นด้วย http:// หรือ https://');

  const period = await getPeriodOfIndicator(indicator_id);
  if (!period) return error(res, 404, 'ไม่พบตัวชี้วัด');
  const reason = await lockReason(period, req.user.id);
  if (reason) return error(res, 403, reason);

  const fileName = req.file ? req.file.filename : '';
  const result = await query(
    'INSERT INTO self_details (evaluatee_id, indicator_id, detail, url, file_name) VALUES (?, ?, ?, ?, ?)',
    [req.user.id, indicator_id, detail, url || '', fileName],
  );
  ok(res, { id: result.insertId }, 'เพิ่มรายละเอียดแล้ว');
});

// PUT /api/self/details/:id  แก้ไขรายละเอียด  body: detail, url
router.put('/details/:id', async (req, res) => {
  const { detail, url } = req.body;
  if (!detail) return error(res, 400, 'กรอกรายละเอียด');
  const period = await getPeriodOfDetail(req.params.id, req.user.id);
  if (!period) return error(res, 404, 'ไม่พบรายละเอียด');
  const reason = await lockReason(period, req.user.id);
  if (reason) return error(res, 403, reason);

  const result = await query('UPDATE self_details SET detail = ?, url = ? WHERE id = ? AND evaluatee_id = ?', [
    detail, url || '', req.params.id, req.user.id,
  ]);
  if (result.affectedRows === 0) return error(res, 404, 'ไม่พบรายละเอียด');
  ok(res, null, 'แก้ไขรายละเอียดแล้ว');
});

// DELETE /api/self/details/:id  ลบรายละเอียด
router.delete('/details/:id', async (req, res) => {
  const period = await getPeriodOfDetail(req.params.id, req.user.id);
  if (!period) return error(res, 404, 'ไม่พบรายละเอียด');
  const reason = await lockReason(period, req.user.id);
  if (reason) return error(res, 403, reason);

  const result = await query('DELETE FROM self_details WHERE id = ? AND evaluatee_id = ?', [
    req.params.id, req.user.id,
  ]);
  if (result.affectedRows === 0) return error(res, 404, 'ไม่พบรายละเอียด');
  ok(res, null, 'ลบรายละเอียดแล้ว');
});

module.exports = router;
```

## 4.2 `backend/routes/evaluate.js` — กรรมการ (ข้อ 5.3)

- `PUT /evaluate/:id` = **บันทึกร่าง / แก้ไขร่าง** เปลี่ยนสถานะเป็น `draft` (ข้อ 5.3.7–5.3.8)
- `POST /evaluate/:id/signature` = แนบลายเซ็น (ข้อ 5.3.9)
- `PUT /evaluate/:id/confirm` = ตรวจครบแล้วเปลี่ยนเป็น `confirmed` (ข้อ 5.3.10) หลังจากนี้แก้ไม่ได้

ไฟล์ `backend/routes/evaluate.js`

```js
// /api/evaluate — กรรมการให้คะแนน บันทึกร่าง ลงนาม และยืนยันผล (evaluator)
const router = require('express').Router();
const { query } = require('../db');
const { ok, error, validScore, percent, getIndicators } = require('../helpers');
const { upload } = require('../upload');

// หางานมอบหมายที่เป็นของกรรมการคนนี้เท่านั้น
async function getMyAssignment(id, userId) {
  const rows = await query('SELECT * FROM assignments WHERE id = ? AND evaluator_id = ?', [id, userId]);
  return rows[0];
}

// GET /api/evaluate  รายชื่อผู้ที่ฉันต้องประเมิน
router.get('/', async (req, res) => {
  const rows = await query(
    `SELECT a.id, a.committee_role, a.status, u.full_name, u.department, p.name AS period_name
     FROM assignments a
     JOIN users u ON u.id = a.evaluatee_id
     JOIN periods p ON p.id = a.period_id
     WHERE a.evaluator_id = ? ORDER BY a.id DESC`,
    [req.user.id],
  );
  ok(res, rows);
});

// GET /api/evaluate/:id  ข้อมูลผู้รับ ตัวชี้วัด รายละเอียด หลักฐาน คะแนนตนเอง และคะแนนที่ฉันให้
router.get('/:id', async (req, res) => {
  const assignment = await getMyAssignment(req.params.id, req.user.id);
  if (!assignment) return error(res, 404, 'ไม่พบงานที่มอบหมาย');

  const users = await query('SELECT id, full_name, email, department FROM users WHERE id = ?', [
    assignment.evaluatee_id,
  ]);
  const periods = await query('SELECT * FROM periods WHERE id = ?', [assignment.period_id]);
  const indicators = await getIndicators(assignment.period_id);
  const selfScores = await query('SELECT * FROM self_scores WHERE evaluatee_id = ?', [assignment.evaluatee_id]);
  const details = await query('SELECT * FROM self_details WHERE evaluatee_id = ?', [assignment.evaluatee_id]);
  const myScores = await query('SELECT * FROM scores WHERE assignment_id = ?', [assignment.id]);

  for (const item of indicators) {
    const self = selfScores.find((s) => s.indicator_id === item.id);
    const mine = myScores.find((s) => s.indicator_id === item.id);
    item.self_score = self ? self.score : null;
    item.score = mine ? mine.score : null;
    item.details = details.filter((d) => d.indicator_id === item.id);
  }

  ok(res, {
    assignment,
    evaluatee: users[0],
    period: periods[0],
    indicators,
    percent: percent(indicators, myScores),
  });
});

// PUT /api/evaluate/:id  บันทึกร่าง / แก้ไขร่าง
// body: scores: [{ indicator_id, score }], comment
router.put('/:id', async (req, res) => {
  const assignment = await getMyAssignment(req.params.id, req.user.id);
  if (!assignment) return error(res, 404, 'ไม่พบงานที่มอบหมาย');
  if (assignment.status === 'confirmed') return error(res, 400, 'ยืนยันผลแล้ว แก้ไขไม่ได้');

  const indicators = await getIndicators(assignment.period_id);
  const scores = req.body.scores || [];
  for (const s of scores) {
    const item = indicators.find((i) => i.id === s.indicator_id);
    if (!item) return error(res, 400, 'ตัวชี้วัดไม่อยู่ในรอบนี้');
    if (s.score === null) continue; // ข้อที่ยังไม่ให้คะแนน ข้ามไปก่อน
    if (!validScore(item, s.score)) return error(res, 400, 'คะแนนข้อ ' + item.name + ' ไม่ถูกต้อง');
    await query(
      `INSERT INTO scores (assignment_id, indicator_id, score) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE score = VALUES(score)`,
      [assignment.id, s.indicator_id, s.score],
    );
  }

  await query("UPDATE assignments SET comment = ?, status = 'draft' WHERE id = ?", [
    req.body.comment || '', assignment.id,
  ]);
  ok(res, null, 'บันทึกร่างแล้ว');
});

// POST /api/evaluate/:id/signature  แนบลายเซ็น (form-data: file รูป PNG/JPG)
router.post('/:id/signature', upload.single('file'), async (req, res) => {
  const assignment = await getMyAssignment(req.params.id, req.user.id);
  if (!assignment) return error(res, 404, 'ไม่พบงานที่มอบหมาย');
  if (assignment.status === 'confirmed') return error(res, 400, 'ยืนยันผลแล้ว แก้ไขไม่ได้');
  if (!req.file || !req.file.mimetype.startsWith('image/')) return error(res, 400, 'เลือกรูปลายเซ็น PNG หรือ JPG');

  await query('UPDATE assignments SET signature = ? WHERE id = ?', [req.file.filename, assignment.id]);
  ok(res, { signature: req.file.filename }, 'แนบลายเซ็นแล้ว');
});

// PUT /api/evaluate/:id/confirm  ยืนยันและส่งผล (ต้องให้คะแนนครบ มีความเห็น และลายเซ็น)
router.put('/:id/confirm', async (req, res) => {
  const assignment = await getMyAssignment(req.params.id, req.user.id);
  if (!assignment) return error(res, 404, 'ไม่พบงานที่มอบหมาย');

  const indicators = await getIndicators(assignment.period_id);
  const scores = await query('SELECT * FROM scores WHERE assignment_id = ?', [assignment.id]);
  if (percent(indicators, scores) === null) return error(res, 400, 'ให้คะแนนยังไม่ครบทุกตัวชี้วัด');
  if (!assignment.comment) return error(res, 400, 'กรอกความคิดเห็นสรุปก่อน');
  if (!assignment.signature) return error(res, 400, 'แนบลายเซ็นก่อน');

  await query("UPDATE assignments SET status = 'confirmed' WHERE id = ?", [assignment.id]);
  ok(res, null, 'ยืนยันและส่งผลการประเมินแล้ว');
});

module.exports = router;
```

## 4.3 `backend/routes/reports.js` — Dashboard และรายงาน (ข้อ 5.1.10–5.1.13, 8.1, 8.5)

ไฟล์ `backend/routes/reports.js`

```js
// /api/reports — Dashboard สรุปผล ติดตามสถานะ และรายงานรายบุคคล
const router = require('express').Router();
const { query } = require('../db');
const { ok, error, percent, getIndicators } = require('../helpers');
const { allow } = require('../auth');

// GET /api/reports/dashboard  ตัวเลขภาพรวมสำหรับหน้า Dashboard (admin)
router.get('/dashboard', allow('admin'), async (req, res) => {
  const users = await query('SELECT role, COUNT(*) AS total FROM users GROUP BY role');
  const status = await query('SELECT status, COUNT(*) AS total FROM assignments GROUP BY status');
  const periods = await query('SELECT COUNT(*) AS total FROM periods');
  ok(res, { users, status, periods: periods[0].total });
});

// GET /api/reports/periods/:id  สรุปรอบ: รายผู้รับ (ร้อยละที่กรอก + สถานะกรรมการ) และรายกรรมการ (admin)
router.get('/periods/:id', allow('admin'), async (req, res) => {
  const periods = await query('SELECT * FROM periods WHERE id = ?', [req.params.id]);
  if (periods.length === 0) return error(res, 404, 'ไม่พบรอบการประเมิน');
  const indicators = await getIndicators(req.params.id);

  const assignments = await query(
    `SELECT a.*, e.full_name AS evaluatee_name, v.full_name AS evaluator_name
     FROM assignments a
     JOIN users e ON e.id = a.evaluatee_id
     JOIN users v ON v.id = a.evaluator_id
     WHERE a.period_id = ? ORDER BY e.full_name`,
    [req.params.id],
  );

  // รายผู้รับการประเมิน
  const evaluatees = [];
  for (const a of assignments) {
    a.percent = percent(indicators, await query('SELECT * FROM scores WHERE assignment_id = ?', [a.id]));
    let person = evaluatees.find((p) => p.id === a.evaluatee_id);
    if (!person) {
      // ร้อยละการบันทึกข้อมูล = ตัวชี้วัดที่กรอกคะแนนตนเองแล้ว / ตัวชี้วัดทั้งหมด
      const filled = await query(
        `SELECT COUNT(*) AS total FROM self_scores s JOIN indicators i ON i.id = s.indicator_id
         JOIN topics t ON t.id = i.topic_id WHERE s.evaluatee_id = ? AND t.period_id = ?`,
        [a.evaluatee_id, req.params.id],
      );
      person = {
        id: a.evaluatee_id,
        full_name: a.evaluatee_name,
        progress: indicators.length ? Math.round((filled[0].total / indicators.length) * 100) : 0,
        committees: [],
      };
      evaluatees.push(person);
    }
    person.committees.push(a);
  }

  // รายกรรมการ: ได้รับมอบหมายกี่คน ยืนยันแล้วกี่คน
  const evaluators = [];
  for (const a of assignments) {
    let row = evaluators.find((v) => v.id === a.evaluator_id);
    if (!row) {
      row = { id: a.evaluator_id, full_name: a.evaluator_name, total: 0, confirmed: 0 };
      evaluators.push(row);
    }
    row.total++;
    if (a.status === 'confirmed') row.confirmed++;
  }

  ok(res, { period: periods[0], indicators: indicators.length, evaluatees, evaluators });
});

// GET /api/reports/result/:periodId/:userId  รายงานผลการประเมินรายบุคคล
// เปิดได้: admin, ผู้รับคนนั้นเอง, กรรมการที่ได้รับมอบหมาย
router.get('/result/:periodId/:userId', async (req, res) => {
  const { periodId, userId } = req.params;
  const committees = await query(
    `SELECT a.*, u.full_name FROM assignments a JOIN users u ON u.id = a.evaluator_id
     WHERE a.period_id = ? AND a.evaluatee_id = ? ORDER BY a.committee_role`,
    [periodId, userId],
  );
  const isOwner = req.user.id === Number(userId);
  const isCommittee = committees.some((c) => c.evaluator_id === req.user.id);
  if (req.user.role !== 'admin' && !isOwner && !isCommittee) return error(res, 403, 'ไม่มีสิทธิ์ดูรายงานนี้');

  const users = await query('SELECT id, full_name, email, department FROM users WHERE id = ?', [userId]);
  const periods = await query('SELECT * FROM periods WHERE id = ?', [periodId]);
  if (users.length === 0 || periods.length === 0) return error(res, 404, 'ไม่พบข้อมูล');

  const indicators = await getIndicators(periodId);
  const selfScores = await query('SELECT * FROM self_scores WHERE evaluatee_id = ?', [userId]);
  for (const item of indicators) {
    const self = selfScores.find((s) => s.indicator_id === item.id);
    item.self_score = self ? self.score : null;
  }

  // คะแนนของกรรมการแต่ละคน (ผู้รับเห็นเฉพาะของกรรมการที่ยืนยันแล้ว)
  const confirmed = [];
  for (const c of committees) {
    c.scores = await query('SELECT indicator_id, score FROM scores WHERE assignment_id = ?', [c.id]);
    c.percent = percent(indicators, c.scores);
    if (c.status === 'confirmed') confirmed.push(c.percent);
    if (isOwner && c.status !== 'confirmed') {
      c.scores = [];
      c.percent = null;
      c.comment = null;
    }
  }
  const total = confirmed.length
    ? Math.round((confirmed.reduce((sum, p) => sum + p, 0) / confirmed.length) * 100) / 100
    : null;

  ok(res, { evaluatee: users[0], period: periods[0], indicators, committees, total });
});

module.exports = router;
```

- `GET /reports/result/...` ผู้รับการประเมิน (`isOwner`) เห็นคะแนนรายข้อ ร้อยละ และความเห็น **เฉพาะของกรรมการที่ยืนยันผลแล้ว** ถ้ากรรมการยังเป็นร่าง จะเห็นแค่สถานะ ส่วน admin และกรรมการเห็นทุกสถานะ

## 4.4 `backend/routes/files.js` — ดาวน์โหลดไฟล์ (ข้อ 8.3)

ไฟล์ `backend/routes/files.js`

```js
// /api/files — ดาวน์โหลดไฟล์หลักฐานและลายเซ็น (ต้อง login)
const router = require('express').Router();
const path = require('node:path');
const fs = require('node:fs');
const { error } = require('../helpers');
const { folder } = require('../upload');

// GET /api/files/:name  ดาวน์โหลดไฟล์  (ใช้ ?token=... ได้ เมื่อเปิดจากลิงก์)
router.get('/:name', (req, res) => {
  const file = path.join(folder, path.basename(req.params.name)); // basename กันการขอไฟล์นอกโฟลเดอร์
  if (!fs.existsSync(file)) return error(res, 404, 'ไม่พบไฟล์');
  res.download(file);
});

module.exports = router;
```

## 4.5 `backend/routes/backup.js` — สำรองและกู้คืน (ข้อ 8.4)

ไฟล์ `backend/routes/backup.js`

```js
// /api/backup — สำรองและกู้คืนข้อมูลเป็นไฟล์ JSON (admin)
const router = require('express').Router();
const { pool, query } = require('../db');
const { ok, error } = require('../helpers');

// เรียงจากตารางแม่ → ตารางลูก
const TABLES = ['users', 'periods', 'topics', 'indicators', 'assignments', 'self_scores', 'self_details', 'scores'];

// GET /api/backup  ดาวน์โหลดข้อมูลทุกตารางเป็นไฟล์ JSON
router.get('/', async (req, res) => {
  const backup = { created_at: new Date().toISOString(), tables: {} };
  for (const table of TABLES) {
    backup.tables[table] = await query(`SELECT * FROM ${table}`);
  }
  res.setHeader('Content-Disposition', 'attachment; filename=backup.json');
  res.json(backup);
});

// POST /api/backup/restore  กู้คืนจากไฟล์ JSON  body: เนื้อหาไฟล์ backup.json
router.post('/restore', async (req, res) => {
  const tables = req.body.tables;
  if (!tables || !tables.users) return error(res, 400, 'ไฟล์สำรองไม่ถูกต้อง');

  const db = await pool.getConnection();
  try {
    await db.beginTransaction();
    await db.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const table of TABLES) {
      await db.query(`DELETE FROM ${table}`);
      for (const row of tables[table] || []) {
        await db.query(`INSERT INTO ${table} SET ?`, [row]);
      }
    }
    await db.query('SET FOREIGN_KEY_CHECKS = 1');
    await db.commit();
  } catch (err) {
    await db.rollback();
    throw err;
  } finally {
    db.release();
  }
  ok(res, null, 'กู้คืนข้อมูลแล้ว');
});

module.exports = router;
```

## ✔ ตรวจขั้น 4

```bash
docker compose up -d db phpmyadmin backend
docker compose logs -f backend
```

ต้องเห็น `API พร้อมที่ http://localhost:3000` ไม่มี error สีแดง แล้วทดสอบด้วย Thunder Client ตามลำดับ (URL ขึ้นต้น `http://localhost:3000`)

| # | ใคร | Method + URL | Body | ผลที่ต้องได้ |
|---|---|---|---|---|
| 1 | emp1 (login `emp1`/`emp12345`) | GET /api/self/periods | - | **403** กรุณาเปลี่ยนรหัสผ่านก่อนใช้งาน |
| 2 | emp1 | PUT /api/auth/password | `{"old_password":"emp12345","new_password":"newpass123"}` | 200 ได้ `token` ใหม่ **ใช้ token นี้ต่อ** |
| 3 | emp1 | GET /api/users | - | **403** ไม่มีสิทธิ์ใช้งานส่วนนี้ (ตรวจสิทธิ์ตามบทบาท ข้อ 6.12) |
| 4 | emp1 | PUT /api/self/scores | `{"indicator_id":1,"score":3}` | 200 บันทึกคะแนนแล้ว |
| 5 | emp1 | PUT /api/self/scores | `{"indicator_id":1,"score":9}` | **400** คะแนนไม่ถูกต้อง (Validate ข้อ 7.4) |
| 6 | emp1 | POST /api/self/details | Body → **Form** → ติ๊ก Files: `indicator_id`=1, `detail`=แผนวิชา A, `file`=ไฟล์ PDF | 200 (ทำ 2 ครั้งให้มี 2 รายการ) |
| 7 | emp1 | GET /api/self/periods/1 | - | ข้อ 1 มี `details` 2 รายการ, `progress` = 50 (มีรายละเอียดแค่ข้อเดียวจาก 2 ข้อ) |
| 8 | eva1 (login แล้วเปลี่ยนรหัสแบบข้อ 2) | PUT /api/evaluate/1 | `{"scores":[{"indicator_id":1,"score":4}],"comment":"ดี"}` | 200 บันทึกร่างแล้ว |
| 9 | eva1 | PUT /api/evaluate/1/confirm | - | **400** ให้คะแนนยังไม่ครบทุกตัวชี้วัด ← แบบนี้ถูกต้อง |
| 10 | emp1 | PUT /api/self/scores | `{"indicator_id":1,"score":2}` | **403** กรรมการประเมินแล้ว แก้ไขการประเมินตนเองไม่ได้ |
| 11 | admin | GET /api/reports/periods/1 | - | `evaluatees` มี `progress` และ `committees[].status` (`draft` 1 รายการ) |
| 12 | admin | GET /api/backup | - | ได้ JSON ทุกตาราง |

> ถ้าในขั้น 3 เพิ่มตัวชี้วัด "ทดสอบ" ไว้ ข้อ 7 จะได้ `progress` = 33 แทน 50 ไม่ผิด

ทดสอบเสร็จแล้ว ข้อมูลถูกเปลี่ยนไปหลายอย่าง (emp1 ถูกล็อก, eva1 มีร่างค้าง) ก่อนทำขั้น 7 ให้ **รีเซ็ตฐานข้อมูล** ตามที่บอกในหัวข้อ ✔ ตรวจขั้น 7
