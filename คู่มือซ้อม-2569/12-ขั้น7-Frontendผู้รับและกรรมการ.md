# 12 ขั้น 7 Front-end หน้าผู้รับการประเมิน และกรรมการ (คนที่ 2)

## 7.1 `pages/SelfPage.vue` — ประเมินตนเอง (ข้อ 5.2.3–5.2.9)

- เลือกรอบ → แสดงความก้าวหน้า (แถบเขียว)
- ตัวชี้วัดแต่ละข้อ: เลือกคะแนน + บันทึก, รายการรายละเอียด (แก้ ✎ / ลบ 🗑), ฟอร์มเพิ่มรายละเอียด + URL + ไฟล์
- การส่งไฟล์ต้องใช้ `FormData` (ไม่ใช่ JSON)

ไฟล์ `frontend/src/pages/SelfPage.vue`

```vue
<template>
  <h2 class="mb-4">ประเมินตนเอง</h2>
  <v-select v-model="periodId" label="เลือกรอบการประเมิน" :items="periods" item-title="name" item-value="id"
    @update:model-value="load" />

  <template v-if="data">
    <!-- ความก้าวหน้า -->
    <v-card class="pa-4 mb-4">
      <div class="mb-2">ความก้าวหน้า (กรอกคะแนนและรายละเอียดแล้ว): {{ data.progress }}%</div>
      <v-progress-linear :model-value="data.progress" color="teal" height="14" />
      <v-alert v-if="!data.can_edit" type="warning" class="mt-4">{{ data.lock_reason }}</v-alert>
      <v-btn class="mt-4" color="primary" prepend-icon="mdi-file-pdf-box"
        :to="'/result/' + periodId + '/' + state.user.id">ดูรายงาน / Export PDF</v-btn>
    </v-card>

    <!-- ตัวชี้วัดแต่ละข้อ -->
    <v-card v-for="item in data.indicators" :key="item.id" class="pa-4 mb-4">
      <v-card-title class="text-wrap">{{ item.topic_name }} / {{ item.name }}</v-card-title>
      <v-card-subtitle class="text-wrap">
        {{ item.detail }} · น้ำหนัก {{ item.weight }} · หลักฐาน: {{ item.evidence || '-' }}
      </v-card-subtitle>

      <!-- คะแนนตนเอง -->
      <div class="d-flex ga-2 mt-4">
        <ScoreSelect v-model="item.my_score" :type="item.score_type" label="คะแนนตนเอง" :disabled="!data.can_edit" />
        <v-btn color="primary" class="mt-2" :disabled="!data.can_edit" @click="saveScore(item)">บันทึก</v-btn>
      </div>

      <!-- รายละเอียดที่เพิ่มไว้ (ได้หลายรายการ) -->
      <v-list density="compact">
        <v-list-item v-for="d in item.details" :key="d.id">
          <v-list-item-title class="text-wrap">{{ d.detail }}</v-list-item-title>
          <a v-if="d.url" :href="d.url" target="_blank" class="mr-3">เปิดลิงก์</a>
          <a v-if="d.file_name" :href="fileUrl(d.file_name)">ดาวน์โหลดไฟล์</a>
          <template #append v-if="data.can_edit">
            <v-btn size="small" icon="mdi-pencil" variant="text" @click="editDetail(d)" />
            <v-btn size="small" icon="mdi-delete" variant="text" color="red" @click="removeDetail(d)" />
          </template>
        </v-list-item>
      </v-list>

      <!-- เพิ่มรายละเอียด + แนบหลักฐาน -->
      <v-row v-if="data.can_edit">
        <v-col cols="12" md="4">
          <v-text-field v-model="forms[item.id].detail" label="รายละเอียดประกอบ" />
        </v-col>
        <v-col cols="12" md="3">
          <v-text-field v-model="forms[item.id].url" label="URL หลักฐาน (ถ้ามี)" />
        </v-col>
        <v-col cols="12" md="3">
          <v-file-input v-model="forms[item.id].file" label="ไฟล์ PDF/รูป" accept=".pdf,.png,.jpg,.jpeg" />
        </v-col>
        <v-col cols="12" md="2">
          <v-btn color="primary" class="mt-2" @click="addDetail(item)">เพิ่ม</v-btn>
        </v-col>
      </v-row>
    </v-card>

    <!-- ความคิดเห็นกรรมการ -->
    <v-card class="pa-4">
      <v-card-title>ความคิดเห็นของกรรมการ</v-card-title>
      <p v-for="c in data.committees" :key="c.full_name" class="mb-2">
        <strong>{{ c.full_name }} ({{ committeeNames[c.committee_role] }})</strong>:
        {{ c.comment || 'ยังไม่ได้ยืนยันผล' }}
      </p>
    </v-card>
  </template>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { api, state, fileUrl, committeeNames } from '../api';
import ScoreSelect from '../components/ScoreSelect.vue';

const periods = ref([]);
const periodId = ref(null);
const data = ref(null);
const forms = ref({}); // ฟอร์มเพิ่มรายละเอียดของแต่ละตัวชี้วัด

onMounted(async () => {
  periods.value = (await api.get('/self/periods')).data;
});

async function load() {
  data.value = (await api.get('/self/periods/' + periodId.value)).data;
  for (const item of data.value.indicators) {
    forms.value[item.id] = { detail: '', url: '', file: null };
  }
}

async function saveScore(item) {
  if (item.my_score === null) return (state.message = 'เลือกคะแนนก่อน');
  const res = await api.put('/self/scores', { indicator_id: item.id, score: item.my_score });
  state.message = res.message;
  load();
}

async function addDetail(item) {
  const f = forms.value[item.id];
  if (!f.detail) return (state.message = 'กรอกรายละเอียดก่อน');
  // ส่งไฟล์ต้องใช้ FormData
  const body = new FormData();
  body.append('indicator_id', item.id);
  body.append('detail', f.detail);
  body.append('url', f.url);
  if (f.file) body.append('file', f.file);
  const res = await api.post('/self/details', body);
  state.message = res.message;
  load();
}

async function editDetail(d) {
  const detail = prompt('แก้ไขรายละเอียด', d.detail);
  if (!detail) return;
  const res = await api.put('/self/details/' + d.id, { detail, url: d.url });
  state.message = res.message;
  load();
}

async function removeDetail(d) {
  if (!confirm('ลบรายละเอียดนี้?')) return;
  await api.delete('/self/details/' + d.id);
  load();
}
</script>
```

## 7.2 `pages/EvaluateListPage.vue` — รายชื่อที่ต้องประเมิน (ข้อ 5.3.1)

ไฟล์ `frontend/src/pages/EvaluateListPage.vue`

```vue
<template>
  <h2 class="mb-4">รายชื่อผู้ที่ต้องประเมิน</h2>
  <v-table>
    <thead>
      <tr><th>ผู้รับการประเมิน</th><th>แผนก</th><th>รอบ</th><th>บทบาทของฉัน</th><th>สถานะ</th><th></th></tr>
    </thead>
    <tbody>
      <tr v-for="a in list" :key="a.id">
        <td>{{ a.full_name }}</td>
        <td>{{ a.department }}</td>
        <td>{{ a.period_name }}</td>
        <td>{{ committeeNames[a.committee_role] }}</td>
        <td><v-chip :color="statusColors[a.status]">{{ statusNames[a.status] }}</v-chip></td>
        <td><v-btn size="small" color="primary" :to="'/evaluate/' + a.id">ประเมิน</v-btn></td>
      </tr>
    </tbody>
  </v-table>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { api, committeeNames, statusNames, statusColors } from '../api';

const list = ref([]);
onMounted(async () => {
  list.value = (await api.get('/evaluate')).data;
});
</script>
```

## 7.3 `pages/EvaluatePage.vue` — ให้คะแนน บันทึกร่าง ลงนาม ยืนยัน (ข้อ 5.3.2–5.3.10)

ไฟล์ `frontend/src/pages/EvaluatePage.vue`

```vue
<template>
  <v-btn to="/evaluate" prepend-icon="mdi-arrow-left" variant="text">กลับ</v-btn>
  <template v-if="data">
    <!-- ข้อมูลผู้รับการประเมิน -->
    <v-card class="pa-4 mb-4">
      <h2>{{ data.evaluatee.full_name }}</h2>
      <p>แผนก: {{ data.evaluatee.department || '-' }} · อีเมล: {{ data.evaluatee.email || '-' }}</p>
      <p>รอบ: {{ data.period.name }}</p>
      <v-chip class="mt-2" :color="statusColors[data.assignment.status]">{{ statusNames[data.assignment.status] }}</v-chip>
    </v-card>

    <!-- ตัวชี้วัด: รายละเอียด หลักฐาน คะแนนตนเอง และช่องให้คะแนน -->
    <v-card v-for="item in data.indicators" :key="item.id" class="pa-4 mb-4">
      <v-card-title class="text-wrap">{{ item.topic_name }} / {{ item.name }}</v-card-title>
      <v-card-subtitle class="text-wrap">{{ item.detail }} · น้ำหนัก {{ item.weight }}</v-card-subtitle>
      <p class="mt-2">คะแนนที่ประเมินตนเอง: <strong>{{ item.self_score ?? 'ยังไม่กรอก' }}</strong></p>
      <ul class="ml-6 my-2">
        <li v-for="d in item.details" :key="d.id">
          {{ d.detail }}
          <a v-if="d.url" :href="d.url" target="_blank">[ลิงก์]</a>
          <a v-if="d.file_name" :href="fileUrl(d.file_name)">[ไฟล์]</a>
        </li>
      </ul>
      <ScoreSelect v-model="item.score" :type="item.score_type" label="คะแนนจากกรรมการ" :disabled="locked" />
    </v-card>

    <!-- ตารางสรุป -->
    <v-card class="pa-4 mb-4">
      <v-card-title>สรุปผลการประเมิน</v-card-title>
      <v-table density="compact">
        <thead>
          <tr><th>ตัวชี้วัด</th><th>น้ำหนัก</th><th>ตนเอง</th><th>กรรมการ</th></tr>
        </thead>
        <tbody>
          <tr v-for="item in data.indicators" :key="item.id">
            <td>{{ item.name }}</td>
            <td>{{ item.weight }}</td>
            <td>{{ item.self_score ?? '-' }}</td>
            <td>{{ item.score ?? '-' }}</td>
          </tr>
        </tbody>
      </v-table>
      <p class="text-h6 mt-2">คะแนนรวม: {{ data.percent === null ? 'ยังให้คะแนนไม่ครบ' : data.percent + '%' }}</p>
    </v-card>

    <!-- ความคิดเห็น ลายเซ็น และปุ่ม -->
    <v-card class="pa-4">
      <v-textarea v-model="data.assignment.comment" label="ความคิดเห็นสรุปภาพรวม" :disabled="locked" />
      <v-btn color="orange" class="mb-4" :disabled="locked" @click="saveDraft">บันทึกร่าง</v-btn>

      <div class="d-flex ga-2">
        <v-file-input v-model="signature" label="ไฟล์ลายเซ็น (PNG/JPG)" accept=".png,.jpg,.jpeg" :disabled="locked" />
        <v-btn class="mt-2" :disabled="locked" @click="uploadSignature">แนบลายเซ็น</v-btn>
      </div>
      <img v-if="data.assignment.signature" :src="fileUrl(data.assignment.signature)" height="70" />

      <div class="mt-4">
        <v-btn color="green" :disabled="locked" @click="confirmResult">ยืนยันและส่งผล</v-btn>
      </div>
    </v-card>
  </template>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { api, state, fileUrl, statusNames, statusColors } from '../api';
import ScoreSelect from '../components/ScoreSelect.vue';

const route = useRoute();
const data = ref(null);
const signature = ref(null);
const locked = computed(() => data.value.assignment.status === 'confirmed'); // ยืนยันแล้วแก้ไม่ได้

async function load() {
  data.value = (await api.get('/evaluate/' + route.params.id)).data;
}
onMounted(load);

// บันทึกร่าง / แก้ไขร่าง: ส่งคะแนนทุกข้อและความคิดเห็นไปพร้อมกัน
async function saveDraft() {
  const scores = data.value.indicators.map((i) => ({ indicator_id: i.id, score: i.score }));
  const res = await api.put('/evaluate/' + route.params.id, { scores, comment: data.value.assignment.comment });
  state.message = res.message;
  load();
}

async function uploadSignature() {
  if (!signature.value) return (state.message = 'เลือกไฟล์ลายเซ็นก่อน');
  const body = new FormData();
  body.append('file', signature.value);
  const res = await api.post('/evaluate/' + route.params.id + '/signature', body);
  state.message = res.message;
  load();
}

async function confirmResult() {
  if (!confirm('ยืนยันผลแล้วจะแก้ไขไม่ได้ ต้องการยืนยันหรือไม่?')) return;
  await saveDraft();
  const res = await api.put('/evaluate/' + route.params.id + '/confirm');
  state.message = res.message;
  load();
}
</script>
```

- `locked` = ยืนยันแล้ว ทุกช่องจะกดไม่ได้
- ปุ่ม **บันทึกร่าง** ส่งคะแนนทุกข้อ + ความเห็นไปพร้อมกัน กดซ้ำได้ = แก้ไขร่าง
- ปุ่ม **ยืนยันและส่งผล** บันทึกร่างให้ก่อน แล้วค่อยยืนยัน

## ✔ ตรวจขั้น 7 (ทำตามลำดับ)

**ก่อนเริ่ม ให้รีเซ็ตฐานข้อมูล** เพราะการทดสอบขั้น 4 และ 6 ทิ้งข้อมูลไว้ (เช่น eva1 บันทึกร่างให้ emp1 ไปแล้ว ทำให้ emp1 แก้คะแนนตนเองไม่ได้)

```bash
docker compose down -v
docker compose up -d
```

`-v` ลบ volume ของฐานข้อมูล seed จะสร้างข้อมูลตัวอย่างใหม่ รหัสผ่านทุกคนกลับเป็นค่าเริ่มต้น (emp1/eva1 ต้องเปลี่ยนรหัสครั้งแรกอีกครั้ง) เตรียมไฟล์ PDF 1 ไฟล์ และรูปลายเซ็น PNG/JPG 1 ไฟล์ไว้ก่อน

1. Login `emp1` / `emp12345` → เปลี่ยนรหัส → เลือกรอบ "ประเมินประจำปี ..." → ให้คะแนนตนเองทุกข้อ (กด "บันทึก" ทีละข้อ) → ข้อแรกเพิ่มรายละเอียด **2 รายการ** (รายการที่ 1 แนบไฟล์ PDF, รายการที่ 2 ใส่ URL `https://...`) → ตอนนี้ความก้าวหน้าเป็น **50%** → ข้อที่สองเพิ่มรายละเอียด 1 รายการ → ความก้าวหน้าขึ้นเป็น **100%** (ข้อที่นับว่าเสร็จต้องมีทั้งคะแนนและรายละเอียด)
2. ยังอยู่ที่ emp1 → กดแก้ไข ✎ รายละเอียด 1 รายการ แล้วลบ 🗑 อีก 1 รายการ แล้วเพิ่มคืน (ข้อ 5.2.6)
3. Login `eva1` / `eva12345` → เปลี่ยนรหัส → รายชื่อที่ต้องประเมิน → กด "ประเมิน" สมชาย ใจดี → เห็นคะแนนตนเองและลิงก์ [ไฟล์] [ลิงก์] → กดเปิดไฟล์ได้ (ข้อ 8.3 Download)
4. เลือกคะแนนข้อแรก + เขียนความเห็น → **บันทึกร่าง** → สถานะเปลี่ยนเป็น "บันทึกร่าง"
5. กลับไป Login `emp1` → หน้าประเมินตนเองขึ้นแถบเตือน "กรรมการประเมินแล้ว แก้ไขการประเมินตนเองไม่ได้" ปุ่มบันทึก/เพิ่ม/แก้/ลบหายหรือกดไม่ได้
6. Login `eva1` → เลือกคะแนนข้อที่เหลือ → บันทึกร่างอีกครั้ง (แก้ไขร่าง) → ลองกด **ยืนยันและส่งผล** ก่อนแนบลายเซ็น → snackbar "แนบลายเซ็นก่อน" → แนบลายเซ็น (รูป PNG) → ยืนยันและส่งผล → สถานะ "ยืนยันผลแล้ว" ทุกช่องกดไม่ได้
7. Login `eva2` / `eva12345` → เปลี่ยนรหัส → กด "ประเมิน" **สมหญิง ตั้งใจ** → ให้คะแนน 1 ข้อ → บันทึกร่าง (เพื่อให้มีสถานะ "บันทึกร่าง" ไว้โชว์)
8. Login `emp1` → ส่วนความคิดเห็นของกรรมการขึ้นความเห็นของ eva1 ส่วน eva2 ขึ้น "ยังไม่ได้ยืนยันผล" → กด "ดูรายงาน / Export PDF" → เห็นคะแนนรวม และคะแนนของ eva1 แต่ช่องของ eva2 เป็น "-" → Export PDF ได้ไฟล์
9. Login `admin` → ติดตามและรายงาน → เลือกรอบ → เห็นสถานะครบ 3 แบบ: ยืนยันผลแล้ว (eva1→สมชาย), บันทึกร่าง (eva2→สมหญิง), ยังไม่ได้ประเมิน (อีก 2 งาน) → Dashboard ตัวเลข "ยืนยันผลแล้ว" เป็น 1
