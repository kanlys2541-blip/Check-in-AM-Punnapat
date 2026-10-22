// ============================================================
//  รายชื่อ AM ที่ใช้ระบบนี้ — 1 AM = 1 Firebase (ข้อมูล/บัญชี/โควตาแยกกันเด็ดขาด)
//  เพิ่ม AM ใหม่: เปิดหน้า setup.html → กรอกข้อมูล → คัดลอกบล็อกที่ได้มาวางต่อท้ายในรายการนี้
//  ลิงก์ของแต่ละ AM:  …/?am=<รหัสทีม เช่น e1>   (หน้าผู้ดูแล …/admin.html?am=e1)
// ============================================================
export const DEFAULT_TENANT = "east"; // เปิดลิงก์ที่ไม่มี ?am= จะเข้าเขตนี้ (ระบบของ Punnapat)

// ปุ่ม "ส่งเข้า Google Sheet" — OAuth Client ID (ประเภท Web application) ตั้งครั้งเดียว ใช้ได้ทุก AM
// ชีตจะถูกสร้างใน Drive ของคนที่กดปุ่ม ไม่ผ่านพื้นที่ของเจ้าของ Client ID · เว้นว่าง = ซ่อนการทำงาน (ใช้ปุ่ม Excel แทน)
export const GOOGLE_CLIENT_ID = "590562682171-omf4u1edg9koq9nf4f5bae9nuf035mpe.apps.googleusercontent.com";

export const TENANTS = {
  // ---------- AM East (Punnapat) ----------
  east: {
    aliases: ["e4"],          // รหัสทีม E4 ในแบบฟอร์ม → ?am=e4 ใช้ได้เหมือนกัน
    region: "East",           // ภาค — RM ของภาคนี้ดูสรุปได้ที่ rm.html?rm=east
    amName: "Punnapat N.",    // ชื่อที่แสดงในหน้าสรุป RM
    name: "AM Check-In",
    ownerEmail: "kanlys.2541@gmail.com",
    multiZone: false,
    defaultRadius: 200,
    firebaseConfig: {
      apiKey: "AIzaSyARoRNjmbNXiF0mjBOOGgP2R-5fOSDuDAA",
      authDomain: "check-in-am-punnapat.firebaseapp.com",
      projectId: "check-in-am-punnapat",
      storageBucket: "check-in-am-punnapat.firebasestorage.app",
      messagingSenderId: "590562682171",
      appId: "1:590562682171:web:8c5ec6182d87925568831e"
    }
  },

  // ---------- วาง AM ใหม่ต่อจากบรรทัดนี้ ----------

  // ---------- E2 · Pattarasiri S. ----------
  "e2": {
    name: "AM Check-In · Pattarasiri S.",
    region: "East",
    ownerEmail: "pattarasiri1612@gmail.com",
    multiZone: false,
    defaultRadius: 200,
    firebaseConfig: {
      apiKey: "AIzaSyB8_6KqzdCBn03k0Ng86yoclUj1l33jQZo",
      authDomain: "checkin-e2.firebaseapp.com",
      projectId: "checkin-e2",
      storageBucket: "checkin-e2.firebasestorage.app",
      messagingSenderId: "867526731219",
      appId: "1:867526731219:web:e6edec9b02521bb633bb26"
    }
  },


};
