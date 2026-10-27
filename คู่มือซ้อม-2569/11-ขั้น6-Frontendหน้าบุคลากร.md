# 11 ขั้น 6 Front-end หน้าฝ่ายบุคลากร (คนที่ 2)

ทุกหน้าเขียนรูปแบบเดียวกัน จำโครงนี้ไว้

```vue
<template>
  <!-- ส่วนหน้าจอ: ใช้ component ของ Vuetify -->
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { api, state, rules } from '../api';

const list = ref([]);                 // ข้อมูลที่แสดง
async function load() {               // โหลดข้อมูลจาก API
  list.value = (await api.get('/...')).data;
}
onMounted(load);                      // เปิดหน้าแล้วโหลดทันที
</script>
```

ฟอร์มที่มีการตรวจข้อมูล: ใส่ `ref="formRef"` ที่ `<v-form>` แล้วเรียก `const { valid } = await formRef.value.validate()` ก่อนส่ง

## 6.1 `pages/DashboardPage.vue` (ข้อ 8.1)

ไฟล์ `frontend/src/pages/DashboardPage.vue`

```vue
<template>
  <h2 class="mb-4">Dashboard</h2>
  <v-row>
    <v-col v-for="c in cards" :key="c.title" cols="12" sm="6" md="3">
      <v-card :color="c.color" variant="tonal" class="pa-4">
        <div class="text-h4">{{ c.value }}</div>
        <div>{{ c.title }}</div>
      </v-card>
    </v-col>
  </v-row>

  <v-card class="pa-4 mt-4">
    <v-card-title>สถานะการประเมินของกรรมการ</v-card-title>
    <div v-for="s in statusList" :key="s.key" class="mb-3">
      {{ statusNames[s.key] }}: {{ s.total }} งาน
      <v-progress-linear :model-value="(s.total / allJobs) * 100" :color="statusColors[s.key]" height="12" />
    </div>
  </v-card>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { api, statusNames, statusColors } from '../api';

const data = ref({ users: [], status: [], periods: 0 });

onMounted(async () => {
  data.value = (await api.get('/reports/dashboard')).data;
});

// นับจำนวนจากผลที่ API ส่งมา
function count(list, key, value) {
  const row = list.find((r) => r[key] === value);
  return row ? row.total : 0;
}

const cards = computed(() => [
  { title: 'รอบการประเมิน', value: data.value.periods, color: 'primary' },
  { title: 'ผู้รับการประเมิน', value: count(data.value.users, 'role', 'evaluatee'), color: 'teal' },
  { title: 'กรรมการ', value: count(data.value.users, 'role', 'evaluator'), color: 'indigo' },
  { title: 'ยืนยันผลแล้ว', value: count(data.value.status, 'status', 'confirmed'), color: 'green' },
]);

const statusList = computed(() =>
  ['pending', 'draft', 'confirmed'].map((key) => ({ key, total: count(data.value.status, 'status', key) })),
);
const allJobs = computed(() => statusList.value.reduce((sum, s) => sum + s.total, 0) || 1);
</script>
```

## 6.2 `pages/UsersPage.vue` — เพิ่ม/แก้/ลบผู้ใช้ + รีเซ็ตรหัส (ข้อ 5.1.5–5.1.7)

ไฟล์ `frontend/src/pages/UsersPage.vue`

```vue
<template>
  <h2 class="mb-4">ผู้ใช้งาน (ผู้รับการประเมิน / กรรมการ)</h2>

  <!-- ฟอร์มเพิ่ม/แก้ไข -->
  <v-card class="pa-4 mb-4">
    <v-card-title>{{ form.id ? 'แก้ไขผู้ใช้' : 'เพิ่มผู้ใช้' }}</v-card-title>
    <v-form ref="formRef" @submit.prevent="save">
      <v-row>
        <v-col cols="12" md="6">
          <v-text-field v-model="form.username" label="ชื่อผู้ใช้" :disabled="!!form.id" :rules="[rules.required]" />
        </v-col>
        <v-col cols="12" md="6">
          <v-text-field v-if="!form.id" v-model="form.password" label="รหัสผ่านเริ่มต้น" :rules="[rules.min8]" />
        </v-col>
        <v-col cols="12" md="6">
          <v-text-field v-model="form.full_name" label="ชื่อ-นามสกุล" :rules="[rules.required]" />
        </v-col>
        <v-col cols="12" md="6">
          <v-select v-model="form.role" label="บทบาท" :items="roles" :rules="[rules.required]" />
        </v-col>
        <v-col cols="12" md="6">
          <v-text-field v-model="form.email" label="อีเมล" :rules="[rules.email]" />
        </v-col>
        <v-col cols="12" md="6">
          <v-text-field v-model="form.department" label="แผนก/หน่วยงาน" />
        </v-col>
      </v-row>
      <v-btn type="submit" color="primary" class="mr-2">บันทึก</v-btn>
      <v-btn @click="clear">ล้างฟอร์ม</v-btn>
    </v-form>
  </v-card>

  <!-- ตารางผู้ใช้ -->
  <v-table>
    <thead>
      <tr><th>ชื่อผู้ใช้</th><th>ชื่อ-นามสกุล</th><th>บทบาท</th><th>อีเมล</th><th>จัดการ</th></tr>
    </thead>
    <tbody>
      <tr v-for="u in users" :key="u.id">
        <td>{{ u.username }}</td>
        <td>{{ u.full_name }}</td>
        <td>{{ roleNames[u.role] }}</td>
        <td>{{ u.email }}</td>
        <td>
          <template v-if="u.role !== 'admin'">
            <v-btn size="small" @click="form = { ...u }">แก้ไข</v-btn>
            <v-btn size="small" color="orange" @click="resetPassword(u)">รีเซ็ตรหัส</v-btn>
            <v-btn size="small" color="red" @click="remove(u)">ลบ</v-btn>
          </template>
        </td>
      </tr>
    </tbody>
  </v-table>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { api, state, rules, roleNames } from '../api';

const users = ref([]);
const formRef = ref();
const form = ref({});
const roles = [
  { title: 'ผู้รับการประเมิน', value: 'evaluatee' },
  { title: 'กรรมการ', value: 'evaluator' },
];

async function load() {
  users.value = (await api.get('/users')).data;
}
onMounted(load);

function clear() {
  form.value = {};
  formRef.value.resetValidation();
}

async function save() {
  const { valid } = await formRef.value.validate();
  if (!valid) return;
  const res = form.value.id
    ? await api.put('/users/' + form.value.id, form.value)
    : await api.post('/users', form.value);
  state.message = res.message;
  clear();
  load();
}

async function resetPassword(u) {
  const password = prompt('รหัสผ่านใหม่ของ ' + u.full_name + ' (อย่างน้อย 8 ตัว)');
  if (!password) return;
  const res = await api.put('/users/' + u.id + '/reset-password', { password });
  state.message = res.message;
}

async function remove(u) {
  if (!confirm('ลบ ' + u.full_name + ' ?')) return;
  const res = await api.delete('/users/' + u.id);
  state.message = res.message;
  load();
}
</script>
```

## 6.3 `pages/PeriodsPage.vue` — รอบการประเมิน (ข้อ 5.1.2)

ไฟล์ `frontend/src/pages/PeriodsPage.vue`

```vue
<template>
  <h2 class="mb-4">รอบการประเมิน</h2>

  <v-card class="pa-4 mb-4">
    <v-card-title>{{ form.id ? 'แก้ไขรอบ' : 'สร้างรอบใหม่' }}</v-card-title>
    <v-form ref="formRef" @submit.prevent="save">
      <v-row>
        <v-col cols="12" md="6">
          <v-text-field v-model="form.name" label="ชื่อรอบ / หัวข้อการประเมิน" :rules="[rules.required]" />
        </v-col>
        <v-col cols="6" md="3">
          <v-text-field v-model="form.start_date" label="วันเริ่ม" type="date" :rules="[rules.required]" />
        </v-col>
        <v-col cols="6" md="3">
          <v-text-field v-model="form.end_date" label="วันสิ้นสุด" type="date" :rules="[rules.required]" />
        </v-col>
      </v-row>
      <v-btn type="submit" color="primary" class="mr-2">บันทึก</v-btn>
      <v-btn @click="form = {}">ล้างฟอร์ม</v-btn>
    </v-form>
  </v-card>

  <v-table>
    <thead>
      <tr><th>ชื่อรอบ</th><th>วันเริ่ม</th><th>วันสิ้นสุด</th><th>จัดการ</th></tr>
    </thead>
    <tbody>
      <tr v-for="p in periods" :key="p.id">
        <td>{{ p.name }}</td>
        <td>{{ p.start_date }}</td>
        <td>{{ p.end_date }}</td>
        <td>
          <v-btn size="small" color="primary" :to="'/periods/' + p.id">หัวข้อ/ตัวชี้วัด</v-btn>
          <v-btn size="small" @click="form = { ...p }">แก้ไข</v-btn>
          <v-btn size="small" color="red" @click="remove(p)">ลบ</v-btn>
        </td>
      </tr>
    </tbody>
  </v-table>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { api, state, rules } from '../api';

const periods = ref([]);
const formRef = ref();
const form = ref({});

async function load() {
  periods.value = (await api.get('/periods')).data;
}
onMounted(load);

async function save() {
  const { valid } = await formRef.value.validate();
  if (!valid) return;
  const res = form.value.id
    ? await api.put('/periods/' + form.value.id, form.value)
    : await api.post('/periods', form.value);
  state.message = res.message;
  form.value = {};
  formRef.value.resetValidation();
  load();
}

async function remove(p) {
  if (!confirm('ลบรอบ ' + p.name + ' ? (หัวข้อและตัวชี้วัดจะหายด้วย)')) return;
  const res = await api.delete('/periods/' + p.id);
  state.message = res.message;
  load();
}
</script>
```

## 6.4 `pages/CriteriaPage.vue` — หัวข้อและตัวชี้วัด (ข้อ 5.1.1, 5.1.3, 5.1.4)

ไฟล์ `frontend/src/pages/CriteriaPage.vue`

```vue
<template>
  <v-btn to="/periods" prepend-icon="mdi-arrow-left" variant="text">กลับ</v-btn>
  <h2 class="mb-4">{{ period.name }} ({{ period.start_date }} ถึง {{ period.end_date }})</h2>

  <!-- เพิ่มหัวข้อ -->
  <v-card class="pa-4 mb-4">
    <v-card-title>เพิ่มหัวข้อการประเมิน</v-card-title>
    <v-form ref="topicRef" @submit.prevent="addTopic" class="d-flex ga-2">
      <v-text-field v-model="topicName" label="ชื่อหัวข้อ" :rules="[rules.required]" />
      <v-btn type="submit" color="primary" class="mt-2">เพิ่ม</v-btn>
    </v-form>
  </v-card>

  <!-- เพิ่ม/แก้ไขตัวชี้วัด -->
  <v-card class="pa-4 mb-4">
    <v-card-title>{{ item.id ? 'แก้ไขตัวชี้วัด' : 'เพิ่มตัวชี้วัด' }}</v-card-title>
    <v-form ref="itemRef" @submit.prevent="saveItem">
      <v-row>
        <v-col cols="12" md="6">
          <v-select
            v-model="item.topic_id"
            label="หัวข้อ"
            :items="period.topics"
            item-title="name"
            item-value="id"
            :disabled="!!item.id"
            :rules="[rules.required]"
          />
        </v-col>
        <v-col cols="12" md="6">
          <v-text-field v-model="item.name" label="ชื่อตัวชี้วัด" :rules="[rules.required]" />
        </v-col>
        <v-col cols="12">
          <v-textarea v-model="item.detail" label="รายละเอียด" rows="2" />
        </v-col>
        <v-col cols="12" md="4">
          <v-text-field v-model.number="item.weight" label="น้ำหนักคะแนน" type="number" :rules="[rules.required]" />
        </v-col>
        <v-col cols="12" md="4">
          <v-select v-model="item.score_type" label="รูปแบบการประเมิน" :items="types" :rules="[rules.required]" />
        </v-col>
        <v-col cols="12" md="4">
          <v-text-field v-model="item.evidence" label="หลักฐานที่ใช้แนบ" />
        </v-col>
      </v-row>
      <!-- คำอธิบายระดับ เมื่อเลือกแบบสเกล -->
      <v-alert v-if="item.score_type === 'scale'" type="info" variant="tonal" class="mb-4">
        ระดับ 1 = ต่ำกว่าที่คาดหวังมาก, 2 = ต่ำกว่าที่คาดหวัง, 3 = ตามที่คาดหวัง, 4 = สูงกว่าที่คาดหวัง
      </v-alert>
      <v-btn type="submit" color="primary" class="mr-2">บันทึกตัวชี้วัด</v-btn>
      <v-btn @click="item = { weight: 1, score_type: 'scale' }">ล้างฟอร์ม</v-btn>
    </v-form>
  </v-card>

  <!-- หัวข้อและตัวชี้วัดทั้งหมด -->
  <v-card v-for="t in period.topics" :key="t.id" class="pa-4 mb-4">
    <v-card-title class="d-flex flex-wrap ga-2">
      {{ t.name }}
      <v-spacer />
      <v-btn size="small" @click="renameTopic(t)">แก้ชื่อ</v-btn>
      <v-btn size="small" color="red" @click="removeTopic(t)">ลบหัวข้อ</v-btn>
    </v-card-title>
    <v-table>
      <thead>
        <tr><th>ตัวชี้วัด</th><th>น้ำหนัก</th><th>รูปแบบ</th><th>หลักฐาน</th><th>จัดการ</th></tr>
      </thead>
      <tbody>
        <tr v-for="i in t.indicators" :key="i.id">
          <td>{{ i.name }}<br /><small>{{ i.detail }}</small></td>
          <td>{{ i.weight }}</td>
          <td>{{ i.score_type === 'yesno' ? 'มี/ไม่มี' : 'สเกล 1-4' }}</td>
          <td>{{ i.evidence }}</td>
          <td>
            <v-btn size="small" @click="item = { ...i }">แก้ไข</v-btn>
            <v-btn size="small" color="red" @click="removeItem(i)">ลบ</v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>
  </v-card>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { api, state, rules } from '../api';

const route = useRoute();
const period = ref({ topics: [] });
const topicRef = ref();
const itemRef = ref();
const topicName = ref('');
const item = ref({ weight: 1, score_type: 'scale' });
const types = [
  { title: 'มี / ไม่มี', value: 'yesno' },
  { title: 'สเกลคะแนน 1-4', value: 'scale' },
];

async function load() {
  period.value = (await api.get('/periods/' + route.params.id)).data;
}
onMounted(load);

async function addTopic() {
  const { valid } = await topicRef.value.validate();
  if (!valid) return;
  const res = await api.post('/topics', { period_id: period.value.id, name: topicName.value });
  state.message = res.message;
  topicName.value = '';
  topicRef.value.resetValidation();
  load();
}

async function renameTopic(t) {
  const name = prompt('ชื่อหัวข้อใหม่', t.name);
  if (!name) return;
  await api.put('/topics/' + t.id, { name });
  load();
}

async function removeTopic(t) {
  if (!confirm('ลบหัวข้อ ' + t.name + ' และตัวชี้วัดทั้งหมดในหัวข้อ?')) return;
  await api.delete('/topics/' + t.id);
  load();
}

async function saveItem() {
  const { valid } = await itemRef.value.validate();
  if (!valid) return;
  const res = item.value.id
    ? await api.put('/indicators/' + item.value.id, item.value)
    : await api.post('/indicators', item.value);
  state.message = res.message;
  item.value = { weight: 1, score_type: 'scale' };
  itemRef.value.resetValidation();
  load();
}

async function removeItem(i) {
  if (!confirm('ลบตัวชี้วัด ' + i.name + ' ?')) return;
  await api.delete('/indicators/' + i.id);
  load();
}
</script>
```

## 6.5 `pages/AssignPage.vue` — มอบหมายกรรมการ (ข้อ 5.1.8–5.1.9)

ไฟล์ `frontend/src/pages/AssignPage.vue`

```vue
<template>
  <h2 class="mb-4">มอบหมายกรรมการ</h2>

  <v-card class="pa-4 mb-4">
    <v-form ref="formRef" @submit.prevent="assign">
      <v-row>
        <v-col cols="12" md="6">
          <v-select v-model="form.period_id" label="รอบการประเมิน" :items="periods" item-title="name" item-value="id"
            :rules="[rules.required]" @update:model-value="load" />
        </v-col>
        <v-col cols="12" md="6">
          <v-select v-model="form.evaluatee_id" label="ผู้รับการประเมิน" :items="evaluatees" item-title="full_name"
            item-value="id" :rules="[rules.required]" />
        </v-col>
        <v-col cols="12" md="6">
          <v-select v-model="form.evaluator_id" label="กรรมการ" :items="evaluators" item-title="full_name"
            item-value="id" :rules="[rules.required]" />
        </v-col>
        <v-col cols="12" md="6">
          <v-select v-model="form.committee_role" label="บทบาทกรรมการ" :items="roles" :rules="[rules.required]" />
        </v-col>
      </v-row>
      <v-btn type="submit" color="primary">มอบหมาย</v-btn>
    </v-form>
  </v-card>

  <v-table v-if="form.period_id">
    <thead>
      <tr><th>ผู้รับการประเมิน</th><th>กรรมการ</th><th>บทบาท</th><th>สถานะ</th><th></th></tr>
    </thead>
    <tbody>
      <tr v-for="a in list" :key="a.id">
        <td>{{ a.evaluatee_name }}</td>
        <td>{{ a.evaluator_name }}</td>
        <td>{{ committeeNames[a.committee_role] }}</td>
        <td><v-chip :color="statusColors[a.status]">{{ statusNames[a.status] }}</v-chip></td>
        <td><v-btn size="small" color="red" @click="remove(a)">ยกเลิก</v-btn></td>
      </tr>
    </tbody>
  </v-table>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { api, state, rules, committeeNames, statusNames, statusColors } from '../api';

const formRef = ref();
const form = ref({ committee_role: 'member' });
const periods = ref([]);
const evaluatees = ref([]);
const evaluators = ref([]);
const list = ref([]);
const roles = [
  { title: 'ประธาน', value: 'chair' },
  { title: 'กรรมการร่วม', value: 'member' },
];

onMounted(async () => {
  periods.value = (await api.get('/periods')).data;
  evaluatees.value = (await api.get('/users?role=evaluatee')).data;
  evaluators.value = (await api.get('/users?role=evaluator')).data;
});

// โหลดรายการมอบหมายของรอบที่เลือก
async function load() {
  list.value = (await api.get('/assignments?period_id=' + form.value.period_id)).data;
}

async function assign() {
  const { valid } = await formRef.value.validate();
  if (!valid) return;
  const res = await api.post('/assignments', form.value);
  state.message = res.message;
  load();
}

async function remove(a) {
  if (!confirm('ยกเลิกการมอบหมาย ' + a.evaluator_name + ' ?')) return;
  await api.delete('/assignments/' + a.id);
  load();
}
</script>
```

## 6.6 `pages/TrackPage.vue` — ติดตามสถานะ ร้อยละ สรุปรายกรรมการ (ข้อ 5.1.10–5.1.12)

ไฟล์ `frontend/src/pages/TrackPage.vue`

```vue
<template>
  <h2 class="mb-4">ติดตามสถานะและรายงานผล</h2>
  <v-select v-model="periodId" label="เลือกรอบการประเมิน" :items="periods" item-title="name" item-value="id"
    @update:model-value="load" />

  <template v-if="report">
    <!-- รายผู้รับการประเมิน -->
    <h3 class="my-4">สรุปรายผู้รับการประเมิน (ตัวชี้วัดทั้งหมด {{ report.indicators }} ข้อ)</h3>
    <v-table>
      <thead>
        <tr><th>ผู้รับการประเมิน</th><th>ร้อยละการบันทึกข้อมูล</th><th>กรรมการ / สถานะ / คะแนน</th><th></th></tr>
      </thead>
      <tbody>
        <tr v-for="p in report.evaluatees" :key="p.id">
          <td>{{ p.full_name }}</td>
          <td style="min-width: 140px">
            {{ p.progress }}%
            <v-progress-linear :model-value="p.progress" color="teal" height="8" />
          </td>
          <td>
            <div v-for="c in p.committees" :key="c.id" class="my-1">
              {{ c.evaluator_name }} ({{ committeeNames[c.committee_role] }})
              <v-chip size="small" :color="statusColors[c.status]">{{ statusNames[c.status] }}</v-chip>
              {{ c.percent === null ? '' : c.percent + '%' }}
            </div>
          </td>
          <td><v-btn size="small" color="primary" :to="'/result/' + periodId + '/' + p.id">รายงานรายบุคคล</v-btn></td>
        </tr>
      </tbody>
    </v-table>

    <!-- รายกรรมการ -->
    <h3 class="my-4">สรุปรายกรรมการ</h3>
    <v-table>
      <thead>
        <tr><th>กรรมการ</th><th>ได้รับมอบหมาย</th><th>ยืนยันผลแล้ว</th></tr>
      </thead>
      <tbody>
        <tr v-for="v in report.evaluators" :key="v.id">
          <td>{{ v.full_name }}</td>
          <td>{{ v.total }} คน</td>
          <td>{{ v.confirmed }} คน</td>
        </tr>
      </tbody>
    </v-table>
  </template>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { api, committeeNames, statusNames, statusColors } from '../api';

const periods = ref([]);
const periodId = ref(null);
const report = ref(null);

onMounted(async () => {
  periods.value = (await api.get('/periods')).data;
});

async function load() {
  report.value = (await api.get('/reports/periods/' + periodId.value)).data;
}
</script>
```

## 6.7 `pages/ResultPage.vue` — รายงานรายบุคคล + Export PDF (ข้อ 5.1.13, 5.2.8, 8.5)

ไฟล์ `frontend/src/pages/ResultPage.vue`

```vue
<template>
  <div class="no-print mb-4">
    <v-btn prepend-icon="mdi-arrow-left" variant="text" @click="$router.back()">กลับ</v-btn>
    <v-btn color="primary" prepend-icon="mdi-file-pdf-box" @click="exportPdf">Export PDF</v-btn>
  </div>

  <!-- ส่วนนี้คือสิ่งที่จะถูกบันทึกเป็น PDF -->
  <div v-if="data" ref="paper" class="pa-2">
    <h2>รายงานผลการประเมินรายบุคคล</h2>
    <p>ชื่อ: {{ data.evaluatee.full_name }} {{ data.evaluatee.department }}</p>
    <p>รอบ: {{ data.period.name }} ({{ data.period.start_date }} ถึง {{ data.period.end_date }})</p>
    <p class="text-h6 my-2">คะแนนรวม: {{ data.total === null ? 'ยังไม่มีผลที่ยืนยัน' : data.total + '%' }}</p>

    <v-table density="compact" class="my-4">
      <thead>
        <tr>
          <th>หัวข้อ / ตัวชี้วัด</th>
          <th>น้ำหนัก</th>
          <th>ประเมินตนเอง</th>
          <th v-for="c in data.committees" :key="c.id">{{ c.full_name }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="i in data.indicators" :key="i.id">
          <td>{{ i.topic_name }} / {{ i.name }}</td>
          <td>{{ i.weight }}</td>
          <td>{{ i.self_score ?? '-' }}</td>
          <td v-for="c in data.committees" :key="c.id">{{ scoreOf(c, i) }}</td>
        </tr>
      </tbody>
    </v-table>

    <h3>ผลของกรรมการ</h3>
    <div v-for="c in data.committees" :key="c.id" class="my-3">
      <strong>{{ c.full_name }} ({{ committeeNames[c.committee_role] }})</strong>
      : {{ statusNames[c.status] }} {{ c.percent === null ? '' : '· ' + c.percent + '%' }}
      <p>ความคิดเห็น: {{ c.comment || '-' }}</p>
      <img v-if="c.signature && c.status === 'confirmed'" :src="fileUrl(c.signature)" height="60" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import html2pdf from 'html2pdf.js';
import { api, fileUrl, committeeNames, statusNames } from '../api';

const route = useRoute();
const data = ref(null);
const paper = ref();

onMounted(async () => {
  data.value = (await api.get('/reports/result/' + route.params.periodId + '/' + route.params.userId)).data;
});

function scoreOf(committee, indicator) {
  const s = committee.scores.find((x) => x.indicator_id === indicator.id);
  return s ? s.score : '-';
}

// แปลงส่วนรายงานเป็นไฟล์ PDF แล้วดาวน์โหลด
function exportPdf() {
  html2pdf().from(paper.value).save('result-' + data.value.evaluatee.full_name + '.pdf');
}
</script>
```

## 6.8 `pages/BackupPage.vue` — สำรอง/กู้คืน (ข้อ 8.4)

ไฟล์ `frontend/src/pages/BackupPage.vue`

```vue
<template>
  <h2 class="mb-4">สำรองและกู้คืนข้อมูล</h2>
  <v-row>
    <v-col cols="12" md="6">
      <v-card class="pa-4">
        <v-card-title>สำรองข้อมูล (Backup)</v-card-title>
        <p class="mb-4">ดาวน์โหลดข้อมูลทุกตารางเป็นไฟล์ backup.json</p>
        <v-btn color="primary" prepend-icon="mdi-download" :href="backupUrl">ดาวน์โหลด</v-btn>
      </v-card>
    </v-col>
    <v-col cols="12" md="6">
      <v-card class="pa-4">
        <v-card-title>กู้คืนข้อมูล (Restore)</v-card-title>
        <v-file-input v-model="file" label="เลือกไฟล์ backup.json" accept=".json" />
        <v-btn color="red" prepend-icon="mdi-upload" @click="restore">กู้คืน</v-btn>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup>
import { ref } from 'vue';
import { api, state } from '../api';

const file = ref(null);
const backupUrl = '/api/backup?token=' + localStorage.getItem('token');

async function restore() {
  if (!file.value) return (state.message = 'เลือกไฟล์ก่อน');
  if (!confirm('ข้อมูลปัจจุบันจะถูกแทนที่ทั้งหมด ยืนยัน?')) return;
  const json = JSON.parse(await file.value.text()); // อ่านไฟล์เป็นข้อความ แล้วแปลงเป็น object
  const res = await api.post('/backup/restore', json);
  state.message = res.message;
}
</script>
```

## ✔ ตรวจขั้น 6 (Login admin)

เปิดระบบครบทุกบริการ `docker compose up -d` แล้วเข้า http://localhost:5173 ด้วย `admin` / `admin1234` ทำตามลำดับ

1. Dashboard: เห็นการ์ด 4 ใบ (รอบ, ผู้รับ, กรรมการ, ยืนยันผลแล้ว) และแถบสถานะ 3 แถบ (ข้อ 8.1)
2. ผู้ใช้งาน: เพิ่มผู้ใช้โดยกรอกอีเมลผิด → ช่องอีเมลขึ้นสีแดง ส่งไม่ได้ (Validate ข้อ 8.2) → แก้อีเมลให้ถูกแล้วบันทึก → ผู้ใช้ใหม่ขึ้นในตาราง → กด "รีเซ็ตรหัส" ของคนนั้น → กรอกรหัสใหม่อย่างน้อย 8 ตัวในกล่องที่เด้งขึ้น → snackbar แจ้งสำเร็จ (ข้อ 5.1.7)
3. รอบและตัวชี้วัด → สร้างรอบ (ลองให้วันสิ้นสุดก่อนวันเริ่ม ต้องขึ้น "วันสิ้นสุดต้องไม่ก่อนวันเริ่ม") → กด "หัวข้อ/ตัวชี้วัด" → เพิ่มหัวข้อ → เพิ่มตัวชี้วัดทั้งแบบ มี/ไม่มี และ สเกล 1–4
4. มอบหมายกรรมการ: เลือกรอบ ผู้รับ กรรมการ บทบาท → เห็นตารางพร้อมสถานะ "ยังไม่ได้ประเมิน" → ลองมอบหมายประธานซ้ำให้ผู้รับคนเดิม → snackbar "ผู้รับคนนี้มีประธานแล้ว"
5. ติดตามและรายงาน: เลือกรอบ → เห็นร้อยละการบันทึกของผู้รับ และสถานะกรรมการแต่ละคน → กด "รายงานรายบุคคล" → กด Export PDF ได้ไฟล์ `.pdf` ในโฟลเดอร์ Downloads (ข้อ 8.5)
6. สำรองข้อมูล: กดดาวน์โหลด ได้ `backup.json` → ไปลบรอบที่สร้างในข้อ 3 → กลับมาเลือกไฟล์ backup.json แล้วกดกู้คืน → รอบกลับมาครบพร้อมหัวข้อและตัวชี้วัด (ข้อ 8.4)
7. กด F12 → Console ไม่มีตัวแดงระหว่างกดทุกหน้า
