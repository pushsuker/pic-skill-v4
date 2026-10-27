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
