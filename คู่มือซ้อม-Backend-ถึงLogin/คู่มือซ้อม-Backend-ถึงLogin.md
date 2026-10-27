# คู่มือซ้อม Back-end ถึงขั้น Login (คนที่ 1)

เล่มนี้แยกจากคู่มือหลัก ใช้ซ้อมหลังบ้านให้ **login ได้จริง** ในรอบเดียว: Docker + MySQL 8 ตาราง + ผู้ใช้ตัวอย่าง + API ชุด `/api/auth` (login, ดู/แก้ข้อมูลตัวเอง, เปลี่ยนรหัสผ่าน) พร้อม JWT ทุกขั้นจบด้วย **✔ ตรวจ** ที่รันได้จริง ไม่มี error ค้างระหว่างทาง

> ใช้คู่กับ "คู่มือซ้อม Front-end ถึงขั้น Login" ได้เลย: คนที่ 1 ทำเล่มนี้ คนที่ 2 ทำเล่มหน้าบ้าน แล้วหน้าบ้านจะ login ผ่านหลังบ้านที่ทีมเขียนเอง
> โค้ดที่ทำเสร็จตามเล่มนี้อยู่ในโฟลเดอร์ `เฉลย-backend` (ข้างไฟล์คู่มือนี้) ใช้เทียบเมื่อติดปัญหา

| ขั้น | ทำอะไร | ใช้เวลา |
|---|---|---|
| B0 | ตรวจเครื่องมือ | 5 นาที |
| B1 | สร้างโฟลเดอร์ ติดตั้งแพ็กเกจ | 10 นาที |
| B2 | `docker-compose.yml` + `.gitignore` | 10 นาที |
| B3 | ฐานข้อมูล: `schema.sql` `db.js` `seed.js` | 20 นาที |
| B4 | `helpers.js` + `auth.js` (JWT) | 15 นาที |
| B5 | `server.js` (รุ่นซ้อม Login) + `routes/auth.js` | 20 นาที |
| B6 | ทดสอบ API ครบชุด | 15 นาที |

บัญชีตัวอย่าง (seed สร้างให้)

| ชื่อผู้ใช้ | รหัสผ่าน | บทบาท |
|---|---|---|
| admin | admin1234 | ฝ่ายบุคลากร |
| emp1, emp2 | emp12345 | ผู้รับการประเมิน (ต้องเปลี่ยนรหัสครั้งแรก) |
| eva1, eva2 | eva12345 | กรรมการ (ต้องเปลี่ยนรหัสครั้งแรก) |

## B0 ตรวจเครื่องมือ

เปิด Docker Desktop ให้ไอคอนเป็นสีเขียวก่อน แล้วพิมพ์ใน PowerShell

```bash
node -v
npm -v
docker -v
docker compose version
```

### ✔ ตรวจ B0

- [ ] ทุกคำสั่งขึ้นเลขเวอร์ชัน (Node ต้อง 20 ขึ้นไป)
- [ ] `docker compose version` ไม่ขึ้น `error during connect` (ถ้าขึ้น = Docker Desktop ยังไม่เปิด)
- [ ] ถ้าเคยรันเฉลยหรือโปรเจกต์อื่นค้างไว้ ให้ไปที่โฟลเดอร์นั้นแล้ว `docker compose down` ก่อน ไม่อย่างนั้นพอร์ต 3000 / 3307 / 8080 จะชนกัน

## B1 สร้างโฟลเดอร์และติดตั้งแพ็กเกจ

ที่โฟลเดอร์ซ้อม (เช่น `D:\ซ้อม`)

```bash
mkdir evaluation
cd evaluation
mkdir backend
cd backend
mkdir routes
npm init -y
npm install express@5 mysql2 jsonwebtoken bcryptjs multer cors
npm install -D nodemon
cd ..
code .
```

| แพ็กเกจ | ใช้ทำอะไร |
|---|---|
| `express@5` | สร้าง API (เวอร์ชัน 5 จับ error ของ async ให้เอง ไม่ต้องเขียน try/catch ทุกที่) |
| `mysql2` | เชื่อมต่อ MySQL |
| `jsonwebtoken` | สร้าง/ตรวจ JWT Token |
| `bcryptjs` | เข้ารหัสรหัสผ่าน |
| `multer` | รับไฟล์อัปโหลด (ยังไม่ใช้ในเล่มนี้ แต่ติดตั้งไว้เลยเพื่อทำต่อในคู่มือหลัก) |
| `cors` | ให้เว็บจากพอร์ตอื่นเรียก API ได้ |
| `nodemon` (dev) | แก้ไฟล์แล้วรีสตาร์ตเซิร์ฟเวอร์อัตโนมัติ |

แก้ `backend/package.json` ให้เป็นแบบนี้ (สำคัญที่ส่วน `"scripts"` เลขเวอร์ชันแพ็กเกจของเครื่องอาจใหม่กว่าได้)

ไฟล์ `backend/package.json`

```json
{
  "name": "evaluation-api",
  "private": true,
  "version": "2569.0.0",
  "engines": { "node": ">=24" },
  "scripts": {
    "seed": "node seed.js",
    "start": "node server.js",
    "dev": "nodemon -L server.js",
    "test": "node --test tests/score.test.js",
    "test:api": "node --test tests/api.test.js"
  },
  "dependencies": {
    "bcryptjs": "^3.0.2",
    "cors": "^2.8.5",
    "express": "^5.1.0",
    "jsonwebtoken": "^9.0.2",
    "multer": "^2.0.2",
    "mysql2": "^3.14.0"
  },
  "devDependencies": {
    "nodemon": "^3.1.10"
  }
}
```

### ✔ ตรวจ B1

- [ ] มีโฟลเดอร์ `evaluation/backend/node_modules` และ `evaluation/backend/routes`
- [ ] `backend/package.json` มี scripts `seed` และ `dev`

## B2 `docker-compose.yml` และ `.gitignore`

วางไว้ที่โฟลเดอร์บนสุด `evaluation/` ไฟล์นี้เหมือนเฉลยทุกบรรทัด มีบริการ `frontend` ด้วย แต่เล่มนี้จะสั่งเปิดแค่ `db` `phpmyadmin` `backend`

ไฟล์ `docker-compose.yml`

```yaml
# รันทั้งระบบด้วยคำสั่งเดียว: docker compose up
# db = MySQL, phpmyadmin = ดูตาราง, backend = Express API, frontend = Vue
services:
  db:
    image: mysql:8.4
    environment:
      MYSQL_ROOT_PASSWORD: root1234
      MYSQL_DATABASE: evaluation
    command: --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci
    ports:
      - "3307:3306"
    volumes:
      - db_data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "127.0.0.1", "-proot1234"]
      interval: 5s
      retries: 30

  phpmyadmin:
    image: phpmyadmin:5
    environment:
      PMA_HOST: db
      PMA_USER: root
      PMA_PASSWORD: root1234
    ports:
      - "8080:80"
    depends_on:
      - db

  backend:
    image: node:24-alpine
    working_dir: /app
    command: sh -c "npm install && npm run seed && npm run dev"
    environment:
      DB_HOST: db
      DB_USER: root
      DB_PASSWORD: root1234
      DB_NAME: evaluation
      PORT: 3000
      JWT_SECRET: evaluation-2569-secret-key-change-me
    ports:
      - "3000:3000"
    volumes:
      - ./backend:/app
      - /app/node_modules
    depends_on:
      db:
        condition: service_healthy

  frontend:
    image: node:24-alpine
    working_dir: /app
    command: sh -c "npm install && npm run dev"
    environment:
      API_URL: http://backend:3000
    ports:
      - "5173:5173"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    depends_on:
      - backend

volumes:
  db_data:
```

- `ports: "3307:3306"` = พอร์ตเครื่องเรา 3307 ต่อเข้า MySQL ใน container (กันชนกับ MySQL ที่อาจติดตั้งในเครื่องอยู่แล้ว)
- `healthcheck` + `condition: service_healthy` = รอ MySQL พร้อมก่อน backend จึงเริ่ม
- `./backend:/app` = แก้ไฟล์ในเครื่อง container เห็นทันที
- backend รัน `npm install && npm run seed && npm run dev` = ติดตั้ง → สร้างตาราง + ผู้ใช้ตัวอย่าง → เปิดเซิร์ฟเวอร์

ไฟล์ `.gitignore`

```
node_modules/
dist/
backend/uploads/
```

### ✔ ตรวจ B2

```bash
docker compose up -d db phpmyadmin
```

- [ ] ขึ้น `Container evaluation-db-1 Started` และ `evaluation-phpmyadmin-1 Started`
- [ ] เปิด http://localhost:8080 เห็น phpMyAdmin และมีฐานข้อมูล `evaluation` (ยังไม่มีตาราง ตารางจะมาใน B3)

## B3 ฐานข้อมูล

### B3.1 `backend/schema.sql` — 8 ตาราง

สร้างครบ 8 ตารางเลย เพราะ `seed.js` จะใส่ข้อมูลตัวอย่างลงหลายตาราง (รอบ หัวข้อ ตัวชี้วัด การมอบหมาย) ไว้ใช้ต่อในคู่มือหลัก

ไฟล์ `backend/schema.sql`

```sql
-- ฐานข้อมูลระบบประเมินบุคลากร 8 ตาราง
-- อ่านจากบนลงล่าง: ตารางลูกอ้างถึงตารางแม่ด้วย FOREIGN KEY

-- 1) ผู้ใช้ทุกคน แยกด้วย role
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL DEFAULT '',
  department VARCHAR(100) NOT NULL DEFAULT '',
  role ENUM('admin','evaluatee','evaluator') NOT NULL,
  must_change_password BOOLEAN NOT NULL DEFAULT TRUE
);

-- 2) รอบการประเมิน มีวันเปิด-ปิด
CREATE TABLE IF NOT EXISTS periods (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL
);

-- 3) หัวข้อการประเมิน อยู่ในรอบ
CREATE TABLE IF NOT EXISTS topics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  period_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  FOREIGN KEY (period_id) REFERENCES periods(id) ON DELETE CASCADE
);

-- 4) ตัวชี้วัด อยู่ในหัวข้อ
--    score_type: yesno = มี/ไม่มี (0-1), scale = ระดับ 1-4
CREATE TABLE IF NOT EXISTS indicators (
  id INT AUTO_INCREMENT PRIMARY KEY,
  topic_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  detail TEXT,
  weight DECIMAL(6,2) NOT NULL DEFAULT 1,
  score_type ENUM('yesno','scale') NOT NULL DEFAULT 'scale',
  evidence VARCHAR(255) NOT NULL DEFAULT '',
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
);

-- 5) การมอบหมายกรรมการ 1 แถว = กรรมการ 1 คน ประเมินผู้รับ 1 คน ในรอบ 1 รอบ
--    status: pending = ยังไม่ประเมิน, draft = บันทึกร่าง, confirmed = ยืนยันผลแล้ว
CREATE TABLE IF NOT EXISTS assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  period_id INT NOT NULL,
  evaluatee_id INT NOT NULL,
  evaluator_id INT NOT NULL,
  committee_role ENUM('chair','member') NOT NULL DEFAULT 'member',
  status ENUM('pending','draft','confirmed') NOT NULL DEFAULT 'pending',
  comment TEXT,
  signature VARCHAR(255),
  UNIQUE (period_id, evaluatee_id, evaluator_id),
  FOREIGN KEY (period_id) REFERENCES periods(id) ON DELETE CASCADE,
  FOREIGN KEY (evaluatee_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (evaluator_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 6) คะแนนที่ผู้รับประเมินตนเอง (ตัวชี้วัดละ 1 คะแนน)
CREATE TABLE IF NOT EXISTS self_scores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  evaluatee_id INT NOT NULL,
  indicator_id INT NOT NULL,
  score INT NOT NULL,
  UNIQUE (evaluatee_id, indicator_id),
  FOREIGN KEY (evaluatee_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (indicator_id) REFERENCES indicators(id) ON DELETE CASCADE
);

-- 7) รายละเอียดและหลักฐานของผู้รับ (ตัวชี้วัดละกี่รายการก็ได้)
CREATE TABLE IF NOT EXISTS self_details (
  id INT AUTO_INCREMENT PRIMARY KEY,
  evaluatee_id INT NOT NULL,
  indicator_id INT NOT NULL,
  detail TEXT NOT NULL,
  url VARCHAR(500) NOT NULL DEFAULT '',
  file_name VARCHAR(255) NOT NULL DEFAULT '',
  FOREIGN KEY (evaluatee_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (indicator_id) REFERENCES indicators(id) ON DELETE CASCADE
);

-- 8) คะแนนที่กรรมการให้ (ตัวชี้วัดละ 1 คะแนน ต่อการมอบหมาย 1 แถว)
CREATE TABLE IF NOT EXISTS scores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  assignment_id INT NOT NULL,
  indicator_id INT NOT NULL,
  score INT NOT NULL,
  UNIQUE (assignment_id, indicator_id),
  FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
  FOREIGN KEY (indicator_id) REFERENCES indicators(id) ON DELETE CASCADE
);
```

- `ON DELETE CASCADE` = ลบแม่แล้วลูกหายตาม
- `UNIQUE` กันข้อมูลซ้ำ เช่น `username` ห้ามซ้ำ

### B3.2 `backend/db.js` — เชื่อมต่อฐานข้อมูล

ไฟล์ `backend/db.js`

```js
// เชื่อมต่อ MySQL (ค่ามาจาก environment ใน docker-compose.yml)
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'evaluation',
  dateStrings: true, // ให้วันที่ออกมาเป็นข้อความ 2026-10-26
});

// ใช้ query(sql, [ค่า]) ได้ทุกไฟล์ คืนค่าเป็นแถวข้อมูล
async function query(sql, values = []) {
  const [rows] = await pool.query(sql, values);
  return rows;
}

module.exports = { pool, query };
```

- `query(sql, [ค่า])` ใช้ `?` แทนค่า mysql2 จะ escape ให้ **กัน SQL Injection** ห้ามต่อสตริงค่าจากผู้ใช้เข้า SQL ตรง ๆ

### B3.3 `backend/seed.js` — สร้างตาราง + ผู้ใช้ตัวอย่าง

ไฟล์ `backend/seed.js`

```js
// สร้างตารางจาก schema.sql และใส่ข้อมูลตัวอย่าง (รันซ้ำได้ ไม่ลบข้อมูลเดิม)
const fs = require('node:fs');
const bcrypt = require('bcryptjs');
const { query } = require('./db');

async function seed() {
  // 1) สร้างตาราง: แยกคำสั่งด้วย ; แล้วรันทีละคำสั่ง
  const sql = fs.readFileSync(__dirname + '/schema.sql', 'utf8');
  for (const command of sql.split(';')) {
    if (command.trim()) await query(command);
  }

  // 2) ผู้ใช้ตัวอย่าง (admin ไม่ต้องเปลี่ยนรหัสครั้งแรก)
  const users = [
    ['admin', 'admin1234', 'ฝ่ายบุคลากร', 'admin', 0],
    ['emp1', 'emp12345', 'สมชาย ใจดี', 'evaluatee', 1],
    ['emp2', 'emp12345', 'สมหญิง ตั้งใจ', 'evaluatee', 1],
    ['eva1', 'eva12345', 'ประธาน กรรมการ', 'evaluator', 1],
    ['eva2', 'eva12345', 'กรรมการ ร่วม', 'evaluator', 1],
  ];
  for (const [username, password, name, role, mustChange] of users) {
    const hash = await bcrypt.hash(password, 10);
    await query(
      'INSERT IGNORE INTO users (username, password, full_name, role, must_change_password) VALUES (?, ?, ?, ?, ?)',
      [username, hash, name, role, mustChange],
    );
  }

  // 3) รอบตัวอย่าง พร้อมหัวข้อ ตัวชี้วัด และการมอบหมาย (ใส่เฉพาะตอนยังไม่มีรอบ)
  const periods = await query('SELECT id FROM periods');
  if (periods.length === 0) {
    const year = new Date().getFullYear();
    const p = await query('INSERT INTO periods (name, start_date, end_date) VALUES (?, ?, ?)', [
      'ประเมินประจำปี ' + (year + 543), year + '-01-01', year + '-12-31',
    ]);
    const t = await query('INSERT INTO topics (period_id, name) VALUES (?, ?)', [p.insertId, 'ด้านการจัดการเรียนการสอน']);
    await query(
      'INSERT INTO indicators (topic_id, name, detail, weight, score_type, evidence) VALUES (?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?)',
      [
        t.insertId, 'จัดทำแผนการสอน', 'มีแผนการสอนครบทุกรายวิชา', 60, 'scale', 'ไฟล์แผนการสอน PDF',
        t.insertId, 'เข้าอบรมพัฒนาตนเอง', 'เข้าอบรมอย่างน้อย 1 ครั้ง', 40, 'yesno', 'เกียรติบัตร',
      ],
    );
    const ids = {};
    for (const u of await query('SELECT id, username FROM users')) ids[u.username] = u.id;
    for (const emp of ['emp1', 'emp2']) {
      await query(
        'INSERT INTO assignments (period_id, evaluatee_id, evaluator_id, committee_role) VALUES (?, ?, ?, ?), (?, ?, ?, ?)',
        [p.insertId, ids[emp], ids.eva1, 'chair', p.insertId, ids[emp], ids.eva2, 'member'],
      );
    }
  }
  console.log('seed เสร็จแล้ว');
  process.exit(0);
}

seed().catch((err) => {
  console.error('seed ไม่สำเร็จ:', err.message);
  process.exit(1);
});
```

- รหัสผ่านเก็บเป็น hash ด้วย `bcrypt.hash` ไม่เก็บรหัสจริง
- `INSERT IGNORE` = รันซ้ำได้ ผู้ใช้ที่มีแล้วจะไม่ถูกเขียนทับ

### ✔ ตรวจ B3

ยังไม่มี `server.js` จึงสั่งรันแค่ seed ครั้งเดียวผ่าน container ของ backend

```bash
docker compose run --rm backend sh -c "npm install && npm run seed"
```

- [ ] บรรทัดท้ายขึ้น `seed เสร็จแล้ว` (ถ้าขึ้น `seed ไม่สำเร็จ: ...` ให้อ่านข้อความ ส่วนใหญ่คือพิมพ์ SQL ผิด)
- [ ] phpMyAdmin → `evaluation` มี **8 ตาราง** ตาราง `users` มี 5 แถว ช่อง `password` เป็นข้อความยาวขึ้นต้นด้วย `$2` (hash)
- [ ] ตาราง `periods` มี 1 รอบ `indicators` มี 2 ตัวชี้วัด `assignments` มี 4 แถว

## B4 `helpers.js` และ `auth.js`

### B4.1 `backend/helpers.js` — ฟังก์ชันใช้ซ้ำ

เขียนตัวเต็มเหมือนเฉลยไปเลย เล่มนี้ใช้แค่ `ok()` กับ `error()` ส่วนฟังก์ชันคิดคะแนนใช้ต่อในคู่มือหลัก

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

- `ok()` / `error()` ทำให้ทุก API ตอบรูปแบบเดียวกัน `{ status, message, data }`

### B4.2 `backend/auth.js` — JWT และตรวจสิทธิ์

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

| ฟังก์ชัน | ทำอะไร |
|---|---|
| `createToken(user)` | สร้าง JWT เก็บ `id`, `role`, `must_change_password` ลงนามด้วย `JWT_SECRET` อายุ 8 ชั่วโมง |
| `login` | middleware ตรวจ token จาก header `Authorization: Bearer ...` ผ่านแล้วใส่ `req.user` ไม่ผ่านตอบ 401 ถ้ายังไม่เปลี่ยนรหัสครั้งแรก ใช้ได้แค่ `/me` กับ `/password` |
| `allow(...roles)` | middleware ปล่อยผ่านเฉพาะบทบาทที่กำหนด (ใช้ในคู่มือหลัก) |

## B5 `server.js` (รุ่นซ้อม Login) และ `routes/auth.js`

### B5.1 `backend/server.js` (รุ่นซ้อม Login)

รุ่นนี้ผูกแค่ `/api/auth` ไฟล์เดียว **จึงไม่ต้องสร้างไฟล์ routes เปล่า** ส่วนจัดการ 404 และ error เหมือนเฉลยทุกบรรทัด

ไฟล์ `backend/server.js` (รุ่นซ้อม Login)

```js
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
```

- `app.use('/api/auth', require('./routes/auth'))` = ทุก API ในไฟล์ `routes/auth.js` ขึ้นต้นด้วย `/api/auth`
- error middleware ตัวสุดท้าย (4 พารามิเตอร์ `err, req, res, next`) คือ **Exception Handling** (ข้อ 6.7)

### B5.2 `backend/routes/auth.js` — Login, ข้อมูลส่วนตัว, เปลี่ยนรหัส

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

| API | ทำอะไร |
|---|---|
| `POST /api/auth/login` | ตรวจรหัสด้วย `bcrypt.compare` ถูกตอบ `token` + `user` (ลบ `password` ออกก่อนส่ง) ผิดตอบ 401 |
| `GET /api/auth/me` | ข้อมูลของคนที่ login อยู่ (ต้องมี token) |
| `PUT /api/auth/me` | แก้ชื่อ อีเมล แผนก (ตรวจรูปแบบอีเมล) |
| `PUT /api/auth/password` | เปลี่ยนรหัส (ใหม่ ≥ 8 ตัว รหัสเดิมต้องถูก) ตอบ token ใหม่ที่ `must_change_password` เป็น false |

### ✔ ตรวจ B5

```bash
docker compose up -d db phpmyadmin backend
docker compose logs -f backend
```

- [ ] log ขึ้น `seed เสร็จแล้ว` และ `API พร้อมที่ http://localhost:3000` ไม่มีตัวแดง แล้วกด `Ctrl + C` ออกจาก log (backend ยังทำงานต่อ)
- [ ] เปิด http://localhost:3000/api/auth/me ในเบราว์เซอร์ → `{"status":"error","message":"กรุณาเข้าสู่ระบบ","data":null}`
- [ ] เปิด http://localhost:3000/api/users → `{"status":"error","message":"ไม่พบ API นี้","data":null}` (ถูกต้อง เล่มนี้ยังไม่มี API users)

แก้ไฟล์ใน `backend` แล้ว nodemon จะรีสตาร์ตเอง ดู log ได้ด้วย `docker compose logs -f backend`

## B6 ทดสอบ API ครบชุด

ใช้ Thunder Client / Postman หรือไฟล์ `.http` (Extension REST Client) ก็ได้ URL ขึ้นต้น `http://localhost:3000` และ login ต้องเป็น **POST**

| # | Method + URL | Token | Body (JSON) | ผลที่ต้องได้ |
|---|---|---|---|---|
| 1 | POST /api/auth/login | - | `{"username":"admin","password":"x"}` | 401 ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง |
| 2 | POST /api/auth/login | - | `{"username":"admin"}` | 400 กรอกชื่อผู้ใช้และรหัสผ่าน |
| 3 | POST /api/auth/login | - | `{"username":"admin","password":"admin1234"}` | 200 ได้ `data.token` และ `data.user` (ไม่มี `password`) |
| 4 | GET /api/auth/me | ไม่ใส่ | - | 401 กรุณาเข้าสู่ระบบ |
| 5 | GET /api/auth/me | admin | - | 200 `data.role` = `admin` |
| 6 | PUT /api/auth/me | admin | `{"full_name":"ฝ่ายบุคลากร","email":"abc"}` | 400 รูปแบบอีเมลไม่ถูกต้อง |
| 7 | PUT /api/auth/me | admin | `{"full_name":"ฝ่ายบุคลากร","email":"hr@school.ac.th","department":"บุคลากร"}` | 200 บันทึกข้อมูลส่วนตัวแล้ว |
| 8 | POST /api/auth/login | - | `{"username":"emp1","password":"emp12345"}` | 200 `user.must_change_password` = 1 |
| 9 | GET /api/auth/me | emp1 (จากข้อ 8) | - | 200 `data.must_change_password` = 1 (ยังเรียก /me ได้) |
| 10 | PUT /api/auth/password | emp1 (จากข้อ 8) | `{"old_password":"emp12345","new_password":"123"}` | 400 รหัสผ่านใหม่ต้องยาวอย่างน้อย 8 ตัวอักษร |
| 11 | PUT /api/auth/password | emp1 (จากข้อ 8) | `{"old_password":"xxxx","new_password":"newpass123"}` | 400 รหัสผ่านเดิมไม่ถูกต้อง |
| 12 | PUT /api/auth/password | emp1 (จากข้อ 8) | `{"old_password":"emp12345","new_password":"newpass123"}` | 200 เปลี่ยนรหัสผ่านแล้ว ได้ token ใหม่ |
| 13 | PUT /api/auth/me | emp1 (token ใหม่จากข้อ 12) | `{"full_name":"สมชาย ใจดี","email":"emp1@school.ac.th"}` | 200 บันทึกข้อมูลส่วนตัวแล้ว |
| 14 | POST /api/auth/login | - | `{"username":"emp1","password":"newpass123"}` | 200 `user.must_change_password` = 0 |
| 15 | GET /api/nothing | - | - | 404 ไม่พบ API นี้ |

> ใส่ token: แท็บ Auth / Authorization → Bearer → วาง token (หรือ Header `Authorization` = `Bearer <token>` มีเว้นวรรค)
> "บังคับเปลี่ยนรหัสครั้งแรก": token ของ emp1 ก่อนเปลี่ยนรหัสใช้ได้แค่ `/api/auth/me` และ `/api/auth/password` API อื่นทั้งหมดจะตอบ **403 กรุณาเปลี่ยนรหัสผ่านก่อนใช้งาน** (เล่มนี้ยังไม่มี API อื่น จะได้ทดสอบจริงในคู่มือหลักขั้น 3–4) ส่วนหน้าบ้านจะพาไปหน้าเปลี่ยนรหัสเอง

ตรวจฐานข้อมูลอีกรอบ: phpMyAdmin → `users` แถว emp1 ช่อง `must_change_password` เป็น 0 และ `password` เปลี่ยนเป็น hash ใหม่ แถว admin มีอีเมลและแผนกตามที่แก้

ซ้อมรอบใหม่ (ให้รหัสทุกคนกลับเป็นค่าเริ่มต้น)

```bash
docker compose down -v
docker compose up -d db phpmyadmin backend
```

### ✔ ตรวจ B6 (ก่อนส่ง)

- [ ] ผ่านครบ 15 ข้อในตาราง
- [ ] ปิด Docker Desktop แล้วเปิดใหม่ → `docker compose up -d db phpmyadmin backend` → login admin ได้อีก (ข้อมูลอยู่ใน volume ไม่หาย)
- [ ] ถ้าคนที่ 2 ทำเล่มหน้าบ้านถึงขั้น L3 แล้ว: เปิดหน้าเว็บ http://localhost:5173 login `admin` / `admin1234` ผ่านหลังบ้านของเราได้

## เทียบกับเฉลย

| ไฟล์ | เทียบกับ `project/backend` |
|---|---|
| `package.json` `schema.sql` `db.js` `seed.js` `helpers.js` `auth.js` `routes/auth.js` และ `docker-compose.yml` `.gitignore` | เหมือนทุกบรรทัด |
| `server.js` | ส่วนตั้งค่าและจัดการ error เหมือน ต่างแค่ผูก API ชุดเดียว |

## ไปต่อคู่มือหลัก (ขั้น 3–4)

1. เขียน `backend/upload.js` ตามคู่มือหลักข้อ 2.3
2. สร้างไฟล์ routes เปล่า 10 ไฟล์ตามกล่องหมายเหตุในคู่มือหลักขั้น 2 (users periods topics indicators assignments self evaluate reports files backup)
3. เขียนทับ `server.js` ด้วยตัวเต็มจากคู่มือหลักข้อ 2.4
4. ทำ ✔ ตรวจ B5 ซ้ำ ต้องขึ้น `API พร้อมที่ ...` แล้วค่อยทำคู่มือหลักขั้น 3 ต่อ

## ปัญหาที่เจอบ่อยในเล่มนี้

| อาการ | สาเหตุ | วิธีแก้ |
|---|---|---|
| `error during connect` / `Cannot connect to the Docker daemon` | Docker Desktop ยังไม่เปิด | เปิด Docker Desktop รอไอคอนเขียว |
| `port is already allocated` | เฉลยหรือโปรเจกต์อื่นเปิดค้าง | ไปโฟลเดอร์นั้น `docker compose down` |
| log ขึ้น `Cannot find module './routes/xxx'` | `server.js` ใช้ตัวเต็มของคู่มือหลัก | ใช้ `server.js` รุ่นซ้อม Login ใน B5.1 |
| `seed ไม่สำเร็จ: ... You have an error in your SQL syntax` | พิมพ์ `schema.sql` ผิด | เทียบกับ B3.1 ทีละตาราง แล้ว `docker compose down -v` และรันใหม่ |
| login รหัสถูกแต่ได้ 401 | ฐานข้อมูลเก่าค้าง หรือเคยเปลี่ยนรหัสแล้ว | ใช้ `newpass123` หรือ `docker compose down -v` แล้วเปิดใหม่ |
| ได้ 404 "ไม่พบ API นี้" ตอน login | ใช้ GET แทน POST หรือ URL ผิด (`/api/login`) | ต้องเป็น POST `/api/auth/login` |
| ได้ 403 "กรุณาเปลี่ยนรหัสผ่านก่อนใช้งาน" | ยังไม่เปลี่ยนรหัสครั้งแรก หรือยังใช้ token เก่า | ทำข้อ 12 ใน B6 แล้วใช้ token ใหม่ที่ได้ |
| ภาษาไทยในฐานข้อมูลเป็น `???` | ไฟล์ .sql ไม่ได้บันทึกเป็น UTF-8 | มุมขวาล่าง VS Code ต้องเป็น `UTF-8` แล้ว `docker compose down -v` |
