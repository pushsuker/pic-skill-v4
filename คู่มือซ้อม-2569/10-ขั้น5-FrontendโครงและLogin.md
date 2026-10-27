# 10 ขั้น 5 Front-end โครงโปรเจกต์ และหน้า Login (คนที่ 2)

เป้าหมาย: เปิด `http://localhost:5173` แล้วเห็นหน้า Login, เข้าระบบได้, ผู้ใช้ใหม่ถูกบังคับเปลี่ยนรหัสผ่าน

## 5.1 สร้างโปรเจกต์ Vue ด้วย Vite

เปิด Terminal ที่โฟลเดอร์โปรเจกต์ (โฟลเดอร์เดียวกับ `backend`)

```bash
npm create vite@latest frontend -- --template vue
cd frontend
npm install
npm install vuetify@3 @mdi/font@7 vue-router@4 axios@1 html2pdf.js@0.10
npm install -D vite@6 @vitejs/plugin-vue@5
```

> **ต้องใส่ @เลขเวอร์ชัน ตามนี้ทุกตัว** ถ้าพิมพ์แค่ `npm install vuetify` จะได้ Vuetify 4 (รุ่นใหม่ ยังไม่ตรงกับคู่มือ) ซึ่งทำให้ปุ่ม Export PDF ใช้ไม่ได้ (Console ขึ้น `unsupported color function`) และหน้าตาบางอย่างต่างจากเฉลย บรรทัดสุดท้ายปรับ Vite ให้รุ่นเดียวกับเฉลย
> ถ้า `npm create vite` ถามคำถามเพิ่ม (เช่น ใช้ rolldown หรือ ติดตั้งและเปิดเลยไหม) ให้ตอบ **No**

| แพ็กเกจ | ใช้ทำอะไร |
|---|---|
| `vue` | ตัวเฟรมเวิร์กหลัก (มากับ Vite) |
| `vite` + `@vitejs/plugin-vue` | เครื่องมือรันและ build (มากับ Vite) |
| `vuetify` | ชุดคอมโพเนนต์สำเร็จรูป ปุ่ม ตาราง ฟอร์ม เมนู (ไม่ต้องเขียน CSS เอง) |
| `@mdi/font` | ไอคอน `mdi-...` |
| `vue-router` | เปลี่ยนหน้าโดยไม่รีโหลด และกันหน้าตามสิทธิ์ |
| `axios` | เรียก API |
| `html2pdf.js` | ส่งออกรายงานเป็น PDF |

### ลบไฟล์ตัวอย่างที่ไม่ใช้

```bash
# อยู่ในโฟลเดอร์ frontend
rm src/components/HelloWorld.vue
rm -r src/assets
mkdir src/pages
```

> ใช้ได้ทั้ง PowerShell และ Git Bash หรือจะลบใน VS Code (คลิกขวา → Delete) ก็ได้ ไฟล์ในโฟลเดอร์ `public` ปล่อยไว้ได้ (Vite แต่ละรุ่นใส่ไฟล์ตัวอย่างไม่เหมือนกัน)

### สร้างหน้าชั่วคราวทั้ง 14 หน้าไว้ก่อน (สำคัญ)

`router.js` (ข้อ 5.7) จะอ้างถึงหน้า 14 หน้า ถ้าไฟล์ยังไม่มี Vite จะขึ้น `Failed to resolve import` ทันทีที่เปิดเว็บ จึงต้องสร้างไฟล์เปล่าไว้ก่อน แล้วค่อยเขียนทับทีละหน้าในข้อ 5.9–5.11 และขั้น 6–7

```powershell
# PowerShell ในโฟลเดอร์ frontend
$pages = 'LoginPage','PasswordPage','ProfilePage','ResultPage','DashboardPage','UsersPage','PeriodsPage','CriteriaPage','AssignPage','TrackPage','BackupPage','SelfPage','EvaluateListPage','EvaluatePage'
foreach ($p in $pages) { Set-Content "src/pages/$p.vue" "<template>`n  <h2>$p (กำลังทำ)</h2>`n</template>" -Encoding utf8 }
dir src/pages
```

ต้องเห็นไฟล์ `.vue` ครบ 14 ไฟล์ (หรือสร้างเองใน VS Code ทีละไฟล์ ใส่เนื้อหาตามตัวอย่างในข้อ 5.13)

> **อย่าเพิ่งเปิดเว็บดูจนกว่าจะเขียนถึงข้อ 5.8** เพราะ `App.vue` ตัวเดิมยังเรียก `HelloWorld.vue` ที่เพิ่งลบ และ `main.js` (ข้อ 5.4) เรียก `router.js` ที่ยังไม่ได้เขียน จุดตรวจแรกอยู่หลังข้อ 5.8

ตรวจ `package.json` ให้หน้าตาประมาณนี้ (เลขเวอร์ชันใหม่กว่าได้)

ไฟล์ `frontend/package.json`

```json
{
  "name": "evaluation-web",
  "private": true,
  "version": "2569.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "dependencies": {
    "@mdi/font": "^7.4.47",
    "axios": "^1.7.9",
    "html2pdf.js": "^0.10.3",
    "vue": "^3.5.13",
    "vue-router": "^4.5.0",
    "vuetify": "^3.7.6"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.2.1",
    "vite": "^6.0.7"
  }
}
```

## 5.2 `vite.config.js` — ตั้งพอร์ตและ proxy

ไฟล์ `frontend/vite.config.js`

```js
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// หน้าเว็บเรียก /api แล้ว Vite ส่งต่อไปที่ backend
export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: { '/api': process.env.API_URL || 'http://localhost:3000' },
    watch: { usePolling: true }, // Windows + Docker ต้องใช้ polling จึงเห็นไฟล์ที่แก้
  },
});
```

- `proxy` ทำให้ front-end เรียก `/api/...` แล้ว Vite ส่งต่อไปที่ back-end ให้ **จึงไม่ติด CORS**
- ใน Docker ชื่อเครื่อง back-end คือ `backend` (ตั้งผ่าน `API_URL` ใน docker-compose)
- `usePolling` ทำให้แก้ไฟล์แล้วหน้าเว็บรีเฟรชเองเมื่อรันใน Docker บน Windows

## 5.3 `index.html`

ไฟล์ `frontend/index.html`

```html
<!doctype html>
<html lang="th">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ระบบประเมินบุคลากร</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

## 5.4 `src/main.js` — จุดเริ่มต้นของแอป

ไฟล์ `frontend/src/main.js`

```js
import { createApp } from 'vue';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import 'vuetify/styles';
import '@mdi/font/css/materialdesignicons.css';
import './style.css';
import App from './App.vue';
import router from './router';

const vuetify = createVuetify({ components, directives });

const app = createApp(App);
// error จาก API แสดงที่ snackbar แล้ว (ดู api.js) จึงไม่ต้องให้ขึ้นแดงใน Console ซ้ำ
app.config.errorHandler = (err) => console.log(err.message);
app.use(vuetify).use(router).mount('#app');
```

- โหลด Vuetify ทุกคอมโพเนนต์ (`components`, `directives`) จะได้ไม่ต้อง import ทีละตัว
- `errorHandler` กันไม่ให้ error ที่จับไม่ได้ทำหน้าเว็บค้าง

## 5.5 `src/style.css` — CSS เท่าที่จำเป็น

ไฟล์ `frontend/src/style.css`

```css
/* ใช้ Vuetify เป็นหลัก ไฟล์นี้มีแค่ตอนพิมพ์ / ส่งออก PDF */
@media print {
  .no-print,
  .v-app-bar,
  .v-navigation-drawer {
    display: none !important;
  }
  .v-main {
    padding: 0 !important;
  }
}
```

> CSS มีแค่นี้จริง ๆ เรื่องสี ระยะห่าง และ Responsive ให้ Vuetify จัดการ (`v-row`, `v-col cols="12" md="6"`)

## 5.6 `src/api.js` — axios กลางของทั้งแอป

ไฟล์ `frontend/src/api.js`

```js
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
```

- **interceptor ขาไป** แนบ `Authorization: Bearer <token>` อัตโนมัติ
- **interceptor ขากลับ** ถ้าเจอ 401 (token หมดอายุ) → ล้าง token แล้วกลับหน้า Login
- `state.message` คือข้อความที่จะเด้งใน snackbar มุมจอ

## 5.7 `src/router.js` — เส้นทางและการกันสิทธิ์

ไฟล์ `frontend/src/router.js`

```js
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
```

- หน้าที่จำกัดบทบาทมี `meta: { role: '...' }` บอกว่าบทบาทไหนเข้าได้ (หน้า login, password, profile, result ไม่มี meta เพราะทุกบทบาทใช้)
- `beforeEach` ตรวจตามลำดับ: ยังไม่ login → ไป `/login`, ต้องเปลี่ยนรหัสผ่าน → ไป `/password`, login แล้วเปิด `/login` → ไปหน้าแรก, บทบาทไม่ตรงกับ `meta.role` → ไปหน้าแรกของตัวเอง
- การกันหน้าตรงนี้แค่ซ่อนหน้าจอ ความปลอดภัยจริงอยู่ที่ backend (`allow('admin')`) ซึ่งตอบ 403 ถ้าเรียก API ข้ามบทบาท
- `homeOf(user)` บอกหน้าแรกของแต่ละบทบาท ใช้ซ้ำในหน้า Login และ Password

## 5.8 `src/App.vue` — โครงหน้าจอ (เมนูซ้าย + แถบบน)

ไฟล์ `frontend/src/App.vue`

```vue
<template>
  <v-app>
    <!-- แถบด้านบน -->
    <v-app-bar color="primary">
      <v-app-bar-nav-icon v-if="state.user" @click="drawer = !drawer" />
      <v-app-bar-title>ระบบประเมินบุคลากร</v-app-bar-title>
      <template v-if="state.user">
        <span class="d-none d-sm-inline mr-2">{{ state.user.full_name }}</span>
        <v-btn icon="mdi-logout" @click="signOut" />
      </template>
    </v-app-bar>

    <!-- เมนูด้านซ้าย (มือถือจะซ่อน กดปุ่มเมนูเพื่อเปิด) -->
    <v-navigation-drawer v-if="state.user && !state.user.must_change_password" v-model="drawer">
      <v-list nav>
        <v-list-item
          v-for="m in menus[state.user.role]"
          :key="m.to"
          :to="m.to"
          :prepend-icon="m.icon"
          :title="m.title"
        />
        <v-divider />
        <v-list-item to="/profile" prepend-icon="mdi-account" title="ข้อมูลส่วนตัว" />
        <v-list-item to="/password" prepend-icon="mdi-key" title="เปลี่ยนรหัสผ่าน" />
      </v-list>
    </v-navigation-drawer>

    <v-main>
      <v-container>
        <router-view />
      </v-container>
    </v-main>

    <!-- ข้อความแจ้งเตือน -->
    <v-snackbar :model-value="!!state.message" @update:model-value="state.message = ''">
      {{ state.message }}
    </v-snackbar>
  </v-app>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { state, logout } from './api';

const router = useRouter();
const drawer = ref(null); // null = ให้ Vuetify เลือกเอง (จอใหญ่เปิด จอเล็กปิด)

// เมนูของแต่ละบทบาท
const menus = {
  admin: [
    { to: '/dashboard', icon: 'mdi-view-dashboard', title: 'Dashboard' },
    { to: '/users', icon: 'mdi-account-group', title: 'ผู้ใช้งาน' },
    { to: '/periods', icon: 'mdi-calendar', title: 'รอบและตัวชี้วัด' },
    { to: '/assign', icon: 'mdi-account-tie', title: 'มอบหมายกรรมการ' },
    { to: '/track', icon: 'mdi-chart-box', title: 'ติดตามและรายงาน' },
    { to: '/backup', icon: 'mdi-database', title: 'สำรอง/กู้คืนข้อมูล' },
  ],
  evaluatee: [{ to: '/self', icon: 'mdi-clipboard-edit', title: 'ประเมินตนเอง' }],
  evaluator: [{ to: '/evaluate', icon: 'mdi-clipboard-check', title: 'รายชื่อที่ต้องประเมิน' }],
};

function signOut() {
  logout();
  router.push('/login');
}
</script>
```

- `v-navigation-drawer` เมนูซ้าย บนมือถือจะซ่อนเองและเปิดด้วยปุ่ม ☰
- เมนูแสดงตามบทบาท (`v-if="state.user.role === 'admin'"`)
- `v-snackbar` แสดงข้อความแจ้งเตือนจาก `state.message`

### ✔ ตรวจโครง (หลังข้อ 5.8)

ตอนนี้มีครบแล้ว: `main.js` → `App.vue` → `router.js` → หน้าชั่วคราว 14 หน้า เปิดเว็บได้แล้ว (ต้องเปิด backend ไว้ก่อน ดูวิธีรันในหัวข้อ ✔ ตรวจขั้น 5 ท้ายบท)

```bash
# ในโฟลเดอร์ frontend
npm run dev
```

- [ ] เปิด http://localhost:5173 → แถบบนสีน้ำเงิน "ระบบประเมินบุคลากร" และหัวข้อ "LoginPage (กำลังทำ)" URL เปลี่ยนเป็น `/login` เอง
- [ ] พิมพ์ `/users` ในช่อง URL → ถูกพากลับ `/login` (ยังไม่ login)
- [ ] F12 → Console ไม่มีตัวแดง

ถ้าขึ้น `Failed to resolve import "./pages/XxxPage.vue"` แปลว่าหน้านั้นยังไม่ได้สร้าง หรือสะกดชื่อไฟล์ไม่ตรง (ตัวพิมพ์เล็กใหญ่ต้องตรง) กลับไปทำ "สร้างหน้าชั่วคราวทั้ง 14 หน้า" ในข้อ 5.1

## 5.9 หน้า Login

ไฟล์ `frontend/src/pages/LoginPage.vue`

```vue
<template>
  <v-card max-width="420" class="mx-auto mt-10 pa-4">
    <v-card-title>เข้าสู่ระบบ</v-card-title>
    <v-form ref="form" @submit.prevent="login">
      <v-text-field v-model="username" label="ชื่อผู้ใช้" :rules="[rules.required]" />
      <v-text-field v-model="password" label="รหัสผ่าน" type="password" :rules="[rules.required]" />
      <v-btn type="submit" color="primary" block>เข้าสู่ระบบ</v-btn>
    </v-form>
  </v-card>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { homeOf } from '../router';
import { api, saveLogin, rules } from '../api';

const router = useRouter();
const form = ref();
const username = ref('');
const password = ref('');

async function login() {
  const { valid } = await form.value.validate();
  if (!valid) return;
  const res = await api.post('/auth/login', { username: username.value, password: password.value });
  saveLogin(res.data.token, res.data.user);
  router.push(homeOf(res.data.user));
}
</script>
```

- `rules` ตรวจช่องว่างก่อนส่ง (ข้อ 6.4 Validation ฝั่งหน้าบ้าน)
- `await form.value.validate()` ถ้าไม่ผ่านจะไม่เรียก API

## 5.10 หน้าเปลี่ยนรหัสผ่าน (บังคับครั้งแรก)

ไฟล์ `frontend/src/pages/PasswordPage.vue`

```vue
<template>
  <v-card max-width="420" class="mx-auto mt-6 pa-4">
    <v-card-title>เปลี่ยนรหัสผ่าน</v-card-title>
    <v-alert v-if="state.user.must_change_password" type="warning" class="mb-4">
      เข้าใช้งานครั้งแรก กรุณาเปลี่ยนรหัสผ่านก่อน
    </v-alert>
    <v-form ref="form" @submit.prevent="save">
      <v-text-field v-model="oldPassword" label="รหัสผ่านเดิม" type="password" :rules="[rules.required]" />
      <v-text-field v-model="newPassword" label="รหัสผ่านใหม่" type="password" :rules="[rules.min8]" />
      <v-text-field
        v-model="confirm"
        label="ยืนยันรหัสผ่านใหม่"
        type="password"
        :rules="[(v) => v === newPassword || 'รหัสผ่านไม่ตรงกัน']"
      />
      <v-btn type="submit" color="primary" block>บันทึก</v-btn>
    </v-form>
  </v-card>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { homeOf } from '../router';
import { api, state, saveLogin, rules } from '../api';

const router = useRouter();
const form = ref();
const oldPassword = ref('');
const newPassword = ref('');
const confirm = ref('');

async function save() {
  const { valid } = await form.value.validate();
  if (!valid) return;
  const res = await api.put('/auth/password', {
    old_password: oldPassword.value,
    new_password: newPassword.value,
  });
  saveLogin(res.data.token, { ...state.user, must_change_password: 0 });
  state.message = res.message;
  router.push(homeOf(state.user));
}
</script>
```

## 5.11 หน้าข้อมูลส่วนตัว

ไฟล์ `frontend/src/pages/ProfilePage.vue`

```vue
<template>
  <h2 class="mb-4">ข้อมูลส่วนตัว</h2>
  <v-card class="pa-4" max-width="600">
    <p class="mb-4">ชื่อผู้ใช้: {{ user.username }}</p>
    <v-form ref="form" @submit.prevent="save">
      <v-text-field v-model="user.full_name" label="ชื่อ-นามสกุล" :rules="[rules.required]" />
      <v-text-field v-model="user.email" label="อีเมล" :rules="[rules.email]" />
      <v-text-field v-model="user.department" label="แผนก/หน่วยงาน" />
      <v-btn type="submit" color="primary">บันทึก</v-btn>
    </v-form>
  </v-card>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { api, state, rules } from '../api';

const form = ref();
const user = ref({});

onMounted(async () => {
  user.value = (await api.get('/auth/me')).data;
});

async function save() {
  const { valid } = await form.value.validate();
  if (!valid) return;
  const res = await api.put('/auth/me', user.value);
  state.user.full_name = user.value.full_name;
  localStorage.setItem('user', JSON.stringify(state.user));
  state.message = res.message;
}
</script>
```

## 5.12 คอมโพเนนต์ใช้ซ้ำ `ScoreSelect.vue`

ใช้ทั้งหน้าผู้รับการประเมินและหน้ากรรมการ แสดงปุ่มเลือกคะแนน 0/1 หรือ 1–4 ตามชนิดตัวชี้วัด

ไฟล์ `frontend/src/components/ScoreSelect.vue`

```vue
<!-- ช่องเลือกคะแนน ใช้ได้ทั้งแบบ มี/ไม่มี และ สเกล 1-4 (พร้อมคำอธิบายระดับ) -->
<template>
  <v-select
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    :items="type === 'yesno' ? yesno : scale"
    :label="label"
    :disabled="disabled"
  />
</template>

<script setup>
defineProps(['modelValue', 'type', 'label', 'disabled']);
const emit = defineEmits(['update:modelValue']);

const yesno = [
  { title: 'มี', value: 1 },
  { title: 'ไม่มี', value: 0 },
];
const scale = [
  { title: '1 - ปฏิบัติได้ต่ำกว่าระดับการปฏิบัติที่คาดหวังมาก', value: 1 },
  { title: '2 - ปฏิบัติได้ต่ำกว่าระดับการปฏิบัติที่คาดหวัง', value: 2 },
  { title: '3 - ปฏิบัติได้ตามระดับการปฏิบัติที่คาดหวัง', value: 3 },
  { title: '4 - ปฏิบัติได้สูงกว่าระดับการปฏิบัติที่คาดหวัง', value: 4 },
];
</script>
```

## 5.13 หน้าอื่นที่ยังไม่ได้ทำ

หน้าที่เหลือ 11 หน้า (Dashboard, Users, Periods, Criteria, Assign, Track, Backup, Result, Self, EvaluateList, Evaluate) ยังเป็นหน้าชั่วคราวที่สร้างไว้ในข้อ 5.1 หน้าตาแบบนี้ เช่น `src/pages/UsersPage.vue`

```vue
<template>
  <h2>UsersPage (กำลังทำ)</h2>
</template>
```

แล้วค่อยเขียนทับด้วยตัวจริงในขั้น 6 และ 7 (ห้ามลบไฟล์ทิ้ง เพราะ router ยังอ้างถึงอยู่)

## ✔ ตรวจขั้น 5 (รันและตรวจ)

```bash
# ถ้าใช้ Docker (แนะนำ) ที่โฟลเดอร์โปรเจกต์
docker compose up -d
docker compose logs -f frontend

# หรือรันตรงในเครื่อง (ต้องเปิด backend ไว้ที่พอร์ต 3000)
cd frontend
npm run dev
```

ตรวจตามนี้

- [ ] เปิด `http://localhost:5173` เห็นหน้า Login
- [ ] กด "เข้าสู่ระบบ" โดยไม่กรอก → ขึ้นข้อความเตือนใต้ช่อง
- [ ] `admin` / `admin1234` → เข้าหน้า Dashboard ได้ เมนูซ้ายมีเมนูของผู้ดูแล
- [ ] ใส่รหัสผิด → snackbar ล่างจอขึ้น "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"
- [ ] `emp2` / `emp12345` → ถูกพาไปหน้าเปลี่ยนรหัสผ่าน ลองพิมพ์ `/self` ในช่อง URL ก็ยังถูกพากลับหน้าเปลี่ยนรหัส → เปลี่ยนแล้วเข้าหน้าประเมินตนเอง (ใช้ emp2 เพราะ emp1 อาจเปลี่ยนรหัสไปแล้วตอนทดสอบขั้น 4 ถ้าเปลี่ยนแล้วใช้รหัส `newpass123`)
- [ ] พิมพ์ `/users` ในช่อง URL ขณะเป็นผู้รับการประเมิน → ถูกส่งกลับหน้า `/self` ของตัวเอง
- [ ] กดไอคอนออกจากระบบ (มุมขวาบน) → กลับหน้า Login และพิมพ์ `/dashboard` ก็เข้าไม่ได้
- [ ] กด F12 → แท็บ Console ไม่มีตัวแดง (ตัวเหลือง warning ของ Vuetify ไม่เป็นไร)
- [ ] กด F12 → แท็บ Application → Local Storage มี `token` และ `user`
- [ ] กด F12 → ไอคอนมือถือ (Toggle device toolbar) เลือก iPhone → เมนูซ้ายซ่อน กดปุ่ม ☰ แล้วเมนูเลื่อนออกมา (Responsive ข้อ 7.10)
