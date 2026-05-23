export type Mode = "meditation" | "immersion" | "daily";

const TODAY_COUNT_KEY = "bp.today.count";
const TOTAL_COUNT_KEY = "bp.total.count";
const TODAY_DATE_KEY = "bp.today.date";
const MILESTONE_KEY = "bp.milestone";

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function ensureToday() {
  if (localStorage.getItem(TODAY_DATE_KEY) !== todayStr()) {
    localStorage.setItem(TODAY_DATE_KEY, todayStr());
    localStorage.setItem(TODAY_COUNT_KEY, "0");
  }
}

export function getTodayCount(): number {
  ensureToday();
  return Number(localStorage.getItem(TODAY_COUNT_KEY) ?? "0");
}

export function getTotalCount(): number {
  return Number(localStorage.getItem(TOTAL_COUNT_KEY) ?? "0");
}

export function addPops(n: number) {
  ensureToday();
  const today = getTodayCount() + n;
  const total = getTotalCount() + n;
  localStorage.setItem(TODAY_COUNT_KEY, String(today));
  localStorage.setItem(TOTAL_COUNT_KEY, String(total));
}

// 마일스톤 (한 번만 띄움)
const MILESTONES = [100, 500, 1000, 5000, 10000];

export function checkMilestone(): { type: "today" | "total"; count: number } | null {
  const seen = JSON.parse(localStorage.getItem(MILESTONE_KEY) ?? "{}");
  const today = getTodayCount();
  const total = getTotalCount();

  for (const m of MILESTONES) {
    const todayKey = `t_${todayStr()}_${m}`;
    if (today >= m && !seen[todayKey]) {
      seen[todayKey] = true;
      localStorage.setItem(MILESTONE_KEY, JSON.stringify(seen));
      return { type: "today", count: m };
    }
  }
  for (const m of MILESTONES) {
    const totalKey = `a_${m}`;
    if (total >= m && !seen[totalKey]) {
      seen[totalKey] = true;
      localStorage.setItem(MILESTONE_KEY, JSON.stringify(seen));
      return { type: "total", count: m };
    }
  }
  return null;
}

// 칭찬 카피 — 그리드 클리어 속도별
export function clearPraise(secondsTaken: number): string {
  if (secondsTaken <= 5) return "손가락 폭주!";
  if (secondsTaken <= 10) return "시원하게 한 판!";
  if (secondsTaken <= 20) return "꼼꼼히 다 비웠네요";
  return "정성스럽게 한 판 ✨";
}

// 마일스톤 메시지
export function milestonePraise(ms: { type: "today" | "total"; count: number }): string {
  if (ms.type === "today") {
    if (ms.count >= 1000) return `오늘 ${ms.count.toLocaleString()}개… 스트레스 하나도 안 남았겠죠?`;
    if (ms.count >= 500) return `오늘 ${ms.count}개 돌파! 시원하다~`;
    return `오늘 ${ms.count}개 넘었어요!`;
  }
  if (ms.count >= 10000) return `누적 ${ms.count.toLocaleString()}개 마스터 등극 🎉`;
  if (ms.count >= 5000) return `누적 ${ms.count.toLocaleString()}개! 꾸준히 비우는 중`;
  if (ms.count >= 1000) return `총 ${ms.count.toLocaleString()}개 달성!`;
  return `누적 ${ms.count}개!`;
}

// 결과 화면 칭찬 카피 — 스트레스가 사라지는 느낌
const RESULT_PRAISES = [
  "뽁뽁 터진 만큼,\n스트레스도 터져 나갔어요.",
  "손가락이 움직인 만큼,\n마음이 가벼워졌어요.",
  "오늘의 스트레스,\n다 비워냈어요.",
  "뽁뽁 소리에\n걱정이 사라졌어요.",
  "한 개 한 개\n스트레스가 톡톡 빠져나갔어요.",
  "머릿속이\n한결 맑아졌을 거예요.",
  "손끝에서 시작된\n작은 해방.",
  "뽁! 하나 터질 때마다\n하나씩 내려놓은 거예요.",
  "오늘도 잘 비웠어요.\n내일 또 만나요.",
  "마음이 조금\n가벼워졌길 바라요.",
  "스트레스 제로.\n지금 이 순간, 충분해요.",
  "잘했어요.\n오늘 하루, 수고했어요.",
];

export function pickResultPraise(): string {
  return RESULT_PRAISES[Math.floor(Math.random() * RESULT_PRAISES.length)];
}

// 몰입 모드 시간 보너스 (+5초, 무한)
export const IMMERSION_START_MS = 60_000;
export const IMMERSION_BONUS_MS = 5_000;
