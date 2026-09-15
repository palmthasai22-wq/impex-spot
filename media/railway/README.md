# การติดตั้ง CCTV บน Railway

โปรเจกต์: `skillful-miracle` — บริการหลัก `impex-spot-api`

## บริการที่ใช้

- `Postgres`: ฐานข้อมูล PostGIS เดิม
- `impex-spot-api`: แอปเดิม พร้อม API กล้อง ช่องทางส่งภาพ WSS และตัวส่งต่อ `/streams/`
- `cctv-media`: MediaMTX ในเครือข่ายส่วนตัว ไม่มีโดเมนหรือพอร์ต TCP สาธารณะ
- `cctv-edge`: nginx สำหรับตรวจสอบความยินยอมและแคช HLS ภายในเครือข่ายส่วนตัว

ไฟล์ Docker ของบริการใหม่อยู่ในโฟลเดอร์ `mediamtx` และ `edge` แต่ละบริการต้องใช้โฟลเดอร์ของตัวเองเป็นรากของการบิลด์ ตัวอย่าง:

```sh
railway up media/railway/mediamtx --path-as-root --service cctv-media --detach
railway up media/railway/edge --path-as-root --service cctv-edge --detach
```

## ขั้นตอนก่อนเปลี่ยนบริการ API เดิม

1. สำรองข้อมูลเดิมที่เก็บในไฟล์ของคอนเทนเนอร์ก่อนเผยแพร่ เพราะบริการ API เดิมยังไม่มี volume สำหรับไฟล์หมุดและผู้ตอบเหตุ หากนำข้อมูลลงเครื่อง ต้องได้รับอนุญาตจากเจ้าของข้อมูลก่อน
2. ตั้งค่าคีย์ลับและปลายทางบริการ โดยใช้ `scripts/railway-cctv-config.cjs` ซึ่งอ่านค่าเดิมและส่งค่าลับเข้า CLI ผ่าน stdin ไม่แสดงค่าลับในผลลัพธ์ ต้องตั้ง `RAILWAY_CLI_PATH` เป็นตำแหน่งไฟล์ Railway CLI จริงก่อนเรียกใช้ สคริปต์ใช้ `--skip-deploys` เพื่อเตรียมค่าก่อนเผยแพร่
3. ตรวจสอบโค้ดและบิลด์ให้ผ่าน แล้วเผยแพร่บริการ `impex-spot-api` พร้อมไฟล์ `railway.json` ที่รากโครงการ
4. เมื่อ `CCTV_REQUIRE_DATABASE=true` คำสั่งเริ่มต้นใน Dockerfile จะรัน `node server/db/installCctv.js` ก่อนเริ่มเซิร์ฟเวอร์ แม้ Railway ไม่ใช้ค่า pre-deploy สคริปต์เพิ่มตาราง CCTV และคอลัมน์ผู้ใช้ที่จำเป็นใน transaction และตรวจสอบบัญชีผู้ดูแล โดยไม่รีเซ็ตข้อมูลเดิม หากตรวจสอบไม่ผ่านจะไม่เริ่มเซิร์ฟเวอร์
5. ตรวจสอบ `/health/live`, `/api/pins/cctv` และหน้า `/admin/cameras` รวมถึงการปฏิเสธผู้ไม่มีสิทธิ์ ก่อนเชื่อมต่อกล้องจริง

บน production ตั้ง `CCTV_REQUIRE_DATABASE=true` เพื่อใช้สถานะความยินยอมและบัญชีผู้ดูแลจากฐานข้อมูลเท่านั้น หากฐานข้อมูลขัดข้อง ระบบจะไม่สลับไปใช้ไฟล์ข้อมูลสำรองที่อาจล้าสมัย

ตัวแปรฝั่ง API: `CCTV_ENABLED`, `CCTV_REQUIRE_DATABASE`, `CCTV_ENCRYPTION_KEY`, `CCTV_CONTROL_TOKEN`, `CCTV_EDGE_TOKEN`, `MEDIAMTX_API_URL`, `CCTV_EDGE_URL`, `CCTV_TUNNEL_HOST` และข้อมูลฐานข้อมูล/ผู้ดูแลเดิม

ตัวแปรฝั่ง edge: `CCTV_EDGE_TOKEN`, `CCTV_BACKEND_HOST`, `CCTV_MEDIA_HOST` ส่วน MediaMTX ใช้ `MTX_AUTHHTTPADDRESS` ชี้กลับไปยัง API ภายใน

## เชื่อม Relay จากเครือข่ายกล้อง

Railway ใช้ช่องทาง WSS ผ่าน HTTPS เพื่อส่ง RTSP ไปยัง MediaMTX ภายใน จึงไม่ต้องเปิดพอร์ต RTSP สาธารณะหรือสร้าง VPN เพิ่มสำหรับวิธีนี้

1. บนเครื่องใกล้กล้อง ติดตั้ง Node 20+ และ FFmpeg จากนั้นรัน `npm ci` ในโฟลเดอร์ `server` เพื่อให้มีไลบรารี `ws`
2. เพิ่มกล้องและจับคู่ Relay ในหน้า Admin → CCTV
3. ตั้ง `CCTV_PIN_ID`, `CCTV_RELAY_TOKEN` และ `CCTV_BACKEND_URL=https://impex-spot-api-production.up.railway.app` บนเครื่อง Relay
4. **ไม่ต้องตั้ง `CCTV_INGEST_URL`** สำหรับ Railway หากมีค่าเดิมให้ลบตัวแปรนี้ออกจากสภาพแวดล้อมของ Relay
5. รัน `node scripts/cctv-relay.cjs` จากโฟลเดอร์หลัก

โปรแกรมเปิดพอร์ตชั่วคราวบน `127.0.0.1` ให้ FFmpeg ในเครื่องเชื่อมต่อเท่านั้น จากนั้นส่งข้อมูลออกไปด้วย WSS ที่ตรวจสอบใบรับรอง TLS ตามปกติ ไม่มีพอร์ตที่เปิดรับจากอินเทอร์เน็ตหรือ LAN บนเครื่อง Relay หากยังตั้ง `CCTV_INGEST_URL` จะใช้วิธี RTSP/VPN เดิมตามคู่มือหลัก

ทดสอบภาพจริงหลังเจ้าของกล้องให้ความยินยอม แล้วทดสอบเพิกถอนความยินยอมและเปลี่ยนโทเคนขณะสตรีมทำงาน ข้อมูลที่ส่งถึงผู้ชมแล้วไม่สามารถเรียกคืนได้

## ผลการติดตั้ง 15 กันยายน 2026

ติดตั้งบนโปรเจกต์ `skillful-miracle` / production แล้ว หน้าใช้งานคือ https://impex-spot-api-production.up.railway.app/admin/cameras ใช้บัญชีผู้ดูแลเดิม ซึ่งมีบัญชีในฐานข้อมูลแล้ว

ตรวจผ่าน: health และรายการกล้อง HTTP 200, ผู้ไม่มีบัญชีเข้า monitor ได้ HTTP 401, สตรีมที่ไม่ได้อนุญาต HTTP 403 และข้อมูลผู้ตอบเหตุเดิม 2 รายการยังอยู่ สำเนาสำรองอยู่ใน `.local/cctv-backup/` ซึ่งถูกยกเว้นจาก Git ขณะตรวจยังไม่มีกล้อง จึงยังไม่ได้ทดสอบภาพจากกล้องจริง

เผยแพร่จากโค้ดในเครื่องผ่าน Railway CLI การแก้ไขชุดนี้ยังไม่ได้ commit/push ไป GitHub ก่อนเผยแพร่จาก GitHub ครั้งต่อไปต้องรวมการแก้ไขเหล่านี้ด้วย ส่วนไฟล์หมุดและผู้ตอบเหตุยังไม่มี volume ต้องสำรองก่อนเปลี่ยน deployment ตามขั้นตอนข้างต้น

## การตรวจสอบโค้ด

`npm run test:cctv` ใน `server` รวมการทดสอบ WSS และตัวส่งต่อ HLS แล้ว การทดสอบฐานข้อมูลแยกต้องใช้ `TEST_DATABASE_URL` ของฐานข้อมูลทดสอบ ไม่ใช้ฐานข้อมูลจริงเป็นค่าเริ่มต้น

หมายเหตุ: Railway CLI แจ้งว่า `railway.json` ยังใช้ได้ถึงวันที่ 1 ธันวาคม 2026 ก่อนวันดังกล่าวควรย้ายการตั้งค่าเป็น Infrastructure as Code ตามเอกสาร Railway
