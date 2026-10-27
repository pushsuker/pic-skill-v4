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
