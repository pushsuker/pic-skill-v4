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
