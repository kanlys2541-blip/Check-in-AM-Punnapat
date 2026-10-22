// ============================================================
//  เลือก Firebase ตาม AM จากลิงก์ (?am=<รหัส>) — ไม่ต้องแก้ไฟล์นี้
//  ตั้งค่า AM แต่ละคนที่ไฟล์ tenants.js
// ============================================================
import { TENANTS, DEFAULT_TENANT, GOOGLE_CLIENT_ID as GCID } from "./tenants.js";

// ลำดับการเลือกทีม: ?am= ในลิงก์ → ทีมที่เครื่องนี้จำไว้ (หลังล็อกอินครั้งแรก) → ทีมเริ่มต้น
// ลิงก์เดียวใช้ได้ทุกทีม: ถ้าล็อกอินแล้วไม่พบบัญชีในทีมนี้ ระบบจะค้นหาทีมที่ถูกต้องให้เอง (teamfinder.js)
export const TEAM_KEY = "amci_team";
const pick = (id) => (id ? (TENANTS[id] ? id : Object.keys(TENANTS).find((k) => (TENANTS[k].aliases || []).includes(id))) : "");
const fromUrl = (new URLSearchParams(location.search).get("am") || "").trim().toLowerCase();
let saved = ""; try { saved = localStorage.getItem(TEAM_KEY) || ""; } catch (e) {}
export const TENANT_ID = fromUrl ? (pick(fromUrl) || fromUrl) : (pick(saved) || DEFAULT_TENANT);
const T = TENANTS[TENANT_ID];
if (T && fromUrl) { try { localStorage.setItem(TEAM_KEY, TENANT_ID); } catch (e) {} }

if (!T) {
  document.addEventListener("DOMContentLoaded", () => {
    document.body.innerHTML = `<div style="font-family:sans-serif;max-width:420px;margin:60px auto;padding:20px;text-align:center"><h2>ไม่พบรหัสเขต "${TENANT_ID.replace(/[^a-z0-9_-]/g, "")}"</h2><p>ตรวจลิงก์อีกครั้ง หรือติดต่อหัวหน้า</p></div>`;
  });
  throw new Error("Unknown tenant: " + TENANT_ID);
}

// ต่อท้ายลิงก์ภายในระบบ เช่น admin.html + TENANT_QS
export const TENANT_QS = fromUrl && TENANT_ID !== DEFAULT_TENANT ? `?am=${fromUrl}` : "";

// เปิดจากลิงก์ที่มี ?am=: ปิด manifest เพื่อให้ "เพิ่มไปยังหน้าจอโฮม" จำลิงก์นั้นไว้
if (TENANT_QS) document.querySelectorAll('link[rel="manifest"]').forEach((l) => l.remove());

export const firebaseConfig = T.firebaseConfig;
export const OWNER_EMAIL = T.ownerEmail;
export const APP_NAME = T.name || "AM Check-In";
export const DEFAULT_RADIUS = T.defaultRadius || 200;
export const MULTI_ZONE = T.multiZone === true;
export const GOOGLE_CLIENT_ID = T.googleClientId || GCID || "";
export const TENANT_REGION = T.region || "";
