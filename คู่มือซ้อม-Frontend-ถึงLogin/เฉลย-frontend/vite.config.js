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
