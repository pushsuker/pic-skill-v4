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
