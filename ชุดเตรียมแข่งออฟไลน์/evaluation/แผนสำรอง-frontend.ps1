# แผนสำรอง: รัน frontend บนเครื่องโดยตรง (ไม่ผ่าน container) ใช้คู่กับ แผนสำรอง-backend.ps1
# วิธีรัน: powershell -ExecutionPolicy Bypass -File .\แผนสำรอง-frontend.ps1   แล้วเปิด http://localhost:5173
Set-Location (Join-Path $PSScriptRoot 'frontend')
npm run dev
