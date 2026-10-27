// กำหนดหน้าเว็บแต่ละหน้า และตรวจการ login ก่อนเข้า
import { createRouter, createWebHistory } from 'vue-router';
import { state } from './api';

const routes = [
  { path: '/login', component: () => import('./pages/LoginPage.vue') },
  { path: '/password', component: () => import('./pages/PasswordPage.vue') },
  { path: '/profile', component: () => import('./pages/ProfilePage.vue') },
  { path: '/result/:periodId/:userId', component: () => import('./pages/ResultPage.vue') },
  // ฝ่ายบุคลากร (meta.role = บทบาทที่เข้าหน้านี้ได้)
  { path: '/dashboard', component: () => import('./pages/DashboardPage.vue'), meta: { role: 'admin' } },
  { path: '/users', component: () => import('./pages/UsersPage.vue'), meta: { role: 'admin' } },
  { path: '/periods', component: () => import('./pages/PeriodsPage.vue'), meta: { role: 'admin' } },
  { path: '/periods/:id', component: () => import('./pages/CriteriaPage.vue'), meta: { role: 'admin' } },
  { path: '/assign', component: () => import('./pages/AssignPage.vue'), meta: { role: 'admin' } },
  { path: '/track', component: () => import('./pages/TrackPage.vue'), meta: { role: 'admin' } },
  { path: '/backup', component: () => import('./pages/BackupPage.vue'), meta: { role: 'admin' } },
  // ผู้รับการประเมิน
  { path: '/self', component: () => import('./pages/SelfPage.vue'), meta: { role: 'evaluatee' } },
  // กรรมการ
  { path: '/evaluate', component: () => import('./pages/EvaluateListPage.vue'), meta: { role: 'evaluator' } },
  { path: '/evaluate/:id', component: () => import('./pages/EvaluatePage.vue'), meta: { role: 'evaluator' } },
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
