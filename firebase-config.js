// ============================================================
//  ตั้งค่า Firebase — คัดลอกค่าจาก Firebase Console
//  Project settings → General → Your apps → Web app → SDK setup and configuration → Config
// ============================================================
export const firebaseConfig = {
  apiKey: "ใส่ค่า apiKey",
  authDomain: "ใส่ค่า authDomain",
  projectId: "ใส่ค่า projectId",
  storageBucket: "ใส่ค่า storageBucket",
  messagingSenderId: "ใส่ค่า messagingSenderId",
  appId: "ใส่ค่า appId"
};

// อีเมลผู้ดูแลระบบหลัก (ต้องตรงกับ ownerEmail() ในไฟล์ firestore.rules)
export const OWNER_EMAIL = "your-email@example.com";

// ชื่อระบบที่แสดงบนหน้าจอ
export const APP_NAME = "AM Check-In";

// รัศมีเริ่มต้น (เมตร) เมื่อเพิ่มสาขาใหม่
export const DEFAULT_RADIUS = 200;
