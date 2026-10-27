# คู่มือซ้อม Front-end ถึงขั้น Login (คนที่ 2)

เล่มนี้แยกจากคู่มือหลัก ใช้ซ้อมเฉพาะ **โครงหน้าเว็บ + Login + บังคับเปลี่ยนรหัส + ข้อมูลส่วนตัว** ให้จบในรอบเดียว เขียนทีละไฟล์ตามลำดับ **ทุกขั้นจบด้วย ✔ ตรวจ ที่รันได้จริง ไม่มี error ค้างระหว่างทาง**

> ทำไมคู่มือหลักถึง error กลางทาง: ในคู่มือหลัก `main.js` เรียก `router` ตั้งแต่ข้อ 5.4 และ `router.js` (ข้อ 5.7) อ้างถึงหน้า 14 หน้าที่ยังไม่ได้สร้าง วิธีแก้ (สร้างหน้าชั่วคราว) อยู่ท้ายบทข้อ 5.13 นักเรียนที่เปิดเว็บดูระหว่างทางจึงเจอ `Failed to resolve import` เล่มนี้เรียงใหม่ให้สร้างไฟล์ก่อนแล้วค่อยอ้างถึง

> โค้ดที่ทำเสร็จตามเล่มนี้อยู่ในโฟลเดอร์ `เฉลย-frontend` (ข้างไฟล์คู่มือนี้) ใช้เทียบเมื่อติดปัญหา ถ้าจะรันเฉลยให้ `npm install` ในโฟลเดอร์นั้นก่อน

| ขั้น | ทำอะไร | ใช้เวลา |
|---|---|---|
| L0 | เปิด Back-end เฉลย ไว้ให้หน้าบ้านเรียก | 5 นาที |
| L1 | สร้างโปรเจกต์ Vue + Vuetify ให้หน้าเว็บขึ้น | 15 นาที |
| L2 | `api.js` + หน้าชั่วคราว + `router.js` + `App.vue` | 20 นาที |
| L3 | หน้า Login | 15 นาที |
| L4 | หน้าเปลี่ยนรหัสผ่าน (บังคับครั้งแรก) | 10 นาที |
| L5 | หน้าข้อมูลส่วนตัว | 10 นาที |
| L6 | ตรวจรวมก่อนส่ง | 10 นาที |

บัญชีที่ใช้ซ้อม (มาจาก seed ของเฉลย)

| ชื่อผู้ใช้ | รหัสผ่าน | บทบาท |
|---|---|---|
| admin | admin1234 | ฝ่ายบุคลากร |
| emp1, emp2 | emp12345 | ผู้รับการประเมิน (ต้องเปลี่ยนรหัสครั้งแรก) |
| eva1, eva2 | eva12345 | กรรมการ (ต้องเปลี่ยนรหัสครั้งแรก) |

## L0 เปิด Back-end เฉลย

หน้าบ้านต้องมี API ให้เรียก เล่มนี้ใช้ Back-end จากโฟลเดอร์เฉลย `project` (คนที่ 1 ไม่ต้องเขียนก่อน) เปิด Docker Desktop ให้ไอคอนเป็นสีเขียว แล้วพิมพ์ที่โฟลเดอร์ `project`

```bash
docker compose down -v
docker compose up -d db phpmyadmin backend
docker compose logs -f backend
```

- `down -v` ล้างฐานข้อมูลเก่า บัญชีจะกลับเป็นรหัสตามตารางด้านบน
- สั่งเปิด **แค่ 3 บริการ** ไม่เปิด `frontend` ของเฉลย เพราะเราจะใช้พอร์ต 5173 กับหน้าบ้านที่เขียนเอง

> ถ้าคนที่ 1 ทำ "คู่มือซ้อม Back-end ถึงขั้น Login" เสร็จแล้ว ใช้หลังบ้านของทีมแทนเฉลยได้เลย (เปิดด้วยคำสั่งเดียวกันที่โฟลเดอร์ `evaluation` ของทีม) ห้ามเปิดทั้งสองชุดพร้อมกันเพราะใช้พอร์ต 3000 เหมือนกัน

### ✔ ตรวจ L0

- [ ] log ขึ้น `seed เสร็จแล้ว` และ `API พร้อมที่ http://localhost:3000` แล้วกด `Ctrl + C` ออกจาก log ได้ (Back-end ยังทำงานต่อ)
- [ ] เปิด http://localhost:3000/api/auth/me ในเบราว์เซอร์ เห็น `{"status":"error","message":"กรุณาเข้าสู่ระบบ","data":null}` (ได้ข้อความนี้ = API ทำงานแล้ว)

## L1 สร้างโปรเจกต์ Vue + Vuetify

### L1.1 สร้างโปรเจกต์และติดตั้งแพ็กเกจ

เปิด PowerShell ที่โฟลเดอร์ซ้อม (เช่น `D:\ซ้อม`) แล้วพิมพ์

```bash
npm create vite@latest frontend -- --template vue
cd frontend
npm install
npm install vuetify@3 @mdi/font@7 vue-router@4 axios@1
npm install -D vite@6 @vitejs/plugin-vue@5
```

> **ต้องใส่ @เลขเวอร์ชันตามนี้** ถ้าพิมพ์แค่ `npm install vuetify` จะได้ Vuetify 4 ซึ่งยังไม่ตรงกับเฉลย (ต่อไปในคู่มือหลัก ปุ่ม Export PDF จะใช้ไม่ได้) บรรทัดสุดท้ายปรับ Vite ให้รุ่นเดียวกับเฉลย
> ถ้า `npm create vite` ถามคำถามเพิ่ม (เช่น ใช้ rolldown หรือ ติดตั้งและเปิดเลยไหม) ให้ตอบ **No** ทุกข้อ แล้วพิมพ์คำสั่งที่เหลือเอง

| แพ็กเกจ | ใช้ทำอะไร |
|---|---|
| `vuetify` | ชุดคอมโพเนนต์สำเร็จรูป ปุ่ม ฟอร์ม เมนู ไม่ต้องเขียน CSS เอง |
| `@mdi/font` | ไอคอน `mdi-...` |
| `vue-router` | เปลี่ยนหน้าโดยไม่รีโหลด และกันหน้าตามสิทธิ์ |
| `axios` | เรียก API |

### L1.2 ลบไฟล์ตัวอย่างที่ไม่ใช้ และสร้างโฟลเดอร์หน้า

```powershell
# อยู่ในโฟลเดอร์ frontend (PowerShell)
Remove-Item src/components/HelloWorld.vue
Remove-Item -Recurse src/assets
New-Item -ItemType Directory src/pages
```

> ไฟล์ในโฟลเดอร์ `public` (ไอคอน) ปล่อยไว้ได้ ไม่มีผล (Vite แต่ละรุ่นใส่ไฟล์ตัวอย่างไม่เหมือนกัน ถ้าลบไฟล์ไหนแล้วขึ้นว่าไม่มีไฟล์ ข้ามไปได้เลย)
> ลบใน VS Code ก็ได้ (คลิกขวา → Delete) ตอนนี้อย่าเพิ่งรันเว็บ เพราะ `App.vue` ตัวเดิมยังเรียก `HelloWorld.vue` ที่เพิ่งลบ จะแก้ใน L1.6

### L1.3 `vite.config.js` — ตั้งพอร์ตและ proxy

เขียนทับทั้งไฟล์

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

- `proxy` ทำให้หน้าบ้านเรียก `/api/...` แล้ว Vite ส่งต่อไปที่ `http://localhost:3000` ให้ **จึงไม่ติด CORS**

### L1.4 `index.html`

เขียนทับทั้งไฟล์

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

### L1.5 `src/style.css`

เขียนทับทั้งไฟล์ (ลบ CSS ตัวอย่างของ Vite ทิ้งให้หมด ไม่อย่างนั้นจะตีกับ Vuetify)

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

### L1.6 `src/main.js` (รุ่นแรก ยังไม่มี router) และ `App.vue` ชั่วคราว

`main.js` รุ่นนี้ติดตั้งแค่ Vuetify ก่อน **ยังไม่ import router** เพราะยังไม่มีไฟล์

ไฟล์ `frontend/src/main.js` (รุ่นแรก)

```js
import { createApp } from 'vue';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import 'vuetify/styles';
import '@mdi/font/css/materialdesignicons.css';
import './style.css';
import App from './App.vue';

const vuetify = createVuetify({ components, directives });

createApp(App).use(vuetify).mount('#app');
```

เขียนทับ `App.vue` ด้วยหน้าทดสอบสั้น ๆ

ไฟล์ `frontend/src/App.vue` (ชั่วคราว)

```vue
<template>
  <v-app>
    <v-main>
      <v-container>
        <h2>Vuetify พร้อมใช้งาน</h2>
        <v-btn color="primary" prepend-icon="mdi-check">ปุ่มทดสอบ</v-btn>
      </v-container>
    </v-main>
  </v-app>
</template>
```

### ✔ ตรวจ L1

```bash
npm run dev
```

- [ ] Terminal ขึ้น `Local: http://localhost:5173/`
- [ ] เปิด http://localhost:5173 เห็นหัวข้อ "Vuetify พร้อมใช้งาน" และ **ปุ่มสีน้ำเงินมีไอคอนเครื่องหมายถูก** (ถ้าปุ่มไม่มีสี = ยังไม่ได้ import `vuetify/styles`, ไม่มีไอคอน = ขาด `@mdi/font`)
- [ ] กด F12 → Console ไม่มีตัวแดง

> พื้นหลังเป็นสีดำ? แปลว่าได้ Vuetify 4 (ลืมใส่ `@3` ใน L1.1) ให้ `npm install vuetify@3` แล้วปิดเปิด `npm run dev` ใหม่

เปิด `npm run dev` ทิ้งไว้ได้เลย แก้ไฟล์แล้วหน้าเว็บจะรีเฟรชเอง (ถ้าหน้าขาวค้างให้กด F5)

## L2 `api.js` + หน้าชั่วคราว + `router.js` + `App.vue`

ลำดับสำคัญ: **สร้างไฟล์ที่ถูกอ้างถึงก่อน** แล้วค่อยเขียนไฟล์ที่ import มัน

### L2.1 `src/api.js` — axios กลางของทั้งแอป

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

- **interceptor ขาไป** แนบ `Authorization: Bearer <token>` ให้ทุกคำขอ
- **interceptor ขากลับ** ข้อความ error จาก API ไปขึ้นที่ `state.message` และถ้าได้ 401 จะล้าง token ให้
- ไฟล์นี้เป็นตัวเต็มเหมือนเฉลย ใช้ต่อได้จนจบงาน

### L2.2 สร้างหน้าชั่วคราว 4 ไฟล์

สร้างไฟล์ไว้ก่อนให้ router มีของให้เรียก ข้างในเขียนแค่หัวข้อ (หน้า Login, Password, Profile จะเขียนจริงใน L3–L5)

ไฟล์ `frontend/src/pages/LoginPage.vue` (ชั่วคราว)

```vue
<template>
  <h2>หน้า Login (กำลังทำ)</h2>
</template>
```

ไฟล์ `frontend/src/pages/PasswordPage.vue` (ชั่วคราว)

```vue
<template>
  <h2>หน้าเปลี่ยนรหัสผ่าน (กำลังทำ)</h2>
</template>
```

ไฟล์ `frontend/src/pages/ProfilePage.vue` (ชั่วคราว)

```vue
<template>
  <h2>หน้าข้อมูลส่วนตัว (กำลังทำ)</h2>
</template>
```

หน้าแรกหลัง login ของทุกบทบาท ใช้ไฟล์เดียวกันไปก่อน (ในคู่มือหลักจะแยกเป็น Dashboard / ประเมินตนเอง / รายชื่อที่ต้องประเมิน)

ไฟล์ `frontend/src/pages/HomePage.vue`

```vue
<template>
  <h2 class="mb-4">ยินดีต้อนรับ {{ state.user.full_name }}</h2>
  <v-card class="pa-4" max-width="600">
    <p>บทบาท: <strong>{{ roleNames[state.user.role] }}</strong></p>
    <p>หน้านี้เป็นหน้าชั่วคราวของเล่มซ้อม Login เมนูจริงของแต่ละบทบาทจะทำในคู่มือหลักขั้น 6–7</p>
  </v-card>
</template>

<script setup>
import { state, roleNames } from '../api';
</script>
```

### L2.3 `src/router.js` (รุ่นซ้อม Login)

มีแค่หน้าที่สร้างแล้ว ส่วนกันสิทธิ์ (`beforeEach`, `homeOf`) **เหมือนเฉลยทุกบรรทัด**

ไฟล์ `frontend/src/router.js` (รุ่นซ้อม Login)

```js
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
```

- `() => import(...)` โหลดหน้านั้นตอนเปิดจริง แต่ **Vite ตรวจว่าไฟล์มีอยู่ทันที** ถ้าอ้างไฟล์ที่ยังไม่สร้างจะขึ้น `Failed to resolve import` นี่คือเหตุที่ต้องทำ L2.2 ก่อน
- `beforeEach` ตรวจตามลำดับ: ยังไม่ login → `/login`, ต้องเปลี่ยนรหัส → `/password`, login แล้วเปิด `/login` → หน้าแรก, บทบาทไม่ตรง `meta.role` → หน้าแรกของตัวเอง

### L2.4 `src/main.js` (ตัวเต็ม เพิ่ม router)

เขียนทับทั้งไฟล์ เพิ่ม 2 อย่าง: `import router` และ `.use(router)`

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

### L2.5 `src/App.vue` (รุ่นซ้อม Login)

เหมือนเฉลย ต่างแค่ `menus` มีเฉพาะหน้าแรกของแต่ละบทบาท

ไฟล์ `frontend/src/App.vue` (รุ่นซ้อม Login)

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

// เมนูของแต่ละบทบาท (รุ่นซ้อม Login มีแค่หน้าแรก คู่มือหลักจะเพิ่มเมนูครบ)
const menus = {
  admin: [{ to: '/dashboard', icon: 'mdi-view-dashboard', title: 'Dashboard' }],
  evaluatee: [{ to: '/self', icon: 'mdi-clipboard-edit', title: 'ประเมินตนเอง' }],
  evaluator: [{ to: '/evaluate', icon: 'mdi-clipboard-check', title: 'รายชื่อที่ต้องประเมิน' }],
};

function signOut() {
  logout();
  router.push('/login');
}
</script>
```

### ✔ ตรวจ L2

- [ ] เปิด http://localhost:5173 → แถบบนสีน้ำเงิน "ระบบประเมินบุคลากร" และหัวข้อ "หน้า Login (กำลังทำ)" URL เปลี่ยนเป็น `/login` เอง
- [ ] พิมพ์ http://localhost:5173/dashboard ในช่อง URL → ถูกพากลับ `/login` (ยังไม่ login เข้าไม่ได้)
- [ ] พิมพ์ http://localhost:5173/abc → ถูกพากลับ `/login`
- [ ] F12 → Console ไม่มีตัวแดง

## L3 หน้า Login

เขียนทับไฟล์ชั่วคราวด้วยตัวจริง (เหมือนเฉลยทุกบรรทัด)

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

- `:rules="[rules.required]"` ตรวจช่องว่างก่อนส่ง (Validation ฝั่งหน้าบ้าน)
- `await form.value.validate()` ถ้าไม่ผ่านจะไม่เรียก API
- รหัสผิด API ตอบ 401 → interceptor ใน `api.js` ใส่ข้อความลง `state.message` → snackbar ใน `App.vue` เด้งขึ้นเอง หน้านี้ไม่ต้องเขียน try/catch

### ✔ ตรวจ L3

- [ ] เห็นการ์ด "เข้าสู่ระบบ" กดปุ่มโดยไม่กรอก → ใต้ทั้งสองช่องขึ้น "ห้ามว่าง" สีแดง
- [ ] `admin` / `x` → snackbar ล่างจอ "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"
- [ ] `admin` / `admin1234` → ไปหน้า `/dashboard` เห็น "ยินดีต้อนรับ ฝ่ายบุคลากร" บทบาท ฝ่ายบุคลากร เมนูซ้ายมี Dashboard, ข้อมูลส่วนตัว, เปลี่ยนรหัสผ่าน
- [ ] F12 → Application → Local Storage → `http://localhost:5173` มี `token` และ `user`
- [ ] พิมพ์ `/login` ในช่อง URL → ถูกพากลับ `/dashboard` (login แล้วไม่ต้องเห็นหน้า Login)
- [ ] พิมพ์ `/self` (หน้าของผู้รับ) → ถูกพากลับ `/dashboard` (กันหน้าข้ามบทบาท)
- [ ] กดไอคอนออกจากระบบมุมขวาบน → กลับหน้า Login, Local Storage ว่าง

## L4 หน้าเปลี่ยนรหัสผ่าน (บังคับครั้งแรก)

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

- API เปลี่ยนรหัสแล้วส่ง **token ใหม่** กลับมา (token เก่ายังบอกว่าต้องเปลี่ยนรหัส) จึงต้อง `saveLogin` อีกรอบ
- `must_change_password: 0` ทำให้ router ปล่อยไปหน้าอื่นได้

### ✔ ตรวจ L4

- [ ] login `emp1` / `emp12345` → ถูกพาไป `/password` เห็นกล่องสีส้ม "เข้าใช้งานครั้งแรก..." และ **ไม่มีเมนูซ้าย**
- [ ] พิมพ์ `/self` ในช่อง URL → ยังถูกพากลับ `/password`
- [ ] รหัสใหม่ `123` → ขึ้น "อย่างน้อย 8 ตัวอักษร" / ยืนยันไม่ตรง → ขึ้น "รหัสผ่านไม่ตรงกัน"
- [ ] รหัสเดิมผิด (เช่น `xxxx`) รหัสใหม่ `newpass123` ทั้งสองช่อง → snackbar "รหัสผ่านเดิมไม่ถูกต้อง"
- [ ] รหัสเดิม `emp12345` รหัสใหม่ `newpass123` ทั้งสองช่อง → snackbar "เปลี่ยนรหัสผ่านแล้ว" ไปหน้า `/self` เห็น "ยินดีต้อนรับ สมชาย ใจดี" บทบาท ผู้รับการประเมิน และเมนูซ้ายโผล่
- [ ] ออกจากระบบ แล้ว login `emp1` / `newpass123` → เข้า `/self` ตรง ๆ ไม่ถูกบังคับเปลี่ยนรหัสอีก

> ซ้อมรอบใหม่ อยากให้ emp1 กลับเป็นรหัสเดิม: ที่โฟลเดอร์ `project` พิมพ์ `docker compose down -v` แล้ว `docker compose up -d db phpmyadmin backend` หรือใช้ `emp2`, `eva1`, `eva2` ที่ยังไม่เคยเปลี่ยน

## L5 หน้าข้อมูลส่วนตัว

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

- `onMounted` โหลดข้อมูลล่าสุดจาก `GET /api/auth/me` ตอนเปิดหน้า
- บันทึกแล้วอัปเดตชื่อใน `state.user` ชื่อบนแถบบนจึงเปลี่ยนตามทันที

### ✔ ตรวจ L5

- [ ] login `admin` → เมนูซ้าย "ข้อมูลส่วนตัว" → เห็น "ชื่อผู้ใช้: admin" และช่องชื่อเป็น "ฝ่ายบุคลากร"
- [ ] อีเมล `abc` → ขึ้น "รูปแบบอีเมลไม่ถูกต้อง" กดบันทึกแล้วไม่ส่ง
- [ ] ลบชื่อให้ว่าง → ขึ้น "ห้ามว่าง"
- [ ] ชื่อ `ฝ่ายบุคลากร ทดสอบ` อีเมล `hr@school.ac.th` แผนก `บุคลากร` → snackbar "บันทึกข้อมูลส่วนตัวแล้ว" ชื่อบนแถบบนเปลี่ยนทันที
- [ ] กด F5 → ข้อมูลที่บันทึกยังอยู่ (มาจากฐานข้อมูลจริง)

## L6 ตรวจรวมก่อนส่ง

- [ ] login ครบ 3 บทบาท: `admin` → `/dashboard`, `emp2` (เปลี่ยนรหัสก่อน) → `/self`, `eva1` (เปลี่ยนรหัสก่อน) → `/evaluate` แต่ละคนเห็นเมนูหน้าแรกของตัวเองเท่านั้น
- [ ] ขณะเป็น eva1 พิมพ์ `/dashboard` → ถูกพากลับ `/evaluate`
- [ ] ออกจากระบบแล้วพิมพ์ `/profile` → ถูกพากลับ `/login`
- [ ] F12 → Console ไม่มีตัวแดงตลอดการทดสอบ ยกเว้นบรรทัด `Failed to load resource ... 401 (Unauthorized)` / `400 (Bad Request)` ที่เกิดตอน **ตั้งใจ** ใส่รหัสผิด อันนั้นคือเบราว์เซอร์รายงานว่า API ตอบ error ซึ่งถูกต้องตามที่ทดสอบ
- [ ] F12 → ไอคอนมือถือ (`Ctrl + Shift + M`) เลือก iPhone → เมนูซ้ายซ่อน กดปุ่ม ☰ เมนูเลื่อนออกมา การ์ด Login ไม่ล้นจอ (Responsive)
- [ ] Network → กดเข้าสู่ระบบ เห็น request `login` ไป `/api/auth/login` status 200

### เทียบกับเฉลย

| ไฟล์ | เทียบกับ `project/frontend` |
|---|---|
| `vite.config.js` `index.html` `style.css` `main.js` `api.js` | เหมือนทุกบรรทัด |
| `LoginPage.vue` `PasswordPage.vue` `ProfilePage.vue` | เหมือนทุกบรรทัด |
| `router.js` | ส่วน `homeOf` และ `beforeEach` เหมือน ต่างแค่รายการ `routes` |
| `App.vue` | เหมือน ต่างแค่ `menus` |
| `HomePage.vue` | มีเฉพาะเล่มซ้อมนี้ |

## ไปต่อคู่มือหลัก (ขั้น 6–7)

1. สร้างหน้าชั่วคราวให้ครบทุกหน้าที่ router เต็มอ้างถึง **ก่อน** แก้ router (ใช้เนื้อหาแบบ L2.2): `DashboardPage.vue` `UsersPage.vue` `PeriodsPage.vue` `CriteriaPage.vue` `AssignPage.vue` `TrackPage.vue` `BackupPage.vue` `ResultPage.vue` `SelfPage.vue` `EvaluateListPage.vue` `EvaluatePage.vue`
2. เขียนทับ `router.js` และ `App.vue` ด้วยตัวเต็มจากคู่มือหลักข้อ 5.7 และ 5.8
3. ลบ `HomePage.vue` ทิ้ง
4. ทำ ✔ ตรวจ L2 ซ้ำ (ต้องไม่มีตัวแดง) แล้วค่อยเขียนหน้าจริงทีละหน้าตามคู่มือหลักขั้น 6–7

## ปัญหาที่เจอบ่อยในเล่มนี้

| อาการ | สาเหตุ | วิธีแก้ |
|---|---|---|
| หน้าขาว Console `Failed to resolve import "./pages/XxxPage.vue"` | router อ้างหน้าที่ยังไม่ได้สร้าง หรือสะกดชื่อไฟล์ผิด (ตัวพิมพ์เล็กใหญ่ต้องตรง) | สร้างไฟล์หน้าชั่วคราวตาม L2.2 |
| หน้าขาว Console `Failed to resolve import "./components/HelloWorld.vue"` | ยังไม่ได้เขียนทับ `App.vue` หลังลบ HelloWorld | ทำ L1.6 |
| ปุ่มไม่มีสี ฟอร์มไม่สวย | ไม่ได้ `import 'vuetify/styles'` หรือ CSS ตัวอย่างของ Vite ยังอยู่ | ตรวจ `main.js` และเขียนทับ `style.css` ตาม L1.5 |
| `Failed to resolve component: v-btn` | ไม่ได้ `.use(vuetify)` | ตรวจ `main.js` |
| กดเข้าสู่ระบบแล้ว snackbar "เชื่อมต่อ API ไม่ได้" หรือ Network ขึ้น 500/502 | Back-end ไม่ได้เปิด | ทำ L0 ใหม่ ตรวจ http://localhost:3000/api/auth/me |
| login รหัสถูกแต่ขึ้น "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" | เคยเปลี่ยนรหัสไปแล้ว หรือฐานข้อมูลเก่าค้าง | ใช้ `newpass123` หรือ `docker compose down -v` แล้วเปิดใหม่ตาม L0 |
| `Port 5173 is already in use` | เปิด `frontend` ของเฉลยค้างไว้ หรือรัน `npm run dev` ซ้ำสองหน้าต่าง | ที่โฟลเดอร์ `project` พิมพ์ `docker compose stop frontend` หรือปิด Terminal เก่า |
