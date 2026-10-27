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
