# 07 ขั้น 2 Back-end แกนหลัก และ Login (คนที่ 1)

เป้าหมาย: ได้ API `POST /api/auth/login` ที่ตอบ JWT Token และระบบตรวจสิทธิ์

## 2.1 `backend/helpers.js` — ฟังก์ชันใช้ซ้ำ

- `ok()` / `error()` ตอบกลับรูปแบบเดียวกันทุก API (ข้อ 6.8)
- `isOpen()` ตรวจว่าวันนี้อยู่ในช่วงประเมิน
- `validScore()` + `percent()` คิดคะแนนถ่วงน้ำหนัก (ใช้ทดสอบข้อ 7.5)

ไฟล์ `backend/helpers.js`

```js
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
```

ตัวอย่างการคิด `percent()` — ตัวชี้วัด A น้ำหนัก 60 แบบสเกล ได้ 3 · ตัวชี้วัด B น้ำหนัก 40 แบบมี/ไม่มี ได้ 1

```
A = 3/4 × 60 = 45
B = 1/1 × 40 = 40
รวม = (45 + 40) / (60 + 40) × 100 = 85%
```

## 2.2 `backend/auth.js` — JWT และตรวจสิทธิ์

ไฟล์ `backend/auth.js`

```js
// ตรวจ JWT Token และสิทธิ์ตามบทบาท
const jwt = require('jsonwebtoken');
const { error } = require('./helpers');

const SECRET = process.env.JWT_SECRET || 'change-this-secret-key';

// สร้าง token (ลงนามด้วย SECRET) อายุ 8 ชั่วโมง
function createToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, must_change_password: !!user.must_change_password },
    SECRET,
    { expiresIn: '8h' },
  );
}

// middleware: ต้อง login ก่อน
// รับ token จาก header "Authorization: Bearer xxx" หรือ ?token=xxx (ใช้ตอนดาวน์โหลดไฟล์)
function login(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '') || req.query.token;
  try {
    req.user = jwt.verify(token, SECRET);
  } catch {
    return error(res, 401, 'กรุณาเข้าสู่ระบบ');
  }
  // ผู้ใช้ใหม่ต้องเปลี่ยนรหัสผ่านก่อน จึงจะใช้ API อื่นได้
  const allowed = ['/api/auth/me', '/api/auth/password'];
  if (req.user.must_change_password && !allowed.includes(req.originalUrl)) {
    return error(res, 403, 'กรุณาเปลี่ยนรหัสผ่านก่อนใช้งาน');
  }
  next();
}

// middleware: อนุญาตเฉพาะบทบาทที่กำหนด เช่น allow('admin')
function allow(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) return error(res, 403, 'ไม่มีสิทธิ์ใช้งานส่วนนี้');
    next();
  };
}

module.exports = { createToken, login, allow };
```

- `createToken()` ลงนามด้วย `SECRET` (ข้อ 6.6)
- `login` คือ middleware ตรวจ token (ไม่มี/ผิด → 401) และถ้ายังต้องเปลี่ยนรหัสผ่าน → 403 (ข้อ 5.2.1)
- `allow('admin')` ตรวจบทบาท (ข้อ 6.12)

## 2.3 `backend/upload.js` — รับไฟล์

ไฟล์ `backend/upload.js`

```js
// รับไฟล์อัปโหลดด้วย multer เก็บไว้ในโฟลเดอร์ uploads
const multer = require('multer');
const path = require('node:path');
const fs = require('node:fs');

const folder = path.join(__dirname, 'uploads');
fs.mkdirSync(folder, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: folder,
    // ตั้งชื่อใหม่ไม่ให้ซ้ำ เช่น 1730000000000.pdf
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname).toLowerCase()),
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // ไม่เกิน 5 MB
  fileFilter: (req, file, cb) => {
    const okTypes = ['application/pdf', 'image/png', 'image/jpeg'];
    if (okTypes.includes(file.mimetype)) cb(null, true);
    else cb(new Error('รับเฉพาะไฟล์ PDF, PNG, JPG'));
  },
});

module.exports = { upload, folder };
```

## 2.4 `backend/server.js` — รวมทุกอย่าง

ไฟล์ `backend/server.js`

```js
// จุดเริ่มของ Back-end: รวม router ทุกไฟล์
const express = require('express');
const cors = require('cors');
const { login, allow } = require('./auth');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use((req, res, next) => {
  req.body = req.body || {}; // กันกรณีไม่ได้ส่ง body มา
  next();
});

// ---- API ----
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', login, allow('admin'), require('./routes/users'));
app.use('/api/periods', login, allow('admin'), require('./routes/periods'));
app.use('/api/topics', login, allow('admin'), require('./routes/topics'));
app.use('/api/indicators', login, allow('admin'), require('./routes/indicators'));
app.use('/api/assignments', login, allow('admin'), require('./routes/assignments'));
app.use('/api/self', login, allow('evaluatee'), require('./routes/self'));
app.use('/api/evaluate', login, allow('evaluator'), require('./routes/evaluate'));
app.use('/api/reports', login, require('./routes/reports'));
app.use('/api/files', login, require('./routes/files'));
app.use('/api/backup', login, allow('admin'), require('./routes/backup'));

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
```

- `app.use('/api/users', login, allow('admin'), ...)` = ทุก API ใน users ต้อง login และเป็น admin
- error middleware ตัวสุดท้าย (4 พารามิเตอร์ `err, req, res, next`) คือ **Exception Handling** (ข้อ 6.7)

> ตอนนี้ไฟล์ routes อื่นยังไม่มี ให้สร้างไฟล์เปล่าที่มีแค่ 2 บรรทัดนี้ไว้ก่อน เพื่อให้เซิร์ฟเวอร์เปิดได้
> ```js
> const router = require('express').Router();
> module.exports = router;
> ```
> ไฟล์ที่ต้องสร้างใน `routes/`: users.js periods.js topics.js indicators.js assignments.js self.js evaluate.js reports.js files.js backup.js

## 2.5 `backend/routes/auth.js` — Login, ข้อมูลส่วนตัว, เปลี่ยนรหัส

ไฟล์ `backend/routes/auth.js`

```js
// /api/auth — เข้าสู่ระบบ ข้อมูลส่วนตัว เปลี่ยนรหัสผ่าน
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { query } = require('../db');
const { ok, error } = require('../helpers');
const { createToken, login } = require('../auth');

// POST /api/auth/login  body: username, password
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return error(res, 400, 'กรอกชื่อผู้ใช้และรหัสผ่าน');

  const rows = await query('SELECT * FROM users WHERE username = ?', [username]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return error(res, 401, 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
  }
  delete user.password;
  ok(res, { token: createToken(user), user }, 'เข้าสู่ระบบสำเร็จ');
});

// GET /api/auth/me  ข้อมูลของคนที่ login อยู่
router.get('/me', login, async (req, res) => {
  const rows = await query(
    'SELECT id, username, full_name, email, department, role, must_change_password FROM users WHERE id = ?',
    [req.user.id],
  );
  if (rows.length === 0) return error(res, 404, 'ไม่พบผู้ใช้');
  ok(res, rows[0]);
});

// PUT /api/auth/me  แก้ข้อมูลส่วนตัว  body: full_name, email, department
router.put('/me', login, async (req, res) => {
  const { full_name, email, department } = req.body;
  if (!full_name) return error(res, 400, 'กรอกชื่อ-นามสกุล');
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return error(res, 400, 'รูปแบบอีเมลไม่ถูกต้อง');

  await query('UPDATE users SET full_name = ?, email = ?, department = ? WHERE id = ?', [
    full_name, email || '', department || '', req.user.id,
  ]);
  ok(res, null, 'บันทึกข้อมูลส่วนตัวแล้ว');
});

// PUT /api/auth/password  เปลี่ยนรหัสผ่าน  body: old_password, new_password
router.put('/password', login, async (req, res) => {
  const { old_password, new_password } = req.body;
  if (!new_password || new_password.length < 8) {
    return error(res, 400, 'รหัสผ่านใหม่ต้องยาวอย่างน้อย 8 ตัวอักษร');
  }
  const rows = await query('SELECT * FROM users WHERE id = ?', [req.user.id]);
  const user = rows[0];
  if (!(await bcrypt.compare(old_password || '', user.password))) {
    return error(res, 400, 'รหัสผ่านเดิมไม่ถูกต้อง');
  }

  const hash = await bcrypt.hash(new_password, 10);
  await query('UPDATE users SET password = ?, must_change_password = 0 WHERE id = ?', [hash, user.id]);
  user.must_change_password = 0;
  ok(res, { token: createToken(user) }, 'เปลี่ยนรหัสผ่านแล้ว');
});

module.exports = router;
```

## ✔ ตรวจขั้น 2

```bash
docker compose up db phpmyadmin backend
```

ต้องเห็น `seed เสร็จแล้ว` และ `API พร้อมที่ http://localhost:3000` แล้วทดสอบด้วย **Thunder Client** (ไอคอนสายฟ้าใน VS Code → New Request)

| ทดสอบ | Method + URL | Body (JSON) | ผลที่ต้องได้ |
|---|---|---|---|
| รหัสผิด | POST http://localhost:3000/api/auth/login | `{"username":"admin","password":"x"}` | 401 |
| รหัสถูก | POST http://localhost:3000/api/auth/login | `{"username":"admin","password":"admin1234"}` | 200 + `token` |
| ไม่มี token | GET http://localhost:3000/api/auth/me | - | 401 |
| มี token | GET http://localhost:3000/api/auth/me + แท็บ Auth → Bearer → วาง token | - | 200 |

เก็บ request ไว้ใน Collection ของ Thunder Client ใช้โชว์ข้อ 7.1 และ 7.6 ตอนนำเสนอ

ตรวจฐานข้อมูลด้วย: เปิด http://localhost:8080 → ฐานข้อมูล `evaluation` ต้องมี **8 ตาราง** และตาราง `users` มี 5 แถว (ช่อง `password` เป็นข้อความยาวขึ้นต้นด้วย `$2` ไม่ใช่รหัสจริง = เข้ารหัสด้วย bcrypt แล้ว)

> ถ้า login ถูกแต่ได้ 401 แสดงว่าฐานข้อมูลมีผู้ใช้เก่าค้างจากการรันครั้งก่อน (seed ใช้ `INSERT IGNORE` จึงไม่เขียนทับ) ให้รีเซ็ตด้วย `docker compose down -v` แล้ว `docker compose up` ใหม่
