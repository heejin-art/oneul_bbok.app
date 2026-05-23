import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import {
  type Mode,
  ChallengeTimer,
  CHALLENGE_DURATION_MS,
  getBest,
  saveBest,
  getDailyBest,
  saveDailyBest,
} from "./modes";
import {
  COLS,
  ROWS,
  type PatternMask,
  fullMask,
  todayPattern,
  todayPatternName,
  todaySeed,
} from "./patterns";
import { buildShareCard, shareOrDownload } from "./share";

// ---------- DOM ----------
const canvas = document.getElementById("scene") as HTMLCanvasElement;
const scoreEl = document.getElementById("score")!;
const stageEl = document.getElementById("stage")!;
const stageBlockEl = document.getElementById("stageBlock")!;
const timerEl = document.getElementById("timer")!;
const timerBlockEl = document.getElementById("timerBlock") as HTMLElement;
const hero = document.getElementById("hero")!;
const heroPatternName = document.getElementById("heroPatternName")!;
const btnMeditation = document.getElementById("btnMeditation")!;
const btnChallenge = document.getElementById("btnChallenge")!;
const btnDaily = document.getElementById("btnDaily")!;
const comboEl = document.getElementById("combo")!;
const comboValueEl = document.getElementById("comboValue")!;
const stageToastEl = document.getElementById("stageToast")!;
const stageToastNumEl = document.getElementById("stageToastNum")!;
const resultEl = document.getElementById("result")!;
const resultTitle = document.getElementById("resultTitle")!;
const resultScore = document.getElementById("resultScore")!;
const resultBest = document.getElementById("resultBest")!;
const resultNewBadge = document.getElementById("resultNewBadge")!;
const btnReplay = document.getElementById("btnReplay")!;
const btnShare = document.getElementById("btnShare")!;
const btnHome = document.getElementById("btnHome")!;

// ---------- 1. 씬 셋업 ----------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const scene = new THREE.Scene();

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 12);

scene.add(new THREE.AmbientLight(0xa8c0ff, 0.35));
const keyLight = new THREE.DirectionalLight(0xe0d4ff, 0.9);
keyLight.position.set(5, 8, 5);
scene.add(keyLight);
const rimLight = new THREE.DirectionalLight(0x8ad5e8, 1.1);
rimLight.position.set(-5, -3, -5);
scene.add(rimLight);
const auraLight = new THREE.PointLight(0xc6a8ff, 1.4, 30);
auraLight.position.set(0, 0, 6);
scene.add(auraLight);

// ---------- 게임 상태 ----------
let mode: Mode = "meditation";
let stage = 1;
let score = 0;
let comboCount = 0;
let lastPopTime = 0;
const COMBO_WINDOW = 600;
let comboHideTimer: number | null = null;
let challengeTimer: ChallengeTimer | null = null;
let dailyDone = false;

// ---------- 2. 버블 그리드 ----------
type Bubble = {
  mesh: THREE.Mesh;
  popped: boolean;
  basePos: THREE.Vector3;
  color: number;
  emissive: number;
  floatPhase: number;
  rare: boolean;
};

const bubbles: Bubble[] = [];
const GAP = 1.45;
const bubbleGeo = new THREE.SphereGeometry(0.55, 32, 32);

const MYSTIC_PALETTE = [
  { color: 0x7DD3FC, emissive: 0x1E3A8A },
  { color: 0xC084FC, emissive: 0x4C1D95 },
  { color: 0xF472B6, emissive: 0x9D174D },
  { color: 0x6EE7B7, emissive: 0x065F46 },
  { color: 0xFCD34D, emissive: 0xB45309 },
  { color: 0xA78BFA, emissive: 0x5B21B6 },
  { color: 0xFB7185, emissive: 0xBE123C },
  { color: 0x67E8F9, emissive: 0x0E7490 },
  { color: 0xFDA4AF, emissive: 0xBE185D },
  { color: 0xC4B5FD, emissive: 0x4338CA },
  { color: 0x86EFAC, emissive: 0x166534 },
  { color: 0xFBBF24, emissive: 0x92400E },
];
const RARE_PALETTE = { color: 0xFFE066, emissive: 0xC97B00 };

function makeBubbleMaterial(isRare: boolean) {
  const palette = isRare
    ? RARE_PALETTE
    : MYSTIC_PALETTE[Math.floor(Math.random() * MYSTIC_PALETTE.length)];
  const mat = new THREE.MeshPhysicalMaterial({
    color: palette.color,
    emissive: palette.emissive,
    emissiveIntensity: isRare ? 0.9 : 0.35,
    metalness: isRare ? 0.4 : 0,
    roughness: isRare ? 0.05 : 0.08,
    transmission: isRare ? 0.3 : 0.55,
    thickness: 1.2,
    ior: 1.5,
    iridescence: isRare ? 1.0 : 0.7,
    iridescenceIOR: 1.45,
    iridescenceThicknessRange: [200, 600],
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
    sheen: 1.0,
    sheenRoughness: 0.25,
    sheenColor: new THREE.Color(palette.color),
    transparent: true,
    opacity: 0.92,
    envMapIntensity: isRare ? 1.6 : 1.0,
  });
  return { mat, palette };
}

function buildGrid(mask: PatternMask = fullMask()) {
  for (const b of bubbles) scene.remove(b.mesh);
  bubbles.length = 0;

  const offsetX = -((COLS - 1) * GAP) / 2;
  const offsetY = -((ROWS - 1) * GAP) / 2;
  // 챌린지엔 레어 등장률 조금 더 (짜릿함). 명상/일일은 스테이지 진행에 따라 증가.
  const rareRate =
    mode === "challenge"
      ? 0.1
      : Math.min(0.15, 0.05 + (stage - 1) * 0.01);

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const i = r * COLS + c;
      if (!mask[i]) continue;
      const isRare = Math.random() < rareRate;
      const { mat, palette } = makeBubbleMaterial(isRare);
      const mesh = new THREE.Mesh(bubbleGeo, mat);
      const x = offsetX + c * GAP + (r % 2 === 0 ? 0 : GAP * 0.5);
      const y = offsetY + r * GAP;
      mesh.position.set(x, y, 0);
      const sizeJitter = (isRare ? 1.1 : 0.92) + Math.random() * 0.12;
      mesh.scale.setScalar(sizeJitter);
      scene.add(mesh);
      bubbles.push({
        mesh,
        popped: false,
        basePos: mesh.position.clone(),
        color: palette.color,
        emissive: palette.emissive,
        floatPhase: Math.random() * Math.PI * 2,
        rare: isRare,
      });
    }
  }
}

// ---------- 3. 도파민 폭발 시스템 ----------
type Shard = {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  spin: THREE.Vector3;
  startScale: number;
};
const shards: Shard[] = [];
const shardGeos = [
  new THREE.IcosahedronGeometry(0.08, 0),
  new THREE.TetrahedronGeometry(0.1, 0),
  new THREE.SphereGeometry(0.07, 8, 8),
  new THREE.OctahedronGeometry(0.09, 0),
];

type Flash = { mesh: THREE.Mesh; life: number; maxScale: number; decay: number };
const flashes: Flash[] = [];
const ringGeo = new THREE.TorusGeometry(0.4, 0.06, 8, 32);

function spawnExplosion(pos: THREE.Vector3, color: number, emissive: number, isRare: boolean = false) {
  const ringMat = new THREE.MeshBasicMaterial({
    color, transparent: true, opacity: 1,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.copy(pos);
  ring.rotation.x = Math.PI / 2;
  scene.add(ring);
  flashes.push({ mesh: ring, life: 1, maxScale: isRare ? 6.5 : 4.5, decay: 0.05 });

  if (isRare) {
    const ring2Mat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.8,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    const ring2 = new THREE.Mesh(ringGeo, ring2Mat);
    ring2.position.copy(pos);
    ring2.rotation.x = Math.PI / 2;
    scene.add(ring2);
    flashes.push({ mesh: ring2, life: 1, maxScale: 9, decay: 0.04 });
  }

  const SHARD_COUNT = isRare ? 50 : 30;
  const speedBoost = isRare ? 1.4 : 1.0;
  for (let i = 0; i < SHARD_COUNT; i++) {
    const geo = shardGeos[i % shardGeos.length];
    const isAccent = Math.random() < (isRare ? 0.5 : 0.3);
    const c = isAccent ? 0xffffff : (Math.random() < 0.5 ? color : emissive);
    const mat = new THREE.MeshBasicMaterial({
      color: c, transparent: true, opacity: 1,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const m = new THREE.Mesh(geo, mat);
    m.position.copy(pos);
    const startScale = (0.6 + Math.random() * 0.8) * (isRare ? 1.2 : 1);
    m.scale.setScalar(startScale);
    scene.add(m);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    const speed = (0.1 + Math.random() * 0.12) * speedBoost;
    const dir = new THREE.Vector3(
      Math.sin(phi) * Math.cos(theta),
      Math.sin(phi) * Math.sin(theta) + 0.2,
      Math.cos(phi) * 0.4,
    );
    shards.push({
      mesh: m,
      velocity: dir.multiplyScalar(speed),
      life: 1,
      spin: new THREE.Vector3(Math.random(), Math.random(), Math.random()).multiplyScalar(0.3),
      startScale,
    });
  }

  triggerScreenFlash(isRare ? 0xffd66b : color);
}

const flashOverlay = document.createElement("div");
flashOverlay.style.cssText =
  "position:fixed;inset:0;pointer-events:none;z-index:5;opacity:0;transition:opacity 280ms cubic-bezier(0.32,0.72,0,1);mix-blend-mode:screen;";
document.body.appendChild(flashOverlay);
function triggerScreenFlash(color: number) {
  const hex = "#" + color.toString(16).padStart(6, "0");
  flashOverlay.style.background = `radial-gradient(circle at center, ${hex}66 0%, transparent 60%)`;
  flashOverlay.style.opacity = "1";
  requestAnimationFrame(() => {
    flashOverlay.style.opacity = "0";
  });
}

// ---------- 4. 사운드 ----------
let audioCtx: AudioContext | null = null;
function pop(color: number) {
  if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const ctx = audioCtx;
  const r = ((color >> 16) & 0xff) / 255;
  const g = ((color >> 8) & 0xff) / 255;
  const b = (color & 0xff) / 255;
  const tone = r * 0.3 + g * 0.5 + b * 0.2;
  const base = 320 + tone * 380;

  const o1 = ctx.createOscillator();
  const g1 = ctx.createGain();
  o1.type = "sine";
  o1.connect(g1).connect(ctx.destination);
  o1.frequency.value = base;
  o1.frequency.exponentialRampToValueAtTime(base * 0.45, ctx.currentTime + 0.18);
  g1.gain.value = 0;
  g1.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.005);
  g1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
  o1.start();
  o1.stop(ctx.currentTime + 0.25);

  const o2 = ctx.createOscillator();
  const g2 = ctx.createGain();
  o2.type = "triangle";
  o2.connect(g2).connect(ctx.destination);
  o2.frequency.value = base * 1.5;
  g2.gain.value = 0;
  g2.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.01);
  g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
  o2.start();
  o2.stop(ctx.currentTime + 0.3);

  const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
  const ndata = noiseBuffer.getChannelData(0);
  for (let i = 0; i < ndata.length; i++) ndata[i] = (Math.random() - 0.5) * Math.exp(-i / (ctx.sampleRate * 0.01));
  const noise = ctx.createBufferSource();
  const ng = ctx.createGain();
  noise.buffer = noiseBuffer;
  ng.gain.value = 0.12;
  noise.connect(ng).connect(ctx.destination);
  noise.start();
}

function hapticPop() {
  if (navigator.vibrate) navigator.vibrate([8, 20, 12]);
}

// ---------- 5. 인터랙션: 레이캐스트 ----------
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();

function bumpCombo() {
  const now = performance.now();
  if (now - lastPopTime < COMBO_WINDOW) {
    comboCount = Math.min(comboCount + 1, 99);
  } else {
    comboCount = 1;
  }
  lastPopTime = now;
  if (comboCount >= 2) {
    comboValueEl.textContent = String(comboCount);
    comboEl.setAttribute("data-show", "true");
    comboEl.setAttribute("data-pulse", "true");
    requestAnimationFrame(() => comboEl.setAttribute("data-pulse", "false"));
  }
  if (comboHideTimer) window.clearTimeout(comboHideTimer);
  comboHideTimer = window.setTimeout(() => {
    comboEl.setAttribute("data-show", "false");
    comboCount = 0;
  }, COMBO_WINDOW + 200);
}

function showStageToast(n: number) {
  stageToastNumEl.textContent = String(n);
  stageToastEl.setAttribute("data-show", "true");
  setTimeout(() => stageToastEl.setAttribute("data-show", "false"), 1400);
}

function tryPopAt(clientX: number, clientY: number) {
  if (resultEl.getAttribute("data-show") === "true") return; // 결과 모달 중 입력 차단
  ndc.x = (clientX / window.innerWidth) * 2 - 1;
  ndc.y = -(clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(ndc, camera);
  const meshes = bubbles.filter((b) => !b.popped).map((b) => b.mesh);
  const hits = raycaster.intersectObjects(meshes, false);
  if (hits.length === 0) return;
  const hitMesh = hits[0].object as THREE.Mesh;
  const bubble = bubbles.find((b) => b.mesh === hitMesh);
  if (!bubble || bubble.popped) return;
  bubble.popped = true;
  spawnExplosion(bubble.mesh.position, bubble.color, bubble.emissive, bubble.rare);
  pop(bubble.color);
  hapticPop();
  bumpCombo();
  const basePoints = bubble.rare ? 5 : 1;
  const comboBonus = comboCount >= 2 ? Math.floor(comboCount / 2) : 0;
  score += basePoints + comboBonus;
  scoreEl.textContent = String(score);

  const mat = bubble.mesh.material as THREE.MeshPhysicalMaterial;
  const fadeStart = performance.now();
  const fade = () => {
    const t = (performance.now() - fadeStart) / 200;
    mat.opacity = Math.max(0, 0.85 * (1 - t));
    bubble.mesh.scale.multiplyScalar(1 + 0.012);
    if (t < 1) requestAnimationFrame(fade);
    else scene.remove(bubble.mesh);
  };
  fade();

  if (bubbles.every((b) => b.popped)) {
    if (mode === "challenge") {
      // 챌린지: 빠른 재생성, 스테이지 없음
      setTimeout(() => buildGrid(fullMask()), 500);
    } else if (mode === "daily") {
      // 일일 패턴: 1회 클리어 시 결과
      if (!dailyDone) {
        dailyDone = true;
        setTimeout(() => endDaily(), 800);
      }
    } else {
      stage += 1;
      stageEl.textContent = String(stage);
      showStageToast(stage);
      setTimeout(() => buildGrid(fullMask()), 1100);
    }
  }
}

let dragging = false;
function pointerDown(e: PointerEvent) {
  dragging = true;
  tryPopAt(e.clientX, e.clientY);
}
function pointerMove(e: PointerEvent) {
  if (!dragging) return;
  tryPopAt(e.clientX, e.clientY);
}
function pointerUp() {
  dragging = false;
}

canvas.addEventListener("pointerdown", pointerDown);
canvas.addEventListener("pointermove", pointerMove);
canvas.addEventListener("pointerup", pointerUp);
canvas.addEventListener("pointercancel", pointerUp);
canvas.addEventListener("pointerleave", pointerUp);

// ---------- 6. 모드 흐름 ----------
function formatTime(ms: number): string {
  const s = Math.ceil(ms / 1000);
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm}:${String(ss).padStart(2, "0")}`;
}

function startMode(m: Mode) {
  mode = m;
  score = 0;
  stage = 1;
  dailyDone = false;
  scoreEl.textContent = "0";
  stageEl.textContent = "1";
  hero.classList.add("is-hidden");
  resultEl.setAttribute("data-show", "false");
  resultEl.setAttribute("hidden", "");

  if (challengeTimer) {
    challengeTimer.stop();
    challengeTimer = null;
  }

  if (m === "challenge") {
    stageBlockEl.setAttribute("hidden", "");
    timerBlockEl.removeAttribute("hidden");
    timerEl.textContent = formatTime(CHALLENGE_DURATION_MS);
    buildGrid(fullMask());
    challengeTimer = new ChallengeTimer(
      CHALLENGE_DURATION_MS,
      (rem) => {
        timerEl.textContent = formatTime(rem);
      },
      () => {
        endChallenge();
      },
    );
    challengeTimer.start();
  } else if (m === "daily") {
    stageBlockEl.removeAttribute("hidden");
    timerBlockEl.setAttribute("hidden", "");
    buildGrid(todayPattern().mask);
  } else {
    stageBlockEl.removeAttribute("hidden");
    timerBlockEl.setAttribute("hidden", "");
    buildGrid(fullMask());
  }
}

function endChallenge() {
  challengeTimer?.stop();
  challengeTimer = null;
  const isNew = saveBest(score);
  showResult({
    title: "1분 챌린지 종료",
    bestText: `나의 베스트 ${getBest()}`,
    isNewBest: isNew,
  });
}

function endDaily() {
  const seed = todaySeed();
  const isNew = saveDailyBest(seed, score);
  showResult({
    title: `오늘의 패턴 — ${todayPatternName()} 클리어!`,
    bestText: `오늘 베스트 ${getDailyBest(seed)}`,
    isNewBest: isNew,
  });
}

function showResult(opts: { title: string; bestText: string; isNewBest: boolean }) {
  resultTitle.textContent = opts.title;
  resultScore.textContent = String(score);
  resultBest.textContent = opts.bestText;
  resultNewBadge.setAttribute("data-show", opts.isNewBest ? "true" : "false");
  resultEl.removeAttribute("hidden");
  requestAnimationFrame(() => resultEl.setAttribute("data-show", "true"));
}

btnMeditation.addEventListener("click", () => startMode("meditation"));
btnChallenge.addEventListener("click", () => startMode("challenge"));
btnDaily.addEventListener("click", () => startMode("daily"));
btnReplay.addEventListener("click", () => startMode(mode));
btnHome.addEventListener("click", () => {
  resultEl.setAttribute("data-show", "false");
  setTimeout(() => resultEl.setAttribute("hidden", ""), 300);
  hero.classList.remove("is-hidden");
});
btnShare.addEventListener("click", async () => {
  let title: string, subtitle: string, best: number, patternName: string | undefined;
  if (mode === "challenge") {
    title = "1분 챌린지";
    subtitle = "60초의 기록";
    best = getBest();
    patternName = undefined;
  } else if (mode === "daily") {
    title = `오늘의 ${todayPatternName()}`;
    subtitle = "오늘만의 패턴";
    best = getDailyBest(todaySeed());
    patternName = todayPatternName();
  } else {
    title = "버블팝랩";
    subtitle = "오늘 터트린 버블";
    best = getBest();
    patternName = undefined;
  }
  try {
    const blob = await buildShareCard({ title, score, subtitle, best, patternName });
    await shareOrDownload(blob, "bubble-pop.png", "버블팝랩", `${title} ${score}점!`);
  } catch (err) {
    console.error("share failed", err);
  }
});

heroPatternName.textContent = todayPatternName();

// ---------- 7. 리사이즈 ----------
window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// ---------- 8. 애니메이션 루프 ----------
buildGrid(fullMask()); // 히어로 뒤로 깔리는 초기 그리드

const clock = new THREE.Clock();
function tick() {
  const t = clock.getElapsedTime();
  for (const b of bubbles) {
    if (b.popped) continue;
    b.mesh.position.y = b.basePos.y + Math.sin(t * 1.2 + b.floatPhase) * 0.08;
    b.mesh.position.x = b.basePos.x + Math.cos(t * 0.8 + b.floatPhase) * 0.04;
    b.mesh.rotation.y = t * 0.2 + b.floatPhase;
  }
  for (let i = flashes.length - 1; i >= 0; i--) {
    const f = flashes[i];
    f.life -= f.decay;
    const progress = 1 - f.life;
    const scale = 0.1 + progress * f.maxScale;
    f.mesh.scale.setScalar(scale);
    const mat = f.mesh.material as THREE.MeshBasicMaterial;
    mat.opacity = f.life;
    if (f.life <= 0) {
      scene.remove(f.mesh);
      flashes.splice(i, 1);
    }
  }
  for (let i = shards.length - 1; i >= 0; i--) {
    const s = shards[i];
    s.mesh.position.add(s.velocity);
    s.velocity.multiplyScalar(0.96);
    s.velocity.y -= 0.004;
    s.mesh.rotation.x += s.spin.x;
    s.mesh.rotation.y += s.spin.y;
    s.mesh.rotation.z += s.spin.z;
    s.life -= 0.018;
    const pulse = s.life > 0.7 ? s.startScale * (1 + (1 - s.life) * 0.6) : s.startScale * s.life * 1.4;
    s.mesh.scale.setScalar(Math.max(0.01, pulse));
    (s.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, s.life);
    if (s.life <= 0) {
      scene.remove(s.mesh);
      shards.splice(i, 1);
    }
  }
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();
