// 게임 모드 상태 — 명상 / 챌린지 / 일일 패턴 / 결과 화면 흐름 관리

export type Mode = "meditation" | "challenge" | "daily";

const BEST_KEY = "bpl.best";
const DAILY_BEST_PREFIX = "bpl.daily.";

export const CHALLENGE_DURATION_MS = 60_000;

export type ChallengeResult = {
  score: number;
  best: number;
  isNewBest: boolean;
  duration: number;
};

export function getBest(): number {
  return Number(localStorage.getItem(BEST_KEY) ?? "0");
}

export function saveBest(score: number): boolean {
  const prev = getBest();
  if (score > prev) {
    localStorage.setItem(BEST_KEY, String(score));
    return true;
  }
  return false;
}

function dailyKey(seed: number): string {
  return `${DAILY_BEST_PREFIX}${seed}`;
}

export function getDailyBest(seed: number): number {
  return Number(localStorage.getItem(dailyKey(seed)) ?? "0");
}

export function saveDailyBest(seed: number, score: number): boolean {
  const prev = getDailyBest(seed);
  if (score > prev) {
    localStorage.setItem(dailyKey(seed), String(score));
    return true;
  }
  return false;
}

// 챌린지 타이머 — start/stop, onTick(remainingMs), onEnd
export class ChallengeTimer {
  private startedAt = 0;
  private rafId: number | null = null;
  private ended = false;

  constructor(
    private duration: number,
    private onTick: (remainingMs: number) => void,
    private onEnd: () => void,
  ) {}

  start() {
    this.startedAt = performance.now();
    this.ended = false;
    const loop = () => {
      const elapsed = performance.now() - this.startedAt;
      const remaining = Math.max(0, this.duration - elapsed);
      this.onTick(remaining);
      if (remaining <= 0) {
        this.ended = true;
        this.rafId = null;
        this.onEnd();
        return;
      }
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stop() {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.ended = true;
  }

  get isRunning(): boolean {
    return this.rafId !== null && !this.ended;
  }
}
