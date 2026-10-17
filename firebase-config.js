// ============================================================
//  ตั้งค่า Firebase — คัดลอกค่าจาก Firebase Console
//  Project settings → General → Your apps → Web app → SDK setup and configuration → Config
// ============================================================
export const firebaseConfig = {
  apiKey: "AIzaSyARoRNjmbNXiF0mjBOOGgP2R-5fOSDuDAA",
  authDomain: "check-in-am-punnapat.firebaseapp.com",
  projectId: "check-in-am-punnapat",
  storageBucket: "check-in-am-punnapat.firebasestorage.app",
  messagingSenderId: "590562682171",
  appId: "1:590562682171:web:8c5ec6182d87925568831e"
};

// อีเมลผู้ดูแลระบบหลัก (ต้องตรงกับ ownerEmail() ในไฟล์ firestore.rules)
export const OWNER_EMAIL = "kanlys.2541@gmail.com";

// ชื่อระบบที่แสดงบนหน้าจอ
export const APP_NAME = "AM Check-In";

// รัศมีเริ่มต้น (เมตร) เมื่อเพิ่มสาขาใหม่
export const DEFAULT_RADIUS = 200;

// false = ใช้คนเดียว (AM 1 เขต) · true = แบ่งหลายเขต
export const MULTI_ZONE = false;
