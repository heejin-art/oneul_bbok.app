// 공유 카드 생성 — canvas로 그려서 Blob 만들고 Web Share API 또는 다운로드.

export type ShareCardOpts = {
  mode: "meditation" | "immersion" | "stress";
  score: number;
  stressWord?: string;
};

const EMOTION_LINES: Record<string, string[]> = {
  meditation: [
    "오늘도 잘 비웠다",
    "마음이 좀 가벼워졌어",
    "한 알 한 알, 천천히",
    "조용히 터뜨린 하루",
  ],
  immersion: [
    "미쳤다 집중력",
    "손가락이 알아서 움직였어",
    "완전 몰입했다",
    "멈출 수가 없었어",
  ],
};

function pickEmotion(mode: string): string {
  const lines = EMOTION_LINES[mode];
  if (!lines) return "";
  return lines[Math.floor(Math.random() * lines.length)];
}

function buildSubline(mode: string, score: number): string {
  if (mode === "meditation") return `뽁뽁이 ${score}개, 조용히 터뜨림`;
  if (mode === "immersion") return `뽁뽁이 ${score}개, 시원하게 터뜨림`;
  return `뽁뽁이 ${score}개와 함께 안녕`;
}

export async function buildShareCard(opts: ShareCardOpts): Promise<Blob> {
  const W = 1080;
  const H = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const font = "'NanumSquareRound', system-ui, sans-serif";

  // 배경
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#E6F9FA");
  bg.addColorStop(0.5, "#FFF8FB");
  bg.addColorStop(1, "#F5E6FF");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // 데코 버블
  for (let i = 0; i < 12; i++) {
    const r = 40 + Math.random() * 100;
    const x = Math.random() * W;
    const y = Math.random() * H;
    const grad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    grad.addColorStop(0, "rgba(255,255,255,0.85)");
    const hues = ["#7AE5E5", "#FFB7D5", "#C4B5FD", "#FCD34D", "#86EFAC"];
    grad.addColorStop(0.7, hues[i % hues.length] + "55");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.textAlign = "center";

  // 감정 한 줄 (메인 카피 — 크게)
  let emotionLine: string;
  if (opts.mode === "stress" && opts.stressWord) {
    emotionLine = `${opts.stressWord}, 뿌셔버렸다`;
  } else {
    emotionLine = pickEmotion(opts.mode);
  }

  ctx.fillStyle = "#1A1F36";
  ctx.font = `900 72px ${font}`;
  ctx.fillText(emotionLine, W / 2, 340);

  // 숫자 (강조)
  const scoreGrad = ctx.createLinearGradient(0, 400, W, 650);
  scoreGrad.addColorStop(0, "#5A6FFF");
  scoreGrad.addColorStop(1, "#FFB7D5");
  ctx.fillStyle = scoreGrad;
  ctx.font = `900 220px ${font}`;
  ctx.fillText(String(opts.score), W / 2, 600);

  // 서브 한 줄
  const subline = buildSubline(opts.mode, opts.score);
  ctx.fillStyle = "rgba(26,31,54,0.55)";
  ctx.font = `600 36px ${font}`;
  ctx.fillText(subline, W / 2, 700);

  // 브랜드 (하단, 한 번만)
  ctx.fillStyle = "rgba(26,31,54,0.3)";
  ctx.font = `700 28px ${font}`;
  ctx.fillText("오늘뽁", W / 2, H - 80);

  return await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b!), "image/png"),
  );
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export async function shareOrDownload(blob: Blob, filename: string, title: string, text: string) {
  const file = new File([blob], filename, { type: "image/png" });
  // 1) Web Share API + file
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
  if (nav.canShare && nav.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title, text });
      return "shared";
    } catch {
      // 사용자 취소
    }
  }
  // 2) 텍스트만 공유 (파일 미지원 브라우저)
  if (navigator.share) {
    try {
      await navigator.share({ title, text });
      return "shared";
    } catch {
      // 사용자 취소
    }
  }
  // 3) 다운로드 폴백
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "downloaded";
}
