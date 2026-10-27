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
