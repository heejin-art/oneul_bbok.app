import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

// ---------- 1. 씬 셋업 ----------
const canvas = document.getElementById("scene") as HTMLCanvasElement;
const scoreEl = document.getElementById("score")!;
const startBtn = document.getElementById("startBtn")!;
const hero = document.getElementById("hero")!;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const scene = new THREE.Scene();

// 환경맵 — iridescence·transmission 굴절을 위한 필수 reflection
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 12);

// 조명: 신비로운 듀얼 림
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

// ---------- 2. 버블 그리드 ----------
type Bubble = {
  mesh: THREE.Mesh;
  popped: boolean;
  basePos: THREE.Vector3;
  hue: number;
  floatPhase: number;
};

const bubbles: Bubble[] = [];
const COLS = 6;
const ROWS = 9;
const GAP = 1.45;

const bubbleGeo = new THREE.SphereGeometry(0.55, 32, 32);

// 신비로운 팔레트: 청록·라벤더·페리윙클·오팔 (HSL 200°~310° + 채도 절제 + 명도 ↑)
function makeBubbleMaterial(seed: number): THREE.MeshPhysicalMaterial {
  // hue: 0.55 (청록) → 0.85 (라벤더/모브) 사이를 부드럽게 순회
  const hue = 0.55 + (Math.sin(seed * Math.PI * 2) * 0.5 + 0.5) * 0.3;
  const sat = 0.28 + Math.cos(seed * 5.7) * 0.08; // 저채도
  const lit = 0.82 + Math.sin(seed * 3.1) * 0.05; // 고명도
  const color = new THREE.Color().setHSL(hue, sat, lit);
  return new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0,
    roughness: 0.02,
    transmission: 0.96,
    thickness: 0.9,
    ior: 1.45,
    iridescence: 1.0,
    iridescenceIOR: 1.6,
    iridescenceThicknessRange: [120, 880],
    clearcoat: 1.0,
    clearcoatRoughness: 0.02,
    sheen: 1.0,
    sheenRoughness: 0.3,
    sheenColor: new THREE.Color().setHSL((hue + 0.1) % 1, 0.5, 0.7),
    transparent: true,
    opacity: 0.78,
    envMapIntensity: 1.6,
  });
}

function buildGrid() {
  for (const b of bubbles) scene.remove(b.mesh);
  bubbles.length = 0;

  const offsetX = -((COLS - 1) * GAP) / 2;
  const offsetY = -((ROWS - 1) * GAP) / 2;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const seed = (c * 0.317 + r * 0.811) % 1;
      const mat = makeBubbleMaterial(seed);
      const mesh = new THREE.Mesh(bubbleGeo, mat);
      const x = offsetX + c * GAP + (r % 2 === 0 ? 0 : GAP * 0.5);
      const y = offsetY + r * GAP;
      mesh.position.set(x, y, 0);
      scene.add(mesh);
      bubbles.push({
        mesh,
        popped: false,
        basePos: mesh.position.clone(),
        hue: seed,
        floatPhase: Math.random() * Math.PI * 2,
      });
    }
  }
}
buildGrid();

// ---------- 3. 파편 풀 ----------
type Shard = { mesh: THREE.Mesh; velocity: THREE.Vector3; life: number };
const shards: Shard[] = [];
const shardGeo = new THREE.SphereGeometry(0.08, 8, 8);

function spawnShards(pos: THREE.Vector3, seed: number) {
  const baseHue = 0.55 + (Math.sin(seed * Math.PI * 2) * 0.5 + 0.5) * 0.3;
  for (let i = 0; i < 10; i++) {
    const h = (baseHue + (Math.random() - 0.5) * 0.1) % 1;
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(h, 0.5, 0.85),
      transparent: true,
    });
    const m = new THREE.Mesh(shardGeo, mat);
    m.position.copy(pos);
    scene.add(m);
    const dir = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 0.5
    ).normalize();
    shards.push({ mesh: m, velocity: dir.multiplyScalar(0.08 + Math.random() * 0.05), life: 1 });
  }
}

// ---------- 4. 사운드 ----------
let audioCtx: AudioContext | null = null;
function pop(hue: number) {
  if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const ctx = audioCtx;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain).connect(ctx.destination);
  const base = 280 + hue * 320;
  osc.frequency.value = base;
  osc.frequency.exponentialRampToValueAtTime(base * 0.5, ctx.currentTime + 0.18);
  gain.gain.value = 0;
  gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
  osc.start();
  osc.stop(ctx.currentTime + 0.25);
}

function hapticTap() {
  if (navigator.vibrate) navigator.vibrate(10);
}

// ---------- 5. 인터랙션: 레이캐스트 ----------
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let score = 0;

function tryPopAt(clientX: number, clientY: number) {
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
  spawnShards(bubble.mesh.position, bubble.hue);
  pop(bubble.hue);
  hapticTap();
  score += 1;
  scoreEl.textContent = String(score);
  // 페이드아웃 후 제거
  const mat = bubble.mesh.material as THREE.MeshPhysicalMaterial;
  const fadeStart = performance.now();
  const fade = () => {
    const t = (performance.now() - fadeStart) / 200;
    mat.opacity = Math.max(0, 0.85 * (1 - t));
    bubble.mesh.scale.setScalar(1 + t * 0.4);
    if (t < 1) requestAnimationFrame(fade);
    else scene.remove(bubble.mesh);
  };
  fade();

  // 모든 버블 터지면 재생성
  if (bubbles.every((b) => b.popped)) {
    setTimeout(() => buildGrid(), 400);
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

// ---------- 6. 시작 버튼 ----------
startBtn.addEventListener("click", () => {
  hero.classList.add("is-hidden");
});

// ---------- 7. 리사이즈 ----------
window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// ---------- 8. 애니메이션 루프 ----------
const clock = new THREE.Clock();
function tick() {
  const t = clock.getElapsedTime();
  // 둥실 떠다니는 모션
  for (const b of bubbles) {
    if (b.popped) continue;
    b.mesh.position.y = b.basePos.y + Math.sin(t * 1.2 + b.floatPhase) * 0.08;
    b.mesh.position.x = b.basePos.x + Math.cos(t * 0.8 + b.floatPhase) * 0.04;
    b.mesh.rotation.y = t * 0.2 + b.floatPhase;
  }
  // 파편 업데이트
  for (let i = shards.length - 1; i >= 0; i--) {
    const s = shards[i];
    s.mesh.position.add(s.velocity);
    s.velocity.y -= 0.003;
    s.life -= 0.02;
    (s.mesh.material as THREE.MeshBasicMaterial).opacity = s.life;
    if (s.life <= 0) {
      scene.remove(s.mesh);
      shards.splice(i, 1);
    }
  }
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();
