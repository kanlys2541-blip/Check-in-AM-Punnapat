import { auth, db, $, fmtTime, fmtDateTime, bkkDay, errText, esc, busy } from "./common.js";
import { firebaseConfig, OWNER_EMAIL, DEFAULT_RADIUS } from "./firebase-config.js";
import { initializeApp, deleteApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, collection, query, where, orderBy, limit, startAfter, writeBatch, Timestamp, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const SEED_BRANCHES = `5175, Bangkadi, , , 200
5052, Pathumthani, , , 200
5184, North Ratchapruek, , , 200
5015, Fortune, , , 200
5081, Lumlookka Klong2, , , 200
5183, Tiwanon, , , 200
5112, Pattanakarn Bangkok, , , 200
5037, Rangsit, , , 200
5104, Nakorn-In Bangkrauy, , , 200
5027, Rattanathibet, , , 200
5045, Bangyai, , , 200
6401, Bangkok - Phong Phet (BKK1), , , 200
5056, Baan Fah, , , 200
5162, Bang Kruay Sai Noi, , , 200`;

const SCREENS = ["scLoading", "scLogin", "scDenied", "scPanel"];
const screen = (id) => { SCREENS.forEach((s) => $(s).classList.toggle("hidden", s !== id)); $("btnLogout").classList.toggle("hidden", id === "scLogin" || id === "scLoading"); };
const msg = (id, t, k = "err") => { $(id).textContent = t || ""; $(id).className = "msg " + k; };

let branches = [], users = [], reportRows = [];
const bName = (id) => (branches.find((b) => b.id === id) || {}).name || id || "-";

/* ---------- auth ---------- */
onAuthStateChanged(auth, async (user) => {
  if (!user) return screen("scLogin");
  screen("scLoading");
  try {
    const ref = doc(db, "users", user.uid);
    let snap = await getDoc(ref);
    const isOwner = (user.email || "").toLowerCase() === OWNER_EMAIL.toLowerCase();
    if (!snap.exists() && isOwner) {
      await setDoc(ref, { name: "ผู้ดูแลระบบ", email: user.email, empId: "", position: "Area Mall Manager", branchId: "", role: "admin", active: true, mustChangePassword: false, deviceId: "", createdAt: serverTimestamp() });
      snap = await getDoc(ref);
    }
    if (!isOwner && (!snap.exists() || snap.data().role !== "admin")) return screen("scDenied");
    screen("scPanel");
    $("staffLink").textContent = new URL("./", location.href).href;
    await loadBranches();
    await loadUsers();
    loadDevices();
    const today = bkkDay();
    $("rFrom").value = today; $("rTo").value = today;
    runReport();
  } catch (e) { screen("scLogin"); msg("liMsg", errText(e)); }
});
$("btnLogin").onclick = async () => {
  busy($("btnLogin"), true);
  try { await signInWithEmailAndPassword(auth, $("liEmail").value.trim(), $("liPw").value); msg("liMsg", ""); }
  catch (e) { msg("liMsg", errText(e)); }
  finally { busy($("btnLogin"), false); }
};
$("btnLogout").onclick = () => signOut(auth);

/* ---------- tabs ---------- */
$("tabs").addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  [...$("tabs").children].forEach((x) => x.classList.toggle("on", x === b));
  ["report", "devices", "users", "branches", "tools"].forEach((t) => $("t-" + t).classList.toggle("hidden", t !== b.dataset.t));
  if (b.dataset.t === "devices") loadDevices();
});

/* ---------- photo modal ---------- */
document.addEventListener("click", (e) => {
  const img = e.target.closest("img.thumb"); if (!img) return;
  $("photoBig").src = img.src; $("photoCap").textContent = img.dataset.cap || "";
  $("photoModal").classList.remove("hidden");
});
$("btnPhotoClose").onclick = () => $("photoModal").classList.add("hidden");
$("photoModal").onclick = (e) => { if (e.target.id === "photoModal") $("photoModal").classList.add("hidden"); };

/* ================= สาขา ================= */
async function loadBranches() {
  branches = (await getDocs(collection(db, "branches"))).docs.map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));
  $("bCount").textContent = branches.length;
  const opts = branches.map((b) => `<option value="${esc(b.id)}">${esc(b.name)} (${esc(b.id)})</option>`).join("");
  $("rBranch").innerHTML = `<option value="">ทุกสาขา</option>` + opts;
  $("uBranch").innerHTML = `<option value="">— ไม่ระบุ —</option>` + opts;
  $("tBranches").innerHTML = `<tr><th>รหัส</th><th>ชื่อสาขา</th><th>พิกัด</th><th>รัศมี</th><th>แผนที่</th><th></th></tr>` +
    branches.map((b) => {
      const has = typeof b.lat === "number" && typeof b.lng === "number";
      return `<tr><td>${esc(b.id)}</td><td>${esc(b.name)}</td>
        <td>${has ? `${b.lat.toFixed(6)}, ${b.lng.toFixed(6)}` : `<span class="tag off">ยังไม่มีพิกัด</span>`}</td>
        <td>${b.radius || DEFAULT_RADIUS} ม.</td>
        <td>${has ? `<a href="https://www.google.com/maps?q=${b.lat},${b.lng}" target="_blank" rel="noopener">เปิด</a>` : "-"}</td>
        <td class="actions"><button class="btn sm" data-bedit="${esc(b.id)}">แก้ไข</button><button class="btn sm danger" data-bdel="${esc(b.id)}">ลบ</button></td></tr>`;
    }).join("");
}
function parseNum(v) { const n = parseFloat(String(v).trim()); return Number.isFinite(n) ? n : null; }
$("bLat").addEventListener("input", () => {
  const m = $("bLat").value.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
  if (m) { $("bLat").value = m[1]; $("bLng").value = m[2]; }
});
$("btnBSave").onclick = async () => {
  const id = $("bCode").value.trim(), name = $("bName").value.trim();
  const lat = parseNum($("bLat").value), lng = parseNum($("bLng").value), radius = parseNum($("bRad").value) || DEFAULT_RADIUS;
  if (!id || !name) return msg("bMsg", "กรอกรหัสและชื่อสาขา");
  if (/[\/]/.test(id)) return msg("bMsg", "รหัสสาขาห้ามมีเครื่องหมาย /");
  if ((lat === null) !== (lng === null)) return msg("bMsg", "กรอก Latitude และ Longitude ให้ครบทั้งคู่");
  if (lat !== null && (lat < 5 || lat > 21 || lng < 97 || lng > 106)) return msg("bMsg", "พิกัดไม่อยู่ในประเทศไทย ตรวจสอบอีกครั้ง (lat ก่อน lng)");
  busy($("btnBSave"), true);
  try { await setDoc(doc(db, "branches", id), { name, lat, lng, radius }); msg("bMsg", "บันทึกแล้ว", "ok"); clearBranchForm(); await loadBranches(); }
  catch (e) { msg("bMsg", errText(e)); }
  finally { busy($("btnBSave"), false); }
};
function clearBranchForm() { ["bCode", "bName", "bLat", "bLng", "bRad"].forEach((i) => ($(i).value = "")); $("bCode").disabled = false; }
$("btnBClear").onclick = clearBranchForm;
$("btnBHere").onclick = () => {
  msg("bMsg", "กำลังหาตำแหน่ง...", "ok");
  navigator.geolocation.getCurrentPosition(
    (p) => { $("bLat").value = p.coords.latitude.toFixed(6); $("bLng").value = p.coords.longitude.toFixed(6); msg("bMsg", `ได้ตำแหน่งแล้ว (ความแม่นยำ ±${Math.round(p.coords.accuracy)} ม.)`, "ok"); },
    () => msg("bMsg", "หาตำแหน่งไม่ได้ — อนุญาตการใช้ตำแหน่งในเบราว์เซอร์ก่อน"),
    { enableHighAccuracy: true, timeout: 20000 }
  );
};
$("tBranches").addEventListener("click", async (e) => {
  const ed = e.target.dataset.bedit, del = e.target.dataset.bdel;
  if (ed) {
    const b = branches.find((x) => x.id === ed);
    $("bCode").value = b.id; $("bCode").disabled = true; $("bName").value = b.name || "";
    $("bLat").value = b.lat ?? ""; $("bLng").value = b.lng ?? ""; $("bRad").value = b.radius || DEFAULT_RADIUS;
    $("bFormTitle").scrollIntoView({ behavior: "smooth" });
  }
  if (del && confirm(`ลบสาขา ${del}?`)) { await deleteDoc(doc(db, "branches", del)); loadBranches(); }
});
$("btnBSeed").onclick = () => { $("bBulk").value = SEED_BRANCHES; };
$("btnBBulk").onclick = async () => {
  const lines = $("bBulk").value.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return msg("bBulkMsg", "ยังไม่มีข้อมูล");
  const batch = writeBatch(db); let n = 0; const bad = [];
  for (const l of lines) {
    const [id, name, la, ln, r] = l.split(/\t|,/).map((s) => (s || "").trim());
    if (!id || !name) { bad.push(l); continue; }
    batch.set(doc(db, "branches", id), { name, lat: parseNum(la), lng: parseNum(ln), radius: parseNum(r) || DEFAULT_RADIUS }, { merge: true });
    n++;
  }
  try { await batch.commit(); msg("bBulkMsg", `นำเข้า ${n} สาขา` + (bad.length ? ` · ข้าม ${bad.length} บรรทัดที่ข้อมูลไม่ครบ` : ""), "ok"); loadBranches(); }
  catch (e) { msg("bBulkMsg", errText(e)); }
};

/* ================= พนักงาน ================= */
let editingUid = null;
async function loadUsers() {
  users = (await getDocs(collection(db, "users"))).docs.map((d) => ({ uid: d.id, ...d.data() }))
    .sort((a, b) => String(a.name).localeCompare(String(b.name), "th"));
  $("uCount").textContent = users.length;
  $("tUsers").innerHTML = `<tr><th>ชื่อ</th><th>รหัส</th><th>อีเมล</th><th>ตำแหน่ง</th><th>สาขาประจำ</th><th>สิทธิ์</th><th>สถานะ</th><th>เครื่อง</th><th></th></tr>` +
    users.map((u) => `<tr>
      <td>${esc(u.name)}</td><td>${esc(u.empId)}</td><td>${esc(u.email)}</td><td>${esc(u.position)}</td><td>${esc(bName(u.branchId))}</td>
      <td>${u.role === "admin" ? "หัวหน้า" : "พนักงาน"}</td>
      <td>${u.active === false ? `<span class="tag off">ระงับ</span>` : u.mustChangePassword ? `<span class="tag warn">ยังไม่เข้าครั้งแรก</span>` : `<span class="tag in">ใช้งาน</span>`}</td>
      <td>${u.deviceId ? "ผูกแล้ว" : "-"}</td>
      <td class="actions">
        <button class="btn sm" data-uedit="${u.uid}">แก้ไข</button>
        <button class="btn sm" data-ureset="${u.uid}">รีเซ็ตเครื่อง</button>
        <button class="btn sm" data-upw="${u.uid}">ส่งลิงก์ตั้งรหัสใหม่</button>
        <button class="btn sm ${u.active === false ? "" : "danger"}" data-uact="${u.uid}">${u.active === false ? "เปิดใช้งาน" : "ระงับ"}</button>
      </td></tr>`).join("");
}
function genPw() { const c = "abcdefghjkmnpqrstuvwxyz23456789"; return Array.from({ length: 8 }, () => c[Math.floor(Math.random() * c.length)]).join(""); }
$("btnUGen").onclick = () => { $("uPw").value = genPw(); };

async function createAuthUser(email, pw) {
  const sec = initializeApp(firebaseConfig, "sec-" + Date.now() + Math.random());
  const sa = getAuth(sec);
  try { return (await createUserWithEmailAndPassword(sa, email, pw)).user.uid; }
  finally { try { await signOut(sa); } catch {} await deleteApp(sec); }
}
async function addUser(d, pw) {
  const uid = await createAuthUser(d.email, pw);
  await setDoc(doc(db, "users", uid), { ...d, active: true, mustChangePassword: true, deviceId: "", createdAt: serverTimestamp() });
}
function resetUserForm() {
  editingUid = null;
  ["uName", "uEmp", "uEmail", "uPw", "uPos"].forEach((i) => ($(i).value = ""));
  $("uEmail").disabled = false; $("uPw").disabled = false; $("uRole").value = "staff"; $("uBranch").value = "";
  $("uFormTitle").textContent = "เพิ่มพนักงาน"; $("btnUSave").textContent = "เพิ่มพนักงาน"; $("btnUCancel").classList.add("hidden");
}
$("btnUCancel").onclick = resetUserForm;
$("btnUSave").onclick = async () => {
  const d = { name: $("uName").value.trim(), empId: $("uEmp").value.trim(), email: $("uEmail").value.trim().toLowerCase(), position: $("uPos").value.trim(), branchId: $("uBranch").value, role: $("uRole").value };
  if (!d.name) return msg("uMsg", "กรอกชื่อ-นามสกุล");
  busy($("btnUSave"), true);
  try {
    if (editingUid) {
      const { email, ...rest } = d;
      await updateDoc(doc(db, "users", editingUid), rest);
      msg("uMsg", "บันทึกการแก้ไขแล้ว", "ok");
    } else {
      const pw = $("uPw").value.trim();
      if (!d.email) throw { message: "กรอกอีเมล" };
      if (pw.length < 6) throw { message: "รหัสผ่านเริ่มต้นต้องมีอย่างน้อย 6 ตัว" };
      await addUser(d, pw);
      msg("uMsg", `เพิ่ม ${d.name} แล้ว — แจ้งพนักงาน: อีเมล ${d.email} / รหัสผ่านเริ่มต้น ${pw}`, "ok");
    }
    resetUserForm(); await loadUsers();
  } catch (e) { msg("uMsg", errText(e)); }
  finally { busy($("btnUSave"), false); }
};
$("btnUBulk").onclick = async () => {
  const pw = $("uBulkPw").value.trim();
  if (pw.length < 6) return msg("uBulkMsg", "รหัสผ่านเริ่มต้นต้องมีอย่างน้อย 6 ตัว");
  const lines = $("uBulk").value.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return msg("uBulkMsg", "ยังไม่มีข้อมูล");
  busy($("btnUBulk"), true);
  let ok = 0; const fail = [];
  for (const l of lines) {
    const [name, empId, email, position, branchId] = l.split(/\t|,/).map((s) => (s || "").trim());
    if (!name || !email) { fail.push(`${l} (ข้อมูลไม่ครบ)`); continue; }
    try { await addUser({ name, empId, email: email.toLowerCase(), position, branchId: branchId || "", role: "staff" }, pw); ok++; msg("uBulkMsg", `กำลังเพิ่ม... ${ok}/${lines.length}`, "ok"); }
    catch (e) { fail.push(`${email} (${errText(e)})`); }
  }
  busy($("btnUBulk"), false);
  msg("uBulkMsg", `เพิ่มสำเร็จ ${ok} คน` + (fail.length ? ` · ไม่สำเร็จ: ${fail.join(" | ")}` : ""), fail.length ? "err" : "ok");
  loadUsers();
};
$("tUsers").addEventListener("click", async (e) => {
  const t = e.target.dataset; const u = users.find((x) => x.uid === (t.uedit || t.ureset || t.upw || t.uact));
  if (!u) return;
  try {
    if (t.uedit) {
      editingUid = u.uid;
      $("uName").value = u.name || ""; $("uEmp").value = u.empId || ""; $("uEmail").value = u.email || ""; $("uEmail").disabled = true;
      $("uPw").value = ""; $("uPw").disabled = true; $("uPos").value = u.position || ""; $("uBranch").value = u.branchId || ""; $("uRole").value = u.role || "staff";
      $("uFormTitle").textContent = "แก้ไข: " + u.name; $("btnUSave").textContent = "บันทึกการแก้ไข"; $("btnUCancel").classList.remove("hidden");
      $("uFormTitle").scrollIntoView({ behavior: "smooth" });
    } else if (t.ureset) {
      if (!confirm(`รีเซ็ตเครื่องของ ${u.name}? เครื่องถัดไปที่เข้าใช้งาน (มือถือ) จะถูกผูกอัตโนมัติ`)) return;
      await updateDoc(doc(db, "users", u.uid), { deviceId: "" }); loadUsers();
    } else if (t.upw) {
      await sendPasswordResetEmail(auth, u.email); alert(`ส่งลิงก์ตั้งรหัสผ่านใหม่ไปที่ ${u.email} แล้ว`);
    } else if (t.uact) {
      await updateDoc(doc(db, "users", u.uid), { active: u.active === false }); loadUsers();
    }
  } catch (err) { alert(errText(err)); }
});

/* ================= คำขอเปลี่ยนเครื่อง ================= */
async function loadDevices() {
  try {
    const reqs = (await getDocs(collection(db, "deviceRequests"))).docs.map((d) => ({ uid: d.id, ...d.data() }));
    $("devBadge").textContent = reqs.length; $("devBadge").classList.toggle("hidden", !reqs.length);
    $("tDev").innerHTML = reqs.length
      ? `<tr><th>ชื่อ</th><th>อีเมล</th><th>ประเภทเครื่อง</th><th>เวลาขอ</th><th>รายละเอียดเครื่อง</th><th></th></tr>` +
        reqs.map((r) => `<tr><td>${esc(r.name)}</td><td>${esc(r.email)}</td><td>${r.mobile ? "มือถือ/แท็บเล็ต" : "<b>คอมพิวเตอร์</b>"}</td>
          <td>${fmtDateTime(r.at && r.at.toDate())}</td><td class="wrap-txt muted">${esc((r.ua || "").slice(0, 120))}</td>
          <td class="actions"><button class="btn sm primary" data-ok="${r.uid}">อนุมัติ</button><button class="btn sm danger" data-no="${r.uid}">ปฏิเสธ</button></td></tr>`).join("")
      : `<tr><td class="muted">ไม่มีคำขอ</td></tr>`;
    $("tDev").onclick = async (e) => {
      const ok = e.target.dataset.ok, no = e.target.dataset.no;
      try {
        if (ok) { const r = reqs.find((x) => x.uid === ok); await updateDoc(doc(db, "users", ok), { deviceId: r.deviceId }); await deleteDoc(doc(db, "deviceRequests", ok)); }
        if (no) await deleteDoc(doc(db, "deviceRequests", no));
        if (ok || no) { loadDevices(); loadUsers(); }
      } catch (err) { alert(errText(err)); }
    };
  } catch (e) { $("tDev").innerHTML = `<tr><td class="msg err">${esc(errText(e))}</td></tr>`; }
}
$("btnDevReload").onclick = loadDevices;

/* ================= รายงาน ================= */
const dayStart = (s) => new Date(s + "T00:00:00+07:00");
async function runReport() {
  const from = $("rFrom").value, to = $("rTo").value;
  if (!from || !to) return msg("rMsg", "เลือกช่วงวันที่");
  const start = dayStart(from), end = new Date(dayStart(to).getTime() + 86400000);
  if (end <= start) return msg("rMsg", "วันที่เริ่มต้องไม่เกินวันที่สิ้นสุด");
  if ((end - start) / 86400000 > 62) return msg("rMsg", "เลือกช่วงไม่เกิน 62 วันต่อครั้ง");
  busy($("btnReport"), true, "กำลังโหลด...");
  try {
    const q = query(collection(db, "checkins"), where("ts", ">=", Timestamp.fromDate(start)), where("ts", "<", Timestamp.fromDate(end)), orderBy("ts", "desc"));
    reportRows = (await getDocs(q)).docs.map((d) => ({ id: d.id, ...d.data(), t: d.data().ts ? d.data().ts.toDate() : null }));
    msg("rMsg", "");
    renderReport();
  } catch (e) { msg("rMsg", errText(e)); }
  finally { busy($("btnReport"), false); }
}
function filtered() {
  const br = $("rBranch").value, ty = $("rType").value, s = $("rSearch").value.trim().toLowerCase();
  return reportRows.filter((r) => (!br || r.branchId === br) && (!ty || r.type === ty) && (!s || `${r.name} ${r.empId}`.toLowerCase().includes(s)));
}
function summarize(rows) {
  const m = new Map();
  for (const r of rows) {
    const k = r.uid + "|" + r.day;
    if (!m.has(k)) m.set(k, { day: r.day, name: r.name, empId: r.empId, position: r.position, branches: new Set(), firstIn: null, lastOut: null, count: 0 });
    const g = m.get(k); g.count++; g.branches.add(r.branchName);
    if (r.type === "in" && r.t && (!g.firstIn || r.t < g.firstIn)) g.firstIn = r.t;
    if (r.type === "out" && r.t && (!g.lastOut || r.t > g.lastOut)) g.lastOut = r.t;
  }
  return [...m.values()].map((g) => ({ ...g, branches: [...g.branches].join(", "),
    hours: g.firstIn && g.lastOut && g.lastOut > g.firstIn ? ((g.lastOut - g.firstIn) / 3600000) : null }))
    .sort((a, b) => b.day.localeCompare(a.day) || String(a.name).localeCompare(String(b.name), "th"));
}
function renderReport() {
  const rows = filtered(), sum = summarize(rows);
  const people = new Set(rows.map((r) => r.uid)).size;
  const noOut = sum.filter((s) => s.firstIn && !s.lastOut).length;
  $("rStats").innerHTML = `<div class="stat"><span class="muted">รายการทั้งหมด</span><b>${rows.length}</b></div>
    <div class="stat"><span class="muted">จำนวนคน</span><b>${people}</b></div>
    <div class="stat"><span class="muted">เข้างาน</span><b>${rows.filter((r) => r.type === "in").length}</b></div>
    <div class="stat"><span class="muted">ออกงาน</span><b>${rows.filter((r) => r.type === "out").length}</b></div>
    <div class="stat"><span class="muted">ยังไม่ลงออกงาน (คน-วัน)</span><b>${noOut}</b></div>`;
  $("tSum").innerHTML = `<tr><th>วันที่</th><th>ชื่อ</th><th>รหัส</th><th>สาขา</th><th>เข้างาน</th><th>ออกงาน</th><th>ชั่วโมง</th></tr>` +
    (sum.map((s) => `<tr><td>${s.day}</td><td>${esc(s.name)}</td><td>${esc(s.empId)}</td><td>${esc(s.branches)}</td>
      <td>${s.firstIn ? fmtTime(s.firstIn) : `<span class="tag warn">ไม่มี</span>`}</td>
      <td>${s.lastOut ? fmtTime(s.lastOut) : `<span class="tag warn">ไม่มี</span>`}</td>
      <td>${s.hours != null ? s.hours.toFixed(2) : "-"}</td></tr>`).join("") || `<tr><td class="muted" colspan="7">ไม่มีข้อมูล</td></tr>`);
  $("tRaw").innerHTML = `<tr><th>รูป</th><th>วัน-เวลา</th><th>ชื่อ</th><th>ประเภท</th><th>สาขา</th><th>ระยะ</th><th>ท่า</th><th>แผนที่</th></tr>` +
    (rows.map((r) => `<tr>
      <td>${r.photo ? `<img class="thumb" loading="lazy" src="${r.photo}" data-cap="${esc(r.name)} · ${esc(r.gesture)} · ${esc(fmtDateTime(r.t))}">` : `<span class="muted">ลบแล้ว</span>`}</td>
      <td>${fmtDateTime(r.t)}</td><td>${esc(r.name)}</td>
      <td><span class="tag ${r.type}">${r.type === "in" ? "เข้างาน" : "ออกงาน"}</span></td>
      <td>${esc(r.branchName)}</td><td>${r.distance ?? "-"} ม. (±${r.accuracy ?? "-"})</td><td>${esc(r.gesture)}</td>
      <td><a href="https://www.google.com/maps?q=${r.lat},${r.lng}" target="_blank" rel="noopener">ดู</a></td></tr>`).join("") || `<tr><td class="muted" colspan="8">ไม่มีข้อมูล</td></tr>`);
}
$("btnReport").onclick = runReport;
["rBranch", "rType"].forEach((i) => $(i).addEventListener("change", renderReport));
$("rSearch").addEventListener("input", renderReport);

function downloadCsv(name, header, rows) {
  const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = "﻿" + [header, ...rows].map((r) => r.map(q).join(",")).join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
$("btnCsvSum").onclick = () => {
  const s = summarize(filtered());
  downloadCsv(`${bkkDay()}_สรุปเข้าออกงาน_${$("rFrom").value}_${$("rTo").value}.csv`,
    ["วันที่", "ชื่อ", "รหัสพนักงาน", "ตำแหน่ง", "สาขา", "เข้างาน", "ออกงาน", "ชั่วโมง"],
    s.map((x) => [x.day, x.name, x.empId, x.position, x.branches, x.firstIn ? fmtTime(x.firstIn) : "", x.lastOut ? fmtTime(x.lastOut) : "", x.hours != null ? x.hours.toFixed(2) : ""]));
};
$("btnCsvRaw").onclick = () => {
  downloadCsv(`${bkkDay()}_รายการเข้าออกงาน_${$("rFrom").value}_${$("rTo").value}.csv`,
    ["วันที่", "เวลา", "ชื่อ", "รหัสพนักงาน", "ประเภท", "รหัสสาขา", "สาขา", "ระยะจากสาขา(ม.)", "ความแม่นยำ GPS(ม.)", "ท่า", "lat", "lng"],
    filtered().slice().reverse().map((r) => [r.day, fmtTime(r.t), r.name, r.empId, r.type === "in" ? "เข้างาน" : "ออกงาน", r.branchId, r.branchName, r.distance, r.accuracy, r.gesture, r.lat, r.lng]));
};

/* ================= ลบรูปเก่า ================= */
$("btnPurge").onclick = async () => {
  const days = parseInt($("pDays").value, 10);
  if (!(days >= 7)) return msg("pMsg", "กำหนดอย่างน้อย 7 วัน");
  if (!confirm(`ลบรูปเซลฟี่ที่เก่ากว่า ${days} วัน? (กู้คืนไม่ได้)`)) return;
  const cutoff = Timestamp.fromDate(new Date(Date.now() - days * 86400000));
  busy($("btnPurge"), true);
  let total = 0;
  try {
    let lastDoc = null;
    for (;;) {
      const parts = [collection(db, "checkins"), where("ts", "<", cutoff), orderBy("ts")];
      if (lastDoc) parts.push(startAfter(lastDoc));
      parts.push(limit(300));
      const snap = await getDocs(query(...parts));
      if (snap.empty) break;
      lastDoc = snap.docs[snap.docs.length - 1];
      const withPhoto = snap.docs.filter((d) => d.data().photo);
      if (withPhoto.length) {
        const batch = writeBatch(db);
        withPhoto.forEach((d) => batch.update(d.ref, { photo: null }));
        await batch.commit(); total += withPhoto.length;
        msg("pMsg", `ลบแล้ว ${total} รูป...`, "ok");
      }
      if (snap.size < 300) break;
    }
    msg("pMsg", `เสร็จแล้ว ลบรูปทั้งหมด ${total} รูป`, "ok");
  } catch (e) { msg("pMsg", errText(e)); }
  finally { busy($("btnPurge"), false); }
};
