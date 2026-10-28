# เตรียมเครื่องสำหรับแข่งแบบออฟไลน์ (รันครั้งเดียว ตอนที่ยังมีอินเทอร์เน็ต)
# วิธีรัน: คลิกขวาไฟล์นี้ → Run with PowerShell  หรือพิมพ์ใน PowerShell ที่โฟลเดอร์นี้:  powershell -ExecutionPolicy Bypass -File .\เตรียมเครื่อง.ps1
$ErrorActionPreference = 'Continue'  # คำสั่ง docker เขียนความคืบหน้าลง stderr จึงตรวจผลจาก $LASTEXITCODE แทน
Set-Location $PSScriptRoot

Write-Host '1/4 ตรวจ Docker Desktop' -ForegroundColor Cyan
cmd /c 'docker info >nul 2>&1'
if ($LASTEXITCODE -ne 0) { throw 'Docker Desktop ยังไม่เปิด ให้เปิดแล้วรอไอคอนเป็นสีเขียว แล้วรันใหม่' }

Write-Host '2/4 ดึง Docker image (mysql, phpmyadmin, node)' -ForegroundColor Cyan
docker compose pull
if ($LASTEXITCODE -ne 0) { throw 'ดึง image ไม่สำเร็จ ตรวจอินเทอร์เน็ต' }

Write-Host '3/4 ติดตั้งแพ็กเกจลงใน container (เก็บใน volume ใช้ตอนออฟไลน์)' -ForegroundColor Cyan
docker compose run --rm --no-deps backend sh -c "npm install --no-audit --no-fund"
if ($LASTEXITCODE -ne 0) { throw 'ติดตั้งแพ็กเกจ backend ไม่สำเร็จ' }
docker compose run --rm --no-deps frontend sh -c "npm install --no-audit --no-fund"
if ($LASTEXITCODE -ne 0) { throw 'ติดตั้งแพ็กเกจ frontend ไม่สำเร็จ' }

Write-Host '4/4 สร้างฐานข้อมูลไว้ล่วงหน้า' -ForegroundColor Cyan
docker compose up -d db
# รอให้ MySQL สร้างฐานข้อมูลเสร็จ (healthy) ก่อนหยุด ถ้าหยุดกลางคันไฟล์ฐานข้อมูลจะเสีย
$ok = $false
for ($i = 0; $i -lt 60; $i++) {
  $state = docker inspect --format '{{.State.Health.Status}}' (docker compose ps -q db)
  if ($state -eq 'healthy') { $ok = $true; break }
  Start-Sleep -Seconds 3
}
if (-not $ok) { throw 'MySQL ไม่พร้อมภายใน 3 นาที ดู log ด้วย docker compose logs db' }
docker compose stop

Write-Host ''
Write-Host 'เตรียมเครื่องเสร็จแล้ว ตัดอินเทอร์เน็ตได้เลย' -ForegroundColor Green
Write-Host 'ตอนแข่ง: docker compose up -d   ปิด: docker compose stop   (ห้ามใช้ docker compose down -v)'
