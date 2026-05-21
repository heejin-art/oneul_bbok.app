import * as THREE from "three";
import { pickMessage } from "./messages";

// ---------- 0. 일일 카운트 (LocalStorage) ----------
const DAILY_LIMIT = 5;
const TODAY_KEY = "sc.today";
const COUNT_KEY = "sc.count";

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
function readCount(): number {
  if (localStorage.getItem(TODAY_KEY) !== todayStr()) {
    localStorage.setItem(TODAY_KEY, todayStr());
    localStorage.setItem(COUNT_KEY, "0");
  }
  return Number(localStorage.getItem(COUNT_KEY) ?? "0");
}
function increment() {
  const next = readCount() + 1;
  localStorage.setItem(COUNT_KEY, String(next));
  return next;
}

// ---------- 1. 씬 셋업 ----------
const canvas = document.getElementById("scene") as HTMLCanvasElement;
const dailyEl = document.getElementById("daily")!;
const hintEl = document.getElementById("hint")!;
const messageEl = document.getElementById("message")!;
const messageText = document.getElementById("messageText")!;
const messageClose = document.getElementById("messageClose")!;

function refreshDaily() {
  const remaining = Math.max(0, DAILY_LIMIT - readCount());
  dailyEl.textContent = String(remaining);
}
refreshDaily();

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 7);

// 다크 스튜디오 라이팅 + 골드 림
scene.add(new THREE.AmbientLight(0x4030a0, 0.4));
const key = new THREE.DirectionalLight(0xffffff, 1.2);
key.position.set(3, 5, 4);
scene.add(key);
const rim = new THREE.DirectionalLight(0xffd66b, 1.6);
rim.position.set(-4, -2, -3);
scene.add(rim);
const fill = new THREE.PointLight(0xe879f9, 1.5, 12);
fill.position.set(0, 0, 3);
scene.add(fill);

// ---------- 2. 캡슐 ----------
const capsuleGeo = new THREE.CapsuleGeometry(0.9, 1.4, 16, 32);
const capsuleMat = new THREE.MeshStandardMaterial({
  color: 0xb8a4e8,
  metalness: 0.65,
  roughness: 0.25,
  emissive: 0x4b2a8a,
  emissiveIntensity: 0.15,
});
const capsule = new THREE.Mesh(capsuleGeo, capsuleMat);
capsule.rotation.z = Math.PI / 8;
scene.add(capsule);

// ---------- 3. 파편 풀 ----------
type Shard = { mesh: THREE.Mesh; velocity: THREE.Vector3; life: number; spin: THREE.Vector3 };
const shards: Shard[] = [];
const shardGeo = new THREE.IcosahedronGeometry(0.06, 0);

function spawnExplosion() {
  for (let i = 0; i < 36; i++) {
    const color = Math.random() < 0.5 ? 0xffd66b : 0xe879f9;
    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 1.5,
      transparent: true,
    });
    const m = new THREE.Mesh(shardGeo, mat);
    m.position.copy(capsule.position);
    scene.add(m);
    const dir = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2
    ).normalize();
    shards.push({
      mesh: m,
      velocity: dir.multiplyScalar(0.12 + Math.random() * 0.08),
      life: 1,
      spin: new THREE.Vector3(Math.random(), Math.random(), Math.random()).multiplyScalar(0.2),
    });
  }
}

// ---------- 4. 사운드 ----------
let audioCtx: AudioContext | null = null;
function rumble(pressure: number) {
  if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  // 짧은 구현: 압력 표현은 햅틱 위주, 사운드는 폭발 시
  void pressure;
}
function explode() {
  if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const ctx = audioCtx;
  // 폭발 톡
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain).connect(ctx.destination);
  osc.type = "triangle";
  osc.frequency.value = 180;
  osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.4);
  gain.gain.value = 0;
  gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
  osc.start();
  osc.stop(ctx.currentTime + 0.5);
  // 챠임
  const c = ctx.createOscillator();
  const cg = ctx.createGain();
  c.connect(cg).connect(ctx.destination);
  c.type = "sine";
  c.frequency.value = 880;
  cg.gain.value = 0;
  cg.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.05);
  cg.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);
  c.start();
  c.stop(ctx.currentTime + 1);
}

function vibrateBuildup() {
  if (navigator.vibrate) navigator.vibrate([5, 5, 5, 5, 5, 5, 5, 5]);
}
function vibrateExplode() {
  if (navigator.vibrate) navigator.vibrate([20, 30, 60]);
}

// ---------- 5. 인터랙션: 길게 누르기 ----------
const BUILD_DURATION = 1200; // ms
let pressStart: number | null = null;
let exploded = false;
let pressure = 0;

function startPress(e: PointerEvent) {
  if (exploded) return;
  if (readCount() >= DAILY_LIMIT) {
    showMessage("오늘 캡슐은 모두 사용했어요.\n내일 0시에 충전돼요.");
    return;
  }
  pressStart = performance.now();
  vibrateBuildup();
  hintEl.style.opacity = "0";
  e.preventDefault();
}

function endPress() {
  if (pressStart === null || exploded) {
    pressStart = null;
    return;
  }
  const held = performance.now() - pressStart;
  pressStart = null;
  if (held >= BUILD_DURATION * 0.7) {
    triggerExplosion();
  } else {
    // 너무 짧으면 캡슐 원복
    pressure = 0;
  }
}

function triggerExplosion() {
  if (exploded) return;
  exploded = true;
  vibrateExplode();
  explode();
  spawnExplosion();
  capsule.visible = false;
  increment();
  refreshDaily();
  setTimeout(() => {
    showMessage(pickMessage());
  }, 600);
}

function showMessage(text: string) {
  messageText.textContent = text;
  messageEl.removeAttribute("hidden");
  messageEl.setAttribute("data-show", "true");
}
function hideMessage() {
  messageEl.setAttribute("data-show", "false");
  setTimeout(() => {
    messageEl.setAttribute("hidden", "");
    resetCapsule();
  }, 480);
}

function resetCapsule() {
  capsule.scale.setScalar(1);
  capsule.visible = true;
  pressure = 0;
  exploded = false;
  hintEl.style.opacity = "";
}

canvas.addEventListener("pointerdown", startPress);
canvas.addEventListener("pointerup", endPress);
canvas.addEventListener("pointercancel", endPress);
canvas.addEventListener("pointerleave", endPress);
messageClose.addEventListener("click", hideMessage);

// ---------- 6. 리사이즈 ----------
window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// ---------- 7. 애니메이션 루프 ----------
const clock = new THREE.Clock();
function tick() {
  const t = clock.getElapsedTime();

  if (pressStart !== null) {
    const held = performance.now() - pressStart;
    pressure = Math.min(1, held / BUILD_DURATION);
    if (pressure >= 1 && !exploded) triggerExplosion();
  }

  if (!exploded) {
    const breath = Math.sin(t * 1.5) * 0.02;
    const swell = 1 + pressure * 0.6 + breath;
    capsule.scale.setScalar(swell);
    capsule.rotation.y = Math.sin(t * 0.4) * 0.3;
    // 압력 진동
    if (pressure > 0.3) {
      const jitter = pressure * 0.05;
      capsule.position.x = (Math.random() - 0.5) * jitter;
      capsule.position.y = (Math.random() - 0.5) * jitter;
    } else {
      capsule.position.x = 0;
      capsule.position.y = 0;
    }
    capsuleMat.emissiveIntensity = 0.15 + pressure * 1.2;
    rumble(pressure);
  }

  // 파편 업데이트
  for (let i = shards.length - 1; i >= 0; i--) {
    const s = shards[i];
    s.mesh.position.add(s.velocity);
    s.velocity.y -= 0.004;
    s.mesh.rotation.x += s.spin.x;
    s.mesh.rotation.y += s.spin.y;
    s.life -= 0.012;
    const mat = s.mesh.material as THREE.MeshStandardMaterial;
    mat.opacity = Math.max(0, s.life);
    mat.emissiveIntensity = Math.max(0, s.life * 1.5);
    if (s.life <= 0) {
      scene.remove(s.mesh);
      shards.splice(i, 1);
    }
  }

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();
