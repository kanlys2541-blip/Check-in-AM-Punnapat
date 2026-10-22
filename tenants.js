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

  // ---------- S1 · Ubonrat S. ----------
  "s1": {
    name: "AM Check-In · Ubonrat S.",
    region: "South",
    ownerEmail: "tn844sd@gmail.com",
    multiZone: false,
    defaultRadius: 200,
    firebaseConfig: {
      apiKey: "AIzaSyDIdVf_NDFROlDSubZhdWnfu3r6afqLqt0",
      authDomain: "checkin-s1.firebaseapp.com",
      projectId: "checkin-s1",
      storageBucket: "checkin-s1.firebasestorage.app",
      messagingSenderId: "1040805777386",
      appId: "1:1040805777386:web:399eb4a74a7c44a10bec93"
    }
  },


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

  // ---------- S2 · Tananan P. ----------
  "s2": {
    name: "AM Check-In · Tananan P.",
    region: "South",
    ownerEmail: "tanananpakdeelertvichian@gmail.com",
    multiZone: false,
    defaultRadius: 200,
    firebaseConfig: {
      apiKey: "AIzaSyCf5vD8-4EZ-8TNT5N9inmjQWOhxhtwxtU",
      authDomain: "checkin-s2.firebaseapp.com",
      projectId: "checkin-s2",
      storageBucket: "checkin-s2.firebasestorage.app",
      messagingSenderId: "127264605506",
      appId: "1:127264605506:web:824ad571d1d57a3bb334db"
    }
  },

  // ---------- S3 · Nantiya F. ----------
  "s3": {
    name: "AM Check-In · Nantiya F.",
    region: "South",
    ownerEmail: "nantiya.sindee@gmail.com",
    multiZone: false,
    defaultRadius: 200,
    firebaseConfig: {
      apiKey: "AIzaSyAeeKS9HYcwUovg0nGsaVDkgcl8iFHVdVA",
      authDomain: "checkin-s3.firebaseapp.com",
      projectId: "checkin-s3",
      storageBucket: "checkin-s3.firebasestorage.app",
      messagingSenderId: "431509096458",
      appId: "1:431509096458:web:d44fab13dc52452f4777f3"
    }
  },

  // ---------- S4 · Eakapol T. ----------
  "s4": {
    name: "AM Check-In · Eakapol T.",
    region: "South",
    ownerEmail: "eakapon1993tk@gmail.com",
    multiZone: false,
    defaultRadius: 200,
    firebaseConfig: {
      apiKey: "AIzaSyCXTg7I6b05Fbj9Yoq9JzhkJJhOgAnl3cI",
      authDomain: "checkin-s4.firebaseapp.com",
      projectId: "checkin-s4",
      storageBucket: "checkin-s4.firebasestorage.app",
      messagingSenderId: "294804175029",
      appId: "1:294804175029:web:7bdf1d07861b313786e6fc"
    }
  },

};
