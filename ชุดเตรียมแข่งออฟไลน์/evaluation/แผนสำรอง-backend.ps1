# แผนสำรอง: รัน backend บนเครื่องโดยตรง (ไม่ผ่าน container) ใช้เมื่อ backend ใน Docker ค้างที่ npm install
# ต้องเปิดฐานข้อมูลไว้ก่อน: docker compose up -d db phpmyadmin
# วิธีรัน: powershell -ExecutionPolicy Bypass -File .\แผนสำรอง-backend.ps1
Set-Location (Join-Path $PSScriptRoot 'backend')
$env:DB_HOST = 'localhost'
$env:DB_PORT = '3307'
$env:DB_USER = 'root'
$env:DB_PASSWORD = 'root1234'
$env:DB_NAME = 'evaluation'
$env:PORT = '3000'
$env:JWT_SECRET = 'evaluation-2569-secret-key-change-me'
npm run seed
npm run dev
