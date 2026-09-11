FROM node:18-alpine

สร้างพื้นที่สำหรับโปรเจกต์
WORKDIR /app

ก๊อปปี้โฟลเดอร์ server ทั้งหมดเข้าไปในระบบ
COPY server/ ./server/

มุดเข้าไปในโฟลเดอร์ server
WORKDIR /app/server

ติดตั้งไลบรารีทั้งหมด
RUN npm install

รันคำสั่งเปิดเซิร์ฟเวอร์
CMD ["npm", "start"]