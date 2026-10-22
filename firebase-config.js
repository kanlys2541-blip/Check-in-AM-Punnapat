// ============================================================
//  เลือก Firebase ตาม AM จากลิงก์ (?am=<รหัส>) — ไม่ต้องแก้ไฟล์นี้
//  ตั้งค่า AM แต่ละคนที่ไฟล์ tenants.js
// ============================================================
import { TENANTS, DEFAULT_TENANT, GOOGLE_CLIENT_ID as GCID } from "./tenants.js";

const fromUrl = (new URLSearchParams(location.search).get("am") || "").trim().toLowerCase();
const found = fromUrl ? (TENANTS[fromUrl] ? fromUrl : Object.keys(TENANTS).find((k) => (TENANTS[k].aliases || []).includes(fromUrl))) : DEFAULT_TENANT;
export const TENANT_ID = found || fromUrl;
const T = TENANTS[TENANT_ID];

if (!T) {
  document.addEventListener("DOMContentLoaded", () => {
    document.body.innerHTML = `<div style="font-family:sans-serif;max-width:420px;margin:60px auto;padding:20px;text-align:center"><h2>ไม่พบรหัสเขต "${TENANT_ID.replace(/[^a-z0-9_-]/g, "")}"</h2><p>ตรวจลิงก์อีกครั้ง หรือติดต่อหัวหน้า</p></div>`;
  });
  throw new Error("Unknown tenant: " + TENANT_ID);
}

// ต่อท้ายลิงก์ภายในระบบ เช่น admin.html + TENANT_QS
export const TENANT_QS = TENANT_ID === DEFAULT_TENANT ? "" : `?am=${fromUrl || TENANT_ID}`;

// AM อื่น: ปิด manifest เพื่อให้ "เพิ่มไปยังหน้าจอโฮม" จำลิงก์ที่มี ?am= ไว้ (ไม่งั้นไอคอนจะเปิดเขตเริ่มต้น)
if (TENANT_QS) document.querySelectorAll('link[rel="manifest"]').forEach((l) => l.remove());

export const firebaseConfig = T.firebaseConfig;
export const OWNER_EMAIL = T.ownerEmail;
export const APP_NAME = T.name || "AM Check-In";
export const DEFAULT_RADIUS = T.defaultRadius || 200;
export const MULTI_ZONE = T.multiZone === true;
export const GOOGLE_CLIENT_ID = T.googleClientId || GCID || "";
export const TENANT_REGION = T.region || "";
