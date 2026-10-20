import { auth, db, $, haversine, fmtDist, getDeviceId, isMobile, isInAppBrowser, bkkDay, fmtTime, fmtDateLong, GESTURES, errText, esc, busy,
  normCode, shiftInfo, shiftLabel, displayCode, shiftWindow, mergeDays, deviceInfo, LATE_GRACE_MIN, SHIFT_CHOICES } from "./common.js";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, updatePassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, getDocs, setDoc, updateDoc, collection, query, where, serverTimestamp, writeBatch } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const SCREENS = ["scInApp", "scLoading", "scLogin", "scChangePw", "scDevice", "scBlocked", "scAdmin", "scMain"];
function screen(id) {
  SCREENS.forEach((s) => $(s).classList.toggle("hidden", s !== id));
  $("btnLogout").classList.toggle("hidden", !["scChangePw", "scDevice", "scBlocked", "scAdmin", "scMain"].includes(id));
}
function msg(id, text, kind = "err") { const el = $(id); el.textContent = text || ""; el.className = "msg " + kind; }

const deviceId = getDeviceId();
const MAX_DEVICES = 2;
const NOTE_MIN = 10;
let me = null, profile = null, branches = [], type = "in", lockedType = null;
let pos = null, watchId = null, inRange = false, dist = null;
let stream = null, gesture = null, photo = null, todayCode = "", beauty = true;
let monthDays = {};   // กะของเดือนนี้ (รวมรายการที่สลับแล้ว)

/* ---------- เริ่มต้น ---------- */
if (isInAppBrowser()) {
  screen("scInApp");
  $("btnCopyLink").onclick = async () => {
    try { await navigator.clipboard.writeText(location.href); msg("copyMsg", "คัดลอกแล้ว นำไปวางใน Safari หรือ Chrome", "ok"); }
    catch { msg("copyMsg", location.href, "ok"); }
  };
} else {
  screen("scLoading");
  onAuthStateChanged(auth, onUser);
}

async function onUser(user) {
  stopAll();
  me = user;
  if (!user) { screen("scLogin"); return; }
  screen("scLoading");
  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (!snap.exists()) return blocked("บัญชีนี้ยังไม่ได้ลงทะเบียนในระบบ กรุณาติดต่อหัวหน้า");
    profile = snap.data();
    if (profile.active === false) return blocked("บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อหัวหน้า");
    if (profile.mustChangePassword) { screen("scChangePw"); return; }
    if (["rm", "admin", "am"].includes(profile.role)) { screen("scAdmin"); return; }
    await checkDevice();
  } catch (e) { blocked(errText(e)); }
}
function blocked(text) { $("blkText").textContent = text; screen("scBlocked"); }
$("btnAdminTest").onclick = async () => { try { await checkDevice(); } catch (e) { blocked(errText(e)); } };

/* ---------- ล็อกอิน ---------- */
$("btnLogin").onclick = async () => {
  const email = $("liEmail").value.trim(), pw = $("liPw").value;
  if (!email || !pw) return msg("liMsg", "กรุณากรอกอีเมลและรหัสผ่าน");
  busy($("btnLogin"), true);
  try { await signInWithEmailAndPassword(auth, email, pw); msg("liMsg", ""); }
  catch (e) { msg("liMsg", errText(e)); }
  finally { busy($("btnLogin"), false); }
};
$("liPw").addEventListener("keydown", (e) => { if (e.key === "Enter") $("btnLogin").click(); });
$("btnForgot").onclick = async () => {
  const email = $("liEmail").value.trim();
  if (!email) return msg("liMsg", "กรอกอีเมลของคุณในช่องด้านบนก่อน แล้วกด \"ลืมรหัสผ่าน\" อีกครั้ง");
  try { await sendPasswordResetEmail(auth, email); msg("liMsg", "ส่งลิงก์ตั้งรหัสผ่านใหม่ไปที่อีเมลแล้ว (ตรวจในกล่อง Junk/Spam ด้วย)", "ok"); }
  catch (e) { msg("liMsg", errText(e)); }
};
$("btnLogout").onclick = () => { stopAll(); signOut(auth); };

/* ---------- เปลี่ยนรหัสผ่านครั้งแรก ---------- */
$("btnChangePw").onclick = async () => {
  const a = $("cpPw1").value, b = $("cpPw2").value;
  if (a.length < 6) return msg("cpMsg", "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
  if (a !== b) return msg("cpMsg", "รหัสผ่านทั้ง 2 ช่องไม่ตรงกัน");
  busy($("btnChangePw"), true);
  try {
    await updatePassword(me, a);
    await updateDoc(doc(db, "users", me.uid), { mustChangePassword: false });
    profile.mustChangePassword = false;
    msg("cpMsg", "");
    if (["rm", "admin", "am"].includes(profile.role)) { screen("scAdmin"); return; }
    await checkDevice();
  } catch (e) { msg("cpMsg", errText(e)); }
  finally { busy($("btnChangePw"), false); }
};

/* ---------- ตรวจเครื่อง: มือถือ 1 เครื่องผูกได้ 2 ที่ (เช่น Safari + ไอคอนหน้าจอโฮม) ---------- */
async function checkDevice() {
  const snap = await getDoc(doc(db, "users", me.uid));
  profile = snap.data();
  if (profile.active === false) return blocked("บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อหัวหน้า");
  const ids = Array.isArray(profile.deviceIds) && profile.deviceIds.length ? [...profile.deviceIds] : (profile.deviceId ? [profile.deviceId] : []);
  const info = await deviceInfo();
  if (!ids.includes(deviceId)) {
    if (!isMobile()) return requestDevice("คอมพิวเตอร์ต้องได้รับอนุมัติจากหัวหน้าก่อนใช้งาน ระบบส่งคำขอให้หัวหน้าแล้ว", info);
    if (ids.length < MAX_DEVICES) {
      const upd = { deviceIds: [...ids, deviceId], [`devices.${deviceId}`]: { ...info, at: serverTimestamp() } };
      if (!profile.deviceId) upd.deviceId = deviceId;
      await updateDoc(doc(db, "users", me.uid), upd);
      ids.push(deviceId);
    }
  } else if (!(profile.devices && profile.devices[deviceId])) {
    // เครื่องที่ผูกไว้ก่อนมีระบบเก็บรายละเอียด → บันทึกรายละเอียดเพิ่ม
    try { await updateDoc(doc(db, "users", me.uid), { [`devices.${deviceId}`]: { ...info, at: serverTimestamp() } }); } catch (e) {}
  }
  if (!ids.includes(deviceId)) {
    return requestDevice("มือถือนี้ผูกครบ 2 ที่แล้ว / เปลี่ยนเครื่อง / ล้างข้อมูลเบราว์เซอร์ — ระบบส่งคำขอให้หัวหน้าอนุมัติแล้ว", info);
  }
  enterMain();
}
async function requestDevice(text, info) {
  await setDoc(doc(db, "deviceRequests", me.uid), {
    deviceId, ua: navigator.userAgent.slice(0, 300), name: profile.name || "", email: me.email || "",
    mobile: isMobile(), zoneId: profile.zoneId || "", info: info || {}, at: serverTimestamp()
  });
  $("devText").textContent = text;
  screen("scDevice");
}
$("btnDevRecheck").onclick = async () => {
  busy($("btnDevRecheck"), true);
  try { await checkDevice(); } catch (e) { $("devText").textContent = errText(e); }
  finally { busy($("btnDevRecheck"), false); }
};

/* ---------- หน้าหลัก ---------- */
async function enterMain() {
  screen("scMain");
  $("mName").textContent = profile.name || me.email;
  $("mPos").textContent = [profile.position, profile.empId ? "รหัส " + profile.empId : ""].filter(Boolean).join(" · ");
  $("mDate").textContent = fmtDateLong();
  const bs = await getDocs(collection(db, "branches"));
  branches = bs.docs.map((d) => ({ id: d.id, ...d.data() }))
    .filter((b) => typeof b.lat === "number" && typeof b.lng === "number")
    .sort((a, b) => String(a.name).localeCompare(String(b.name), "th"));
  const sel = $("mBranch");
  sel.innerHTML = branches.map((b) => `<option value="${esc(b.id)}">${esc(b.name)} (${esc(b.id)})</option>`).join("")
    || `<option value="">— ยังไม่มีสาขาที่ตั้งพิกัดไว้ —</option>`;
  if (profile.branchId && branches.some((b) => b.id === profile.branchId)) sel.value = profile.branchId;
  sel.onchange = updateLoc;
  applyLock();
  resetPhoto();
  startGeo();
  loadToday();
  await loadShift();
  loadRequests();
  loadHistory();
}

// บังคับสลับ: ล่าสุดเข้างาน → ต้องออกงาน, ล่าสุดออกงาน → ต้องเข้างาน
function applyLock() {
  lockedType = profile.lastType === "in" ? "out" : "in";
  [...$("segType").children].forEach((b) => { b.disabled = b.dataset.v !== lockedType; });
  setType(lockedType);
  const lt = profile.lastAt && profile.lastAt.toDate ? profile.lastAt.toDate() : null;
  $("mState").textContent = profile.lastType === "in"
    ? `สถานะ: เข้างานแล้ว${lt ? " เมื่อ " + new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "short", timeStyle: "short" }).format(lt) : ""} — กดได้เฉพาะ "ออกงาน"`
    : "สถานะ: ยังไม่ได้เข้างาน — กดได้เฉพาะ \"เข้างาน\"";
}

async function loadShift() {
  const el = $("mShift");
  el.classList.add("hidden"); todayCode = ""; monthDays = {};
  if (!profile.phoneKey) return;
  const day = bkkDay(), key = `${day.slice(0, 7)}_${profile.phoneKey}`;
  let s = null, o = null;
  try { const x = await getDoc(doc(db, "shifts", key)); if (x.exists()) s = x.data(); } catch (e) {}
  try { const x = await getDoc(doc(db, "shiftOverrides", key)); if (x.exists()) o = x.data(); } catch (e) {}
  if (!s && !o) return;
  monthDays = mergeDays(s, o);
  todayCode = normCode(monthDays[day]);
  const info = shiftInfo(todayCode);
  el.textContent = "🕘 วันนี้: " + shiftLabel(todayCode);
  el.className = "loc " + (info && info.off ? "bad" : "ok");
  fillRequestForm();
}
const curBranch = () => branches.find((b) => b.id === $("mBranch").value);

$("segType").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b && !b.disabled) setType(b.dataset.v); });
function setType(v) {
  type = v;
  [...$("segType").children].forEach((b) => b.classList.toggle("on", b.dataset.v === v));
  const out = v === "out";
  $("camCard").classList.toggle("hidden", out);
  $("outNoPhoto").classList.toggle("hidden", !out);
  $("offWrap").classList.toggle("hidden", out);
  if (out) { $("mOff").checked = false; stopCam(); }
  updateLoc();
}

/* ---------- GPS ---------- */
function setLoc(kind, text) { const el = $("locBox"); el.className = "loc " + kind; el.textContent = text; }
function startGeo() {
  if (!("geolocation" in navigator)) { setLoc("bad", "✗ อุปกรณ์นี้ไม่รองรับการหาตำแหน่ง"); return; }
  setLoc("wait", "📍 กำลังหาตำแหน่ง...");
  watchId = navigator.geolocation.watchPosition(
    (p) => { pos = p.coords; updateLoc(); },
    (e) => {
      pos = null; inRange = false;
      setLoc("bad", e.code === 1
        ? "✗ ไม่ได้รับอนุญาตให้ใช้ตำแหน่ง — เปิด Location ในเครื่อง และกดอนุญาตในเบราว์เซอร์"
        : "✗ หาตำแหน่งไม่ได้ — เปิด Location แล้วเดินไปใกล้หน้าต่างหรือที่โล่ง");
      refresh();
    },
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
  );
}
const isOff = () => type === "in" && $("mOff").checked;
const noteText = () => $("mNote").value.trim();
// ต้องใส่เหตุผลเมื่อ: เข้างานนอกสถานที่ หรือ ออกงานนอกพื้นที่สาขา
const needNote = () => isOff() || (type === "out" && !!pos && !inRange);
function updateLoc() {
  const b = curBranch(), off = isOff();
  if (!b) { inRange = false; setLoc("bad", "✗ ยังไม่ได้เลือกสาขา"); return refresh(); }
  if (pos) {
    dist = haversine(pos.latitude, pos.longitude, b.lat, b.lng);
    const r = b.radius || 200, acc = Math.round(pos.accuracy);
    inRange = dist <= r;
    if (off) setLoc("wait", `📍 นอกสถานที่ — ห่างสาขา ${fmtDist(dist)} (±${acc} ม.) · ระบบบันทึกพิกัดจริงให้หัวหน้าตรวจ`);
    else if (inRange) setLoc("ok", `✓ อยู่ในพื้นที่สาขา (ห่าง ${Math.round(dist)} ม. · ความแม่นยำ ±${acc} ม.)`);
    else if (type === "out") setLoc("wait", `📍 ออกงานนอกพื้นที่สาขา — ห่าง ${fmtDist(dist)} · กรุณาระบุเหตุผล ระบบจะแจ้งหัวหน้าตรวจ`);
    else setLoc("bad", `✗ อยู่นอกพื้นที่สาขา — ห่าง ${fmtDist(dist)} (กำหนด ${r} ม. · ±${acc} ม.) · ถ้าทำงานนอกสถานที่ ให้ติ๊กช่องด้านล่าง`);
  }
  const need = needNote();
  $("noteReq").textContent = need ? `(จำเป็น — อย่างน้อย ${NOTE_MIN} ตัวอักษร)` : "(ไม่บังคับ)";
  $("noteReq").className = need ? "msg err" : "";
  $("noteChips").classList.toggle("hidden", !need);
  refresh();
}
$("mOff").addEventListener("change", updateLoc);
$("mNote").addEventListener("input", refresh);
$("noteChips").addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  const cur = noteText();
  $("mNote").value = cur && !cur.startsWith(b.textContent) ? `${b.textContent} — ${cur}` : `${b.textContent} — `;
  $("mNote").focus(); refresh();
});

/* ---------- กล้อง (เฉพาะเข้างาน) ---------- */
async function openCam() {
  msg("mMsg", "");
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 960 } }, audio: false });
    const v = $("video");
    v.srcObject = stream;
    v.classList.toggle("beauty", beauty);
    await v.play();
    gesture = GESTURES[Math.floor(Math.random() * GESTURES.length)];
    $("gesture").innerHTML = `<span class="e">${gesture.emoji}</span>ทำท่า: ${esc(gesture.text)} แล้วกดถ่ายรูป`;
    $("gesture").classList.remove("hidden");
    v.classList.remove("hidden"); $("camPh").classList.add("hidden"); $("shot").classList.add("hidden");
    $("btnCam").classList.add("hidden"); $("btnShoot").classList.remove("hidden"); $("btnRetake").classList.add("hidden");
  } catch (e) {
    msg("mMsg", "เปิดกล้องไม่ได้ — ตรวจสอบว่าเปิดด้วย Safari/Chrome และกดอนุญาตกล้องแล้ว");
  }
}
function stopCam() {
  if (stream) stream.getTracks().forEach((t) => t.stop());
  stream = null;
  $("video").classList.add("hidden");
}
function resetPhoto() {
  stopCam(); photo = null; gesture = null;
  $("shot").classList.add("hidden"); $("shot").removeAttribute("src");
  $("camPh").classList.remove("hidden"); $("gesture").classList.add("hidden");
  $("btnCam").classList.remove("hidden"); $("btnShoot").classList.add("hidden"); $("btnRetake").classList.add("hidden");
  refresh();
}
$("btnCam").onclick = openCam;
$("btnRetake").onclick = () => { resetPhoto(); openCam(); };
$("btnFilter").onclick = () => {
  beauty = !beauty;
  $("btnFilter").textContent = `✨ ฟิลเตอร์หน้าสวย: ${beauty ? "เปิด" : "ปิด"}`;
  $("video").classList.toggle("beauty", beauty);
};
$("btnShoot").onclick = () => {
  const v = $("video");
  if (!v.videoWidth) return;
  const W = 480, H = Math.round(W * (v.videoHeight / v.videoWidth));
  const c = $("canvas"), ctx = c.getContext("2d");
  c.width = W; c.height = H;
  ctx.save(); ctx.translate(W, 0); ctx.scale(-1, 1);
  if (beauty) {
    // ฟิลเตอร์อ่อน: สว่างขึ้นเล็กน้อย + ผิวนุ่ม (ซ้อนภาพเบลอบางๆ) — ยังจำหน้าได้ชัด
    ctx.filter = "brightness(1.08) contrast(0.94) saturate(1.06)";
    ctx.drawImage(v, 0, 0, W, H);
    ctx.globalAlpha = 0.28; ctx.filter = "blur(2px) brightness(1.1)";
    ctx.drawImage(v, 0, 0, W, H);
    ctx.globalAlpha = 1; ctx.filter = "none";
  } else ctx.drawImage(v, 0, 0, W, H);
  ctx.restore();
  const b = curBranch();
  ctx.fillStyle = "rgba(0,0,0,.55)"; ctx.fillRect(0, H - 56, W, 56);
  ctx.fillStyle = "#fff"; ctx.font = "15px sans-serif";
  ctx.fillText(`${profile.name || ""} · ${b ? b.name : ""}`, 10, H - 33);
  ctx.fillText(`เข้างาน · ท่า: ${gesture.text} · ${new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}`, 10, H - 12);
  photo = c.toDataURL("image/jpeg", 0.6);
  stopCam();
  $("shot").src = photo; $("shot").classList.remove("hidden");
  $("btnShoot").classList.add("hidden"); $("btnRetake").classList.remove("hidden");
  refresh();
};
document.addEventListener("visibilitychange", () => { if (document.hidden && stream) resetPhoto(); });

/* ---------- ยืนยัน ---------- */
function canSubmit() {
  if (!pos || !curBranch() || type !== lockedType) return false;
  if (needNote() && noteText().length < NOTE_MIN) return false;
  if (type === "in") return !!photo && (isOff() || inRange);
  return true; // ออกงาน: ไม่ต้องถ่ายรูป (นอกพื้นที่ต้องมีเหตุผล)
}
function refresh() {
  const btn = $("btnSubmit");
  let t = "ยืนยัน" + (type === "in" ? "เข้างาน" : "ออกงาน");
  if (isOff()) t += " (นอกสถานที่)";
  else if (type === "out" && pos && !inRange) t += " (นอกพื้นที่)";
  btn.textContent = t;
  btn.disabled = !canSubmit();
}
$("btnSubmit").onclick = async () => {
  if (!canSubmit()) return;
  const b = curBranch(), note = noteText();
  const off = isOff() || (type === "out" && !inRange);
  busy($("btnSubmit"), true, "กำลังบันทึก...");
  msg("mMsg", "");
  try {
    const ref = doc(collection(db, "checkins"));
    const batch = writeBatch(db);
    if (type === "in") batch.set(doc(db, "checkinPhotos", ref.id), { uid: me.uid, ts: serverTimestamp(), photo });
    batch.set(ref, {
      uid: me.uid, name: profile.name || "", empId: profile.empId || "", position: profile.position || "",
      branchId: b.id, branchName: b.name || "", zoneId: b.zoneId || "", zm: `${b.zoneId || ""}_${bkkDay().slice(0, 7)}`, type, shiftCode: todayCode || "",
      ts: serverTimestamp(), day: bkkDay(),
      lat: pos.latitude, lng: pos.longitude, accuracy: Math.round(pos.accuracy), distance: Math.round(dist),
      gesture: type === "in" ? gesture.text : "", hasPhoto: type === "in", offsite: off, note, deviceId, ua: navigator.userAgent.slice(0, 300)
    });
    batch.update(doc(db, "users", me.uid), { lastType: type, lastAt: serverTimestamp() });
    await batch.commit();
    const s = await getDoc(ref);
    const t = s.data().ts && s.data().ts.toDate();
    profile.lastType = type; profile.lastAt = s.data().ts;
    $("doneText").innerHTML = `${type === "in" ? "เข้างาน" : "ออกงาน"} · ${off ? (type === "in" ? "นอกสถานที่" : "นอกพื้นที่สาขา") : esc(b.name)}<br>เวลา ${fmtTime(t)} น.`;
    $("mNote").value = ""; $("mOff").checked = false;
    $("done").classList.remove("hidden");
    resetPhoto();
    applyLock();
    loadToday(); loadHistory();
  } catch (e) {
    msg("mMsg", e && e.code === "permission-denied"
      ? "ระบบปฏิเสธการบันทึก — ตรวจสถานะเข้า/ออก (อาจกดซ้ำจากเครื่องอื่น) แล้วเปิดหน้านี้ใหม่ หรือแจ้งหัวหน้า"
      : errText(e));
  }
  finally { busy($("btnSubmit"), false); refresh(); }
};
$("btnDone").onclick = () => $("done").classList.add("hidden");

async function loadToday() {
  try {
    const q = query(collection(db, "checkins"), where("uid", "==", me.uid), where("day", "==", bkkDay()));
    const rows = (await getDocs(q)).docs.map((d) => d.data())
      .sort((a, b) => (a.ts ? a.ts.toMillis() : 0) - (b.ts ? b.ts.toMillis() : 0));
    $("today").innerHTML = rows.length
      ? rows.map((r) => `<li><span><span class="tag ${r.type}">${r.type === "in" ? "เข้างาน" : "ออกงาน"}</span> ${r.offsite ? `<span class="tag offsite">${r.type === "in" ? "นอกสถานที่" : "นอกพื้นที่"}</span>` : esc(r.branchName)}</span><b>${fmtTime(r.ts && r.ts.toDate())}</b></li>`).join("")
      : `<li class="muted">ยังไม่มีรายการ</li>`;
  } catch (e) { /* แสดงต่อได้แม้โหลดประวัติไม่สำเร็จ */ }
}

/* ---------- ขอสลับวัน / เปลี่ยนกะ ---------- */
let rqMode = "swap";
const dayLabel = (d) => new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", weekday: "short", day: "numeric", month: "short" }).format(new Date(d + "T12:00:00+07:00"));
function fillRequestForm() {
  const today = bkkDay();
  const days = Object.keys(monthDays).sort().filter((d) => d >= today);
  const opt = days.map((d) => `<option value="${d}">${dayLabel(d)} · ${esc(shiftLabel(monthDays[d]))}</option>`).join("") || `<option value="">— ยังไม่มีตารางกะ —</option>`;
  $("rqDayA").innerHTML = opt; $("rqDayB").innerHTML = opt;
  if (days[1]) $("rqDayB").value = days[1];
  $("rqCode").innerHTML = SHIFT_CHOICES.map((c) => `<option value="${c}">${esc(shiftLabel(c))}</option>`).join("");
}
$("rqMode").addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  rqMode = b.dataset.v;
  [...$("rqMode").children].forEach((x) => x.classList.toggle("on", x === b));
  $("rqBWrap").classList.toggle("hidden", rqMode !== "swap");
  $("rqCodeWrap").classList.toggle("hidden", rqMode !== "change");
});
$("btnRq").onclick = async () => {
  const a = $("rqDayA").value, reason = $("rqReason").value.trim();
  if (!a) return msg("rqMsg", "ยังไม่มีตารางกะเดือนนี้ — ติดต่อหัวหน้า");
  if (reason.length < 5) return msg("rqMsg", "กรุณาระบุเหตุผล");
  let changes;
  if (rqMode === "swap") {
    const bDay = $("rqDayB").value;
    if (!bDay || bDay === a) return msg("rqMsg", "เลือกวันที่ต้องการสลับให้ต่างกัน");
    changes = { [a]: normCode(monthDays[bDay] || ""), [bDay]: normCode(monthDays[a] || "") };
  } else changes = { [a]: $("rqCode").value };
  const from = {}; Object.keys(changes).forEach((d) => (from[d] = normCode(monthDays[d] || "")));
  busy($("btnRq"), true);
  try {
    await setDoc(doc(collection(db, "shiftRequests")), {
      uid: me.uid, name: profile.name || "", phoneKey: profile.phoneKey || "", zoneId: profile.zoneId || "",
      month: a.slice(0, 7), mode: rqMode, changes, from, reason, status: "pending", at: serverTimestamp()
    });
    msg("rqMsg", "ส่งคำขอแล้ว รอหัวหน้าอนุมัติ", "ok"); $("rqReason").value = "";
    loadRequests();
  } catch (e) { msg("rqMsg", errText(e)); }
  finally { busy($("btnRq"), false); }
};
const i_lbl = (c) => { const x = displayCode(c); return /^\d+$/.test(x) ? "กะ " + x : x; };
async function loadRequests() {
  try {
    const rows = (await getDocs(query(collection(db, "shiftRequests"), where("uid", "==", me.uid)))).docs.map((d) => d.data())
      .sort((a, b) => (b.at ? b.at.toMillis() : 0) - (a.at ? a.at.toMillis() : 0)).slice(0, 5);
    const st = { pending: ["warn", "รออนุมัติ"], approved: ["in", "อนุมัติแล้ว"], rejected: ["off", "ไม่อนุมัติ"] };
    $("rqList").innerHTML = rows.map((r) => `<li><span>${Object.keys(r.changes || {}).sort().map((d) => `${dayLabel(d)} → ${esc(i_lbl(r.changes[d]))}`).join(", ")}</span><span class="tag ${(st[r.status] || st.pending)[0]}">${(st[r.status] || st.pending)[1]}</span></li>`).join("");
  } catch (e) {}
}

/* ---------- ประวัติของฉัน (เดือนนี้) ---------- */
async function loadHistory() {
  try {
    const month = bkkDay().slice(0, 7);
    const recs = (await getDocs(query(collection(db, "checkins"), where("uid", "==", me.uid)))).docs.map((d) => d.data())
      .filter((r) => r.ts && (r.day || "").startsWith(month)).map((r) => ({ ...r, t: r.ts.toDate() }));
    const byDay = {};
    recs.forEach((r) => { (byDay[r.day] = byDay[r.day] || []).push(r); });
    let work = 0, late = 0, lateMin = 0, offs = 0;
    const items = Object.keys(byDay).sort().reverse().map((d) => {
      const rs = byDay[d].sort((a, b) => a.t - b.t);
      const fin = rs.find((r) => r.type === "in"), lout = [...rs].reverse().find((r) => r.type === "out");
      if (fin) work++;
      if (rs.some((r) => r.offsite)) offs++;
      let tag = "";
      const info = shiftInfo(monthDays[d]);
      if (fin && info && !info.off) {
        const lm = Math.round((fin.t - shiftWindow(d, info).s) / 60000);
        if (lm > LATE_GRACE_MIN) { late++; lateMin += lm; tag = `<span class="tag warn">สาย ${lm} น.</span>`; }
      }
      return `<li><span>${dayLabel(d)} ${tag}</span><span class="muted">${fin ? fmtTime(fin.t).slice(0, 5) : "–"} → ${lout ? fmtTime(lout.t).slice(0, 5) : "–"}</span></li>`;
    });
    $("hStats").className = "stats sm";
    $("hStats").innerHTML = [["วันที่มาทำงาน", work], ["มาสาย (ครั้ง)", late], ["สายรวม (นาที)", lateMin], ["นอกสถานที่", offs]]
      .map(([l, v]) => `<div class="stat"><span class="muted">${l}</span><b>${v}</b></div>`).join("");
    $("hList").innerHTML = items.join("") || `<li class="muted">ยังไม่มีรายการเดือนนี้</li>`;
  } catch (e) { $("hList").innerHTML = `<li class="muted">โหลดประวัติไม่สำเร็จ</li>`; }
}

function stopAll() {
  if (watchId !== null) navigator.geolocation.clearWatch(watchId);
  watchId = null; pos = null; inRange = false;
  stopCam();
}
