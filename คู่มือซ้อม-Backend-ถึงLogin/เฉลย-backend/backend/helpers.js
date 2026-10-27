// ฟังก์ชันช่วยที่ใช้ซ้ำหลายไฟล์
const { query } = require('./db');

// ตอบกลับเมื่อสำเร็จ: { status, message, data }
function ok(res, data = null, message = 'สำเร็จ') {
  res.json({ status: 'success', message, data });
}

// ตอบกลับเมื่อผิดพลาด เช่น error(res, 404, 'ไม่พบข้อมูล')
function error(res, code, message) {
  res.status(code).json({ status: 'error', message, data: null });
}

// วันนี้อยู่ในช่วงเปิดประเมินของรอบหรือไม่
function isOpen(period) {
  const today = new Date().toLocaleDateString('sv-SE'); // รูปแบบ 2026-10-26
  return today >= period.start_date && today <= period.end_date;
}

// คะแนนถูกชนิดหรือไม่: มี/ไม่มี = 0,1  สเกล = 1-4
function validScore(indicator, score) {
  if (indicator.score_type === 'yesno') return score === 0 || score === 1;
  return [1, 2, 3, 4].includes(score);
}

// คิดคะแนนร้อยละแบบถ่วงน้ำหนัก ถ้ายังให้คะแนนไม่ครบทุกตัวชี้วัด คืนค่า null
function percent(indicators, scores) {
  if (indicators.length === 0) return null;
  let total = 0;
  let totalWeight = 0;
  for (const item of indicators) {
    const row = scores.find((s) => s.indicator_id === item.id);
    if (!row) return null;
    const max = item.score_type === 'yesno' ? 1 : 4;
    total += (row.score / max) * Number(item.weight);
    totalWeight += Number(item.weight);
  }
  return Math.round((total / totalWeight) * 10000) / 100;
}

// ตัวชี้วัดทั้งหมดของรอบ (พร้อมชื่อหัวข้อ)
function getIndicators(periodId) {
  return query(
    `SELECT i.*, t.name AS topic_name FROM indicators i
     JOIN topics t ON t.id = i.topic_id
     WHERE t.period_id = ? ORDER BY t.id, i.id`,
    [periodId],
  );
}

// หารอบของตัวชี้วัด (ใช้ตรวจว่ารอบเปิดอยู่หรือไม่)
async function getPeriodOfIndicator(indicatorId) {
  const rows = await query(
    `SELECT p.* FROM periods p
     JOIN topics t ON t.period_id = p.id
     JOIN indicators i ON i.topic_id = t.id
     WHERE i.id = ?`,
    [indicatorId],
  );
  return rows[0];
}

module.exports = { ok, error, isOpen, validScore, percent, getIndicators, getPeriodOfIndicator };
