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
