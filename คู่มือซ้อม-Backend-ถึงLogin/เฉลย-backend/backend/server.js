// จุดเริ่มของ Back-end (รุ่นซ้อม Login: มีแค่ /api/auth)
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use((req, res, next) => {
  req.body = req.body || {}; // กันกรณีไม่ได้ส่ง body มา
  next();
});

// ---- API ----
app.use('/api/auth', require('./routes/auth'));
// คู่มือหลักจะเพิ่ม /api/users, /api/periods, ... ตรงนี้

// ไม่พบ API → 404
app.use((req, res) => {
  res.status(404).json({ status: 'error', message: 'ไม่พบ API นี้', data: null });
});

// จัดการ error ทุกชนิดที่จุดเดียว (Exception Handling)
app.use((err, req, res, next) => {
  console.error(err.message);
  let code = 500;
  let message = 'ระบบขัดข้อง: ' + err.message;
  if (err.code === 'ER_DUP_ENTRY') { code = 400; message = 'ข้อมูลซ้ำกับที่มีอยู่แล้ว'; }
  if (err.code === 'LIMIT_FILE_SIZE') { code = 400; message = 'ไฟล์ใหญ่เกิน 5 MB'; }
  if (err.message.startsWith('รับเฉพาะไฟล์')) { code = 400; message = err.message; }
  res.status(code).json({ status: 'error', message, data: null });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('API พร้อมที่ http://localhost:' + PORT));
