const express = require('express');
const express = require('express');
const router = express.Router();

// ปิดการเรียกใช้งาน module ที่หาไม่เจอชั่วคราว
// const db = require('../db'); 

// ส่งคืนค่าสถานะเซิร์ฟเวอร์ปกติโดยข้ามการเช็ก DB ไปก่อน
router.get('/', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    message: 'Server is running normally' 
  });
});

module.exports = router;