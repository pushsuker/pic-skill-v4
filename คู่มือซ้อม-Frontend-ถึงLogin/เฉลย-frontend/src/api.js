// เรียก API ด้วย axios + เก็บข้อมูลผู้ใช้ที่ login
import axios from 'axios';
import { reactive } from 'vue';

// ข้อมูลที่ทุกหน้าใช้ร่วมกัน
export const state = reactive({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  message: '', // ข้อความแจ้งเตือนมุมจอ
});

export const api = axios.create({ baseURL: '/api' });

// แนบ token ไปกับทุกคำขอ
api.interceptors.request.use((config) => {
  config.headers.Authorization = 'Bearer ' + localStorage.getItem('token');
  return config;
});

// สำเร็จ: คืนเฉพาะ body  /  ผิดพลาด: แสดงข้อความจาก API
api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    state.message = err.response?.data?.message || 'เชื่อมต่อ API ไม่ได้';
    if (err.response?.status === 401) logout();
    return Promise.reject(err);
  },
);

export function saveLogin(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
  state.user = user;
}

export function logout() {
  localStorage.clear();
  state.user = null;
}

// ลิงก์ดาวน์โหลดไฟล์ (แนบ token ใน URL)
export function fileUrl(name) {
  return '/api/files/' + name + '?token=' + localStorage.getItem('token');
}

// กฎตรวจข้อมูลในฟอร์ม (Data Validation)
export const rules = {
  required: (v) => (v !== null && v !== undefined && v !== '') || 'ห้ามว่าง',
  email: (v) => !v || /^\S+@\S+\.\S+$/.test(v) || 'รูปแบบอีเมลไม่ถูกต้อง',
  min8: (v) => (v && v.length >= 8) || 'อย่างน้อย 8 ตัวอักษร',
};

// ชื่อที่แสดงบนหน้าจอ
export const roleNames = { admin: 'ฝ่ายบุคลากร', evaluatee: 'ผู้รับการประเมิน', evaluator: 'กรรมการ' };
export const committeeNames = { chair: 'ประธาน', member: 'กรรมการร่วม' };
export const statusNames = { pending: 'ยังไม่ได้ประเมิน', draft: 'บันทึกร่าง', confirmed: 'ยืนยันผลแล้ว' };
export const statusColors = { pending: 'grey', draft: 'orange', confirmed: 'green' };
