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
