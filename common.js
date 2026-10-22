import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, updateCurrentUser, signOut as fbSignOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig, APP_NAME, TENANT_ID } from "./firebase-config.js";

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// รับการล็อกอินที่ส่งต่อมาจากการค้นหาทีม (teamfinder.js) — ไม่ต้องพิมพ์รหัสผ่านซ้ำ
try {
  if (sessionStorage.getItem("amci_handoff") === TENANT_ID) {
    sessionStorage.removeItem("amci_handoff");
    const pAuth = getAuth(initializeApp(firebaseConfig, "probe-" + TENANT_ID));
    pAuth.authStateReady().then(async () => {
      if (pAuth.currentUser) await updateCurrentUser(auth, pAuth.currentUser);
      await fbSignOut(pAuth).catch(() => {});
    }).catch(() => {});
  }
} catch (e) {}

export const $ = (id) => document.getElementById(id);

document.querySelectorAll("[data-appname]").forEach((el) => (el.textContent = APP_NAME));

// ระยะทางระหว่าง 2 พิกัด (เมตร)
export function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000, t = (x) => (x * Math.PI) / 180;
  const dLat = t(lat2 - lat1), dLon = t(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(t(lat1)) * Math.cos(t(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function fmtDist(m) {
  return m >= 1000 ? (m / 1000).toFixed(1) + " กม." : Math.round(m) + " ม.";
}

// รหัสประจำเครื่อง (สร้างครั้งเดียว เก็บในเบราว์เซอร์)
export function getDeviceId() {
  const KEY = "amci_device_id";
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch (e) {
    return "nostorage-" + navigator.userAgent.length;
  }
}

export function isMobile() {
  const ua = navigator.userAgent;
  if (/Android|iPhone|iPod|iPad/i.test(ua)) return true;
  // iPadOS แสดงตัวเป็น Macintosh แต่มีจอสัมผัส
  return /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
}

export function isInAppBrowser() {
  return /\bLine\/|FBAN|FBAV|FB_IAB|Instagram|MicroMessenger/i.test(navigator.userAgent);
}

const TZ = "Asia/Bangkok";
export function bkkDay(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d); // YYYY-MM-DD
}
export function fmtTime(d) {
  return d ? new Intl.DateTimeFormat("th-TH", { timeZone: TZ, hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(d) : "-";
}
export function fmtDateTime(d) {
  return d ? new Intl.DateTimeFormat("th-TH", { timeZone: TZ, dateStyle: "medium", timeStyle: "short" }).format(d) : "-";
}
export function fmtDateLong(d = new Date()) {
  return new Intl.DateTimeFormat("th-TH", { timeZone: TZ, dateStyle: "full" }).format(d);
}

export const GESTURES = [
  { emoji: "✌🏻", text: "ชู 2 นิ้ว" },
  { emoji: "👍🏻", text: "ชูนิ้วโป้ง" },
  { emoji: "👌🏻", text: "ทำมือ OK" },
  { emoji: "☝🏻", text: "ชู 1 นิ้ว" },
  { emoji: "✋🏻", text: "ชูฝ่ามือ 5 นิ้ว" },
  { emoji: "🤟🏻", text: "ชู 3 นิ้ว" },
  { emoji: "🫶🏻", text: "ทำมือรูปหัวใจ" },
  { emoji: "✊🏻", text: "กำมือชูขึ้น" }
];

export function errText(e) {
  const c = (e && e.code) || "";
  const map = {
    "auth/invalid-credential": "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
    "auth/wrong-password": "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
    "auth/user-not-found": "ไม่พบบัญชีนี้ในระบบ",
    "auth/invalid-email": "รูปแบบอีเมลไม่ถูกต้อง",
    "auth/too-many-requests": "ลองผิดหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่",
    "auth/network-request-failed": "อินเทอร์เน็ตมีปัญหา กรุณาลองใหม่",
    "auth/weak-password": "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร",
    "auth/email-already-in-use": "อีเมลนี้มีบัญชีอยู่แล้ว",
    "auth/user-disabled": "บัญชีนี้ถูกปิดการใช้งาน",
    "auth/requires-recent-login": "กรุณาออกจากระบบแล้วเข้าใหม่อีกครั้ง",
    "permission-denied": "ระบบปฏิเสธการบันทึก (อาจอยู่นอกพื้นที่สาขา หรือเครื่องยังไม่ได้รับอนุมัติ)",
    "unavailable": "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ต"
  };
  return map[c] || (e && e.message) || String(e);
}

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export function busy(btn, on, label) {
  if (!btn) return;
  if (on) { btn.dataset.label = btn.textContent; btn.textContent = label || "กำลังดำเนินการ..."; btn.disabled = true; }
  else { btn.textContent = btn.dataset.label || btn.textContent; btn.disabled = false; }
}

/* ---------- ตารางกะ ----------
   ใช้ "ชั่วโมงเข้างาน" เป็นรหัสกะ เช่น 8 = 08:00–17:00, 9 = 09:00–18:00 (ทำงาน 9 ชม. รวมพัก 1 ชม.)
   รหัสตัวอักษรเดิมในไฟล์ Excel แปลงเป็นชั่วโมงให้อัตโนมัติ (เวลา .30 ปัดเป็น .00 ตามเวลาเข้างานจริง) */
export const LATE_GRACE_MIN = 20;   // อนุโลมมาสาย (นาที)
export const SHIFT_HOURS = 9;       // ความยาวกะ (ชม.)
export const LETTER_TO_HOUR = { A: 8, B: 4, C: 5, D: 5, E: 7, F: 8, G: 9, I: 10, J: 11, K: 12, W: 12, L: 13, M: 21, N: 15, O1: 8 };
export const OFF_CODES = { H: "วันหยุด", V: "พักร้อน", OL: "ลาอื่นๆ", T: "อบรม", MT: "อบรม", "ลากิจ": "ลากิจ", "ลาป่วย": "ลาป่วย", "ลาคลอด": "ลาคลอด" };
export const SHIFT_CHOICES = ["5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "21", "H", "V", "OL", "T", "ลากิจ", "ลาป่วย"];
export function normCode(v) {
  const s = String(v ?? "").trim();
  return /^[a-z0-9]+$/i.test(s) ? s.toUpperCase() : s;
}
const hh = (h) => String(h % 24).padStart(2, "0") + ":00";
export function shiftHour(code) {
  const c = normCode(code);
  if (/^\d{1,2}$/.test(c) && +c <= 23) return +c;
  if (c in LETTER_TO_HOUR) return LETTER_TO_HOUR[c];
  return null;
}
export function shiftInfo(code) {
  const c = normCode(code);
  if (!c) return null;
  if (c in OFF_CODES) return { off: OFF_CODES[c] };
  const h = shiftHour(c);
  if (h === null) return null;
  const end = h + SHIFT_HOURS;
  return { h, s: hh(h), e: end === 24 ? "24:00" : hh(end), note: c === "O1" ? "เปิดเซฟ" : "" };
}
// รหัสสำหรับแสดงผล: ตัวอักษรเดิม → ตัวเลขชั่วโมง
export function displayCode(code) {
  const c = normCode(code), i = shiftInfo(c);
  if (!c) return "-";
  if (!i) return c;
  return i.off ? i.off : String(i.h);
}
export function shiftLabel(code) {
  const c = normCode(code), i = shiftInfo(c);
  if (!c) return "ไม่มีกะ";
  if (!i) return `รหัส ${c}`;
  return i.off ? i.off : `กะ ${i.h} (${i.s}–${i.e})${i.note ? " · " + i.note : ""}`;
}
export function phoneKey(p) { const d = String(p ?? "").replace(/\D/g, ""); return d.length >= 9 ? d.slice(-9) : ""; }
export function bkkTime(day, hhmm) {
  if (hhmm === "24:00") return new Date(new Date(day + "T00:00:00+07:00").getTime() + 86400000);
  return new Date(`${day}T${hhmm}:00+07:00`);
}
export function shiftWindow(day, info) {
  const s = bkkTime(day, info.s); let e = bkkTime(day, info.e);
  if (e <= s) e = new Date(e.getTime() + 86400000);
  return { s, e };
}
// รวมตารางกะที่อัปโหลด + รายการที่แก้/สลับ
export const mergeDays = (shiftDoc, overrideDoc) => ({ ...((shiftDoc && shiftDoc.days) || {}), ...((overrideDoc && overrideDoc.days) || {}) });

/* ---------- ข้อมูลเครื่อง ---------- */
export async function deviceInfo() {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const android = /Android/.test(ua);
  const iv = ua.match(/OS (\d+)[._](\d+)/), av = ua.match(/Android ([\d.]+)/);
  const os = ios ? `iOS ${iv ? iv[1] + "." + iv[2] : ""}`.trim() : android ? `Android ${av ? av[1] : ""}`.trim()
    : /Windows/.test(ua) ? "Windows" : /Mac/.test(ua) ? "macOS" : "อื่นๆ";
  const standalone = (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;
  const browser = /Edg/.test(ua) ? "Edge" : /CriOS|Chrome/.test(ua) ? "Chrome" : /FxiOS|Firefox/.test(ua) ? "Firefox" : /Safari/.test(ua) ? "Safari" : "อื่นๆ";
  let model = ios ? (/iPad/.test(ua) || !/iPhone/.test(ua) ? "iPad" : "iPhone") : android ? ((ua.match(/Android [\d.]+; ([^;)]+)/) || [])[1] || "Android") : "คอมพิวเตอร์";
  try {
    if (navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) {
      const h = await navigator.userAgentData.getHighEntropyValues(["model"]);
      if (h.model) model = h.model;
    }
  } catch (e) {}
  if (model === "K") model = "Android";
  return { os, model: String(model).slice(0, 40), browser, channel: standalone ? "ไอคอนหน้าจอโฮม" : browser };
}
