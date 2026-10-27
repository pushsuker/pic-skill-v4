# 08 ขั้น 3 Back-end งานบุคลากร (คนที่ 1)

เป้าหมาย: API ของ admin ครบ — ผู้ใช้, รอบ, หัวข้อ, ตัวชี้วัด, มอบหมายกรรมการ (ข้อ 5.1.1–5.1.9)

รูปแบบทุก route เหมือนกัน จำให้ได้ 4 ขั้น

```js
router.post('/', async (req, res) => {
  // 1) อ่านข้อมูลจาก req.body / req.params / req.query
  // 2) ตรวจข้อมูล ผิด → return error(res, 400, 'ข้อความ')
  // 3) query ฐานข้อมูล ใช้ ? แทนค่าเสมอ
  // 4) ok(res, ข้อมูล, 'ข้อความสำเร็จ')
});
```

## 3.1 `backend/routes/users.js` — ผู้ใช้ + Reset Password

ไฟล์ `backend/routes/users.js`

```js
// /api/users — ฝ่ายบุคลากรจัดการผู้รับการประเมินและกรรมการ (admin)
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { query } = require('../db');
const { ok, error } = require('../helpers');

const FIELDS = 'id, username, full_name, email, department, role, must_change_password';

// ตรวจข้อมูลผู้ใช้ก่อนบันทึก คืนข้อความ error หรือ '' ถ้าถูกต้อง
function validate(b) {
  if (!b.full_name) return 'กรอกชื่อ-นามสกุล';
  if (!['evaluatee', 'evaluator'].includes(b.role)) return 'เลือกบทบาทผู้รับการประเมินหรือกรรมการ';
  if (b.email && !/^\S+@\S+\.\S+$/.test(b.email)) return 'รูปแบบอีเมลไม่ถูกต้อง';
  return '';
}

// GET /api/users?role=evaluatee  รายชื่อผู้ใช้ (กรองตามบทบาทได้)
router.get('/', async (req, res) => {
  if (req.query.role) {
    return ok(res, await query(`SELECT ${FIELDS} FROM users WHERE role = ? ORDER BY id`, [req.query.role]));
  }
  ok(res, await query(`SELECT ${FIELDS} FROM users ORDER BY id`));
});

// GET /api/users/:id  ผู้ใช้ 1 คน
router.get('/:id', async (req, res) => {
  const rows = await query(`SELECT ${FIELDS} FROM users WHERE id = ?`, [req.params.id]);
  if (rows.length === 0) return error(res, 404, 'ไม่พบผู้ใช้');
  ok(res, rows[0]);
});

// POST /api/users  เพิ่มผู้ใช้  body: username, password, full_name, email, department, role
router.post('/', async (req, res) => {
  const b = req.body;
  if (!b.username || b.username.length > 50) return error(res, 400, 'กรอกชื่อผู้ใช้ (ไม่เกิน 50 ตัว)');
  if (!b.password || b.password.length < 8) return error(res, 400, 'รหัสผ่านอย่างน้อย 8 ตัวอักษร');
  const message = validate(b);
  if (message) return error(res, 400, message);

  const hash = await bcrypt.hash(b.password, 10);
  const result = await query(
    'INSERT INTO users (username, password, full_name, email, department, role) VALUES (?, ?, ?, ?, ?, ?)',
    [b.username, hash, b.full_name, b.email || '', b.department || '', b.role],
  );
  ok(res, { id: result.insertId }, 'เพิ่มผู้ใช้แล้ว');
});

// PUT /api/users/:id  แก้ไขผู้ใช้  body: full_name, email, department, role
router.put('/:id', async (req, res) => {
  const b = req.body;
  const message = validate(b);
  if (message) return error(res, 400, message);

  const result = await query(
    'UPDATE users SET full_name = ?, email = ?, department = ?, role = ? WHERE id = ?',
    [b.full_name, b.email || '', b.department || '', b.role, req.params.id],
  );
  if (result.affectedRows === 0) return error(res, 404, 'ไม่พบผู้ใช้');
  ok(res, null, 'แก้ไขผู้ใช้แล้ว');
});

// PUT /api/users/:id/reset-password  คืนค่ารหัสผ่าน  body: password
// หลังรีเซ็ต ผู้ใช้ต้องเปลี่ยนรหัสผ่านใหม่เมื่อเข้าระบบครั้งถัดไป
router.put('/:id/reset-password', async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 8) return error(res, 400, 'รหัสผ่านอย่างน้อย 8 ตัวอักษร');

  const hash = await bcrypt.hash(password, 10);
  const result = await query(
    'UPDATE users SET password = ?, must_change_password = 1 WHERE id = ? AND role <> "admin"',
    [hash, req.params.id],
  );
  if (result.affectedRows === 0) return error(res, 404, 'ไม่พบผู้ใช้');
  ok(res, null, 'รีเซ็ตรหัสผ่านแล้ว');
});

// DELETE /api/users/:id  ลบผู้ใช้ (ลบ admin ไม่ได้)
router.delete('/:id', async (req, res) => {
  const result = await query('DELETE FROM users WHERE id = ? AND role <> "admin"', [req.params.id]);
  if (result.affectedRows === 0) return error(res, 404, 'ไม่พบผู้ใช้');
  ok(res, null, 'ลบผู้ใช้แล้ว');
});

module.exports = router;
```

## 3.2 `backend/routes/periods.js` — รอบการประเมิน (วันเปิด-ปิด)

ไฟล์ `backend/routes/periods.js`

```js
// /api/periods — รอบการประเมิน กำหนดวันเปิด-ปิด (admin)
const router = require('express').Router();
const { query } = require('../db');
const { ok, error } = require('../helpers');

function validate(b) {
  if (!b.name) return 'กรอกชื่อรอบการประเมิน';
  if (!b.start_date || !b.end_date) return 'กรอกวันเริ่มและวันสิ้นสุด';
  if (b.start_date > b.end_date) return 'วันสิ้นสุดต้องไม่ก่อนวันเริ่ม';
  return '';
}

// GET /api/periods  รายการรอบทั้งหมด
router.get('/', async (req, res) => {
  ok(res, await query('SELECT * FROM periods ORDER BY id DESC'));
});

// GET /api/periods/:id  รอบ 1 รอบ พร้อมหัวข้อและตัวชี้วัด
router.get('/:id', async (req, res) => {
  const periods = await query('SELECT * FROM periods WHERE id = ?', [req.params.id]);
  if (periods.length === 0) return error(res, 404, 'ไม่พบรอบการประเมิน');

  const topics = await query('SELECT * FROM topics WHERE period_id = ? ORDER BY id', [req.params.id]);
  for (const topic of topics) {
    topic.indicators = await query('SELECT * FROM indicators WHERE topic_id = ? ORDER BY id', [topic.id]);
  }
  ok(res, { ...periods[0], topics });
});

// POST /api/periods  สร้างรอบ  body: name, start_date, end_date
router.post('/', async (req, res) => {
  const message = validate(req.body);
  if (message) return error(res, 400, message);

  const { name, start_date, end_date } = req.body;
  const result = await query('INSERT INTO periods (name, start_date, end_date) VALUES (?, ?, ?)', [
    name, start_date, end_date,
  ]);
  ok(res, { id: result.insertId }, 'สร้างรอบแล้ว');
});

// PUT /api/periods/:id  แก้ไขรอบ  body: name, start_date, end_date
router.put('/:id', async (req, res) => {
  const message = validate(req.body);
  if (message) return error(res, 400, message);

  const { name, start_date, end_date } = req.body;
  const result = await query('UPDATE periods SET name = ?, start_date = ?, end_date = ? WHERE id = ?', [
    name, start_date, end_date, req.params.id,
  ]);
  if (result.affectedRows === 0) return error(res, 404, 'ไม่พบรอบการประเมิน');
  ok(res, null, 'แก้ไขรอบแล้ว');
});

// DELETE /api/periods/:id  ลบรอบ (หัวข้อ ตัวชี้วัด การมอบหมาย ในรอบจะถูกลบด้วย)
router.delete('/:id', async (req, res) => {
  const result = await query('DELETE FROM periods WHERE id = ?', [req.params.id]);
  if (result.affectedRows === 0) return error(res, 404, 'ไม่พบรอบการประเมิน');
  ok(res, null, 'ลบรอบแล้ว');
});

module.exports = router;
```

## 3.3 `backend/routes/topics.js` — หัวข้อ

ไฟล์ `backend/routes/topics.js`

```js
// /api/topics — หัวข้อการประเมินในแต่ละรอบ (admin)
const router = require('express').Router();
const { query } = require('../db');
const { ok, error } = require('../helpers');

// POST /api/topics  เพิ่มหัวข้อ  body: period_id, name
router.post('/', async (req, res) => {
  const { period_id, name } = req.body;
  if (!period_id || !name) return error(res, 400, 'เลือกรอบและกรอกชื่อหัวข้อ');

  const result = await query('INSERT INTO topics (period_id, name) VALUES (?, ?)', [period_id, name]);
  ok(res, { id: result.insertId }, 'เพิ่มหัวข้อแล้ว');
});

// PUT /api/topics/:id  แก้ชื่อหัวข้อ  body: name
router.put('/:id', async (req, res) => {
  if (!req.body.name) return error(res, 400, 'กรอกชื่อหัวข้อ');

  const result = await query('UPDATE topics SET name = ? WHERE id = ?', [req.body.name, req.params.id]);
  if (result.affectedRows === 0) return error(res, 404, 'ไม่พบหัวข้อ');
  ok(res, null, 'แก้ไขหัวข้อแล้ว');
});

// DELETE /api/topics/:id  ลบหัวข้อ (ตัวชี้วัดในหัวข้อจะถูกลบด้วย)
router.delete('/:id', async (req, res) => {
  const result = await query('DELETE FROM topics WHERE id = ?', [req.params.id]);
  if (result.affectedRows === 0) return error(res, 404, 'ไม่พบหัวข้อ');
  ok(res, null, 'ลบหัวข้อแล้ว');
});

module.exports = router;
```

## 3.4 `backend/routes/indicators.js` — ตัวชี้วัด

ไฟล์ `backend/routes/indicators.js`

```js
// /api/indicators — ตัวชี้วัดในแต่ละหัวข้อ (admin)
const router = require('express').Router();
const { query } = require('../db');
const { ok, error } = require('../helpers');

function validate(b) {
  if (!b.name) return 'กรอกชื่อตัวชี้วัด';
  if (!(Number(b.weight) > 0)) return 'น้ำหนักคะแนนต้องมากกว่า 0';
  if (!['yesno', 'scale'].includes(b.score_type)) return 'เลือกรูปแบบการประเมิน';
  return '';
}

// POST /api/indicators  เพิ่มตัวชี้วัด
// body: topic_id, name, detail, weight, score_type (yesno|scale), evidence
router.post('/', async (req, res) => {
  const b = req.body;
  if (!b.topic_id) return error(res, 400, 'เลือกหัวข้อ');
  const message = validate(b);
  if (message) return error(res, 400, message);

  const result = await query(
    'INSERT INTO indicators (topic_id, name, detail, weight, score_type, evidence) VALUES (?, ?, ?, ?, ?, ?)',
    [b.topic_id, b.name, b.detail || '', b.weight, b.score_type, b.evidence || ''],
  );
  ok(res, { id: result.insertId }, 'เพิ่มตัวชี้วัดแล้ว');
});

// PUT /api/indicators/:id  แก้ไขตัวชี้วัด  body เหมือน POST (ไม่ต้องส่ง topic_id)
router.put('/:id', async (req, res) => {
  const b = req.body;
  const message = validate(b);
  if (message) return error(res, 400, message);

  const result = await query(
    'UPDATE indicators SET name = ?, detail = ?, weight = ?, score_type = ?, evidence = ? WHERE id = ?',
    [b.name, b.detail || '', b.weight, b.score_type, b.evidence || '', req.params.id],
  );
  if (result.affectedRows === 0) return error(res, 404, 'ไม่พบตัวชี้วัด');
  ok(res, null, 'แก้ไขตัวชี้วัดแล้ว');
});

// DELETE /api/indicators/:id  ลบตัวชี้วัด
router.delete('/:id', async (req, res) => {
  const result = await query('DELETE FROM indicators WHERE id = ?', [req.params.id]);
  if (result.affectedRows === 0) return error(res, 404, 'ไม่พบตัวชี้วัด');
  ok(res, null, 'ลบตัวชี้วัดแล้ว');
});

module.exports = router;
```

## 3.5 `backend/routes/assignments.js` — มอบหมายกรรมการ

ไฟล์ `backend/routes/assignments.js`

```js
// /api/assignments — มอบหมายกรรมการให้ประเมินผู้รับ และกำหนดบทบาท (admin)
const router = require('express').Router();
const { query } = require('../db');
const { ok, error } = require('../helpers');

// GET /api/assignments?period_id=1  รายการมอบหมายในรอบ
router.get('/', async (req, res) => {
  const rows = await query(
    `SELECT a.*, e.full_name AS evaluatee_name, v.full_name AS evaluator_name
     FROM assignments a
     JOIN users e ON e.id = a.evaluatee_id
     JOIN users v ON v.id = a.evaluator_id
     WHERE a.period_id = ?
     ORDER BY e.full_name, a.committee_role`,
    [req.query.period_id],
  );
  ok(res, rows);
});

// POST /api/assignments  มอบหมาย  body: period_id, evaluatee_id, evaluator_id, committee_role (chair|member)
router.post('/', async (req, res) => {
  const { period_id, evaluatee_id, evaluator_id, committee_role } = req.body;
  if (!period_id || !evaluatee_id || !evaluator_id) return error(res, 400, 'เลือกรอบ ผู้รับ และกรรมการ');
  if (!['chair', 'member'].includes(committee_role)) return error(res, 400, 'เลือกบทบาทกรรมการ');

  // ผู้รับ 1 คนมีประธานได้คนเดียว
  if (committee_role === 'chair') {
    const chairs = await query(
      "SELECT id FROM assignments WHERE period_id = ? AND evaluatee_id = ? AND committee_role = 'chair'",
      [period_id, evaluatee_id],
    );
    if (chairs.length > 0) return error(res, 400, 'ผู้รับคนนี้มีประธานแล้ว');
  }

  const result = await query(
    'INSERT INTO assignments (period_id, evaluatee_id, evaluator_id, committee_role) VALUES (?, ?, ?, ?)',
    [period_id, evaluatee_id, evaluator_id, committee_role],
  );
  ok(res, { id: result.insertId }, 'มอบหมายกรรมการแล้ว');
});

// DELETE /api/assignments/:id  ยกเลิกการมอบหมาย
router.delete('/:id', async (req, res) => {
  const result = await query('DELETE FROM assignments WHERE id = ?', [req.params.id]);
  if (result.affectedRows === 0) return error(res, 404, 'ไม่พบการมอบหมาย');
  ok(res, null, 'ยกเลิกการมอบหมายแล้ว');
});

module.exports = router;
```

## ✔ ตรวจขั้น 3 (Thunder Client ใส่ token ของ admin)

เปิด backend ไว้ (`docker compose up -d db phpmyadmin backend`) แล้ว login admin ตามขั้น 2 เอา token ไปใส่แท็บ Auth → Bearer ทุก request (URL ขึ้นต้น `http://localhost:3000`)

| Method | URL | Body | ผล |
|---|---|---|---|
| GET | /api/users?role=evaluator | - | 200 รายชื่อกรรมการ 2 คน |
| POST | /api/users | `{"username":"t1","password":"12345678","full_name":"ทดสอบ","role":"evaluatee","email":"abc"}` | 400 รูปแบบอีเมลไม่ถูกต้อง |
| POST | /api/users | แก้ email เป็น `a@b.com` | 200 ได้ `id` (ฐานข้อมูลใหม่จะได้ 6 ถ้าไม่ใช่ 6 ให้ใช้เลขที่ได้ในแถวถัดไป) |
| PUT | /api/users/6 | `{"full_name":"ชื่อใหม่","role":"evaluatee"}` | 200 |
| PUT | /api/users/6/reset-password | `{"password":"newpass99"}` | 200 |
| DELETE | /api/users/6 | - | 200 |
| GET | /api/periods/1 | - | 200 รอบ + `topics` + `indicators` |
| POST | /api/indicators | `{"topic_id":1,"name":"ทดสอบ","weight":10,"score_type":"yesno"}` | 200 |
| POST | /api/assignments | `{"period_id":1,"evaluatee_id":2,"evaluator_id":4,"committee_role":"chair"}` | 400 ผู้รับคนนี้มีประธานแล้ว |
| GET | /api/users (ไม่ใส่ token) | - | 401 กรุณาเข้าสู่ระบบ |

ลองใช้ token ของ emp1 (login `emp1`/`emp12345`) เรียก `/api/users` ต้องได้ **403** ข้อความ "กรุณาเปลี่ยนรหัสผ่านก่อนใช้งาน" เพราะ emp1 ยังไม่เปลี่ยนรหัสครั้งแรก ส่วนการตรวจบทบาท (403 "ไม่มีสิทธิ์ใช้งานส่วนนี้") จะทดสอบในขั้น 4 หลังเปลี่ยนรหัสแล้ว

เปิด phpMyAdmin http://localhost:8080 → ฐานข้อมูล `evaluation` → ตาราง `indicators` ต้องเห็นตัวชี้วัด "ทดสอบ" ที่เพิ่ง POST (ยืนยันว่า Insert ลงฐานข้อมูลจริง ข้อ 7.2)
