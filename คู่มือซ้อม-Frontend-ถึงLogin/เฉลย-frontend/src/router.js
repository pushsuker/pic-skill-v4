// กำหนดหน้าเว็บแต่ละหน้า และตรวจการ login ก่อนเข้า (รุ่นซ้อม Login)
import { createRouter, createWebHistory } from 'vue-router';
import { state } from './api';

const routes = [
  { path: '/login', component: () => import('./pages/LoginPage.vue') },
  { path: '/password', component: () => import('./pages/PasswordPage.vue') },
  { path: '/profile', component: () => import('./pages/ProfilePage.vue') },
  // หน้าแรกของแต่ละบทบาท (ตอนนี้ใช้หน้าชั่วคราวหน้าเดียวกัน)
  { path: '/dashboard', component: () => import('./pages/HomePage.vue'), meta: { role: 'admin' } },
  { path: '/self', component: () => import('./pages/HomePage.vue'), meta: { role: 'evaluatee' } },
  { path: '/evaluate', component: () => import('./pages/HomePage.vue'), meta: { role: 'evaluator' } },
  // พาธอื่น ๆ ไปหน้า login (ถ้า login แล้วจะถูกส่งไปหน้าแรกของบทบาท)
  { path: '/:any(.*)*', redirect: '/login' },
];

const router = createRouter({ history: createWebHistory(), routes });

// หน้าแรกหลัง login (ถ้าต้องเปลี่ยนรหัสผ่าน ไปหน้าเปลี่ยนรหัสก่อน)
export function homeOf(user) {
  if (user.must_change_password) return '/password';
  return { admin: '/dashboard', evaluatee: '/self', evaluator: '/evaluate' }[user.role];
}

router.beforeEach((to) => {
  const user = state.user;
  if (!user) return to.path === '/login' ? true : '/login';
  if (user.must_change_password && to.path !== '/password') return '/password';
  if (to.path === '/login') return homeOf(user);
  // เข้าหน้าของบทบาทอื่น → ส่งกลับหน้าแรกของตัวเอง
  if (to.meta.role && to.meta.role !== user.role) return homeOf(user);
});

export default router;
