// 폭발 시 등장하는 메시지 풀. v1에서 LLM 없이 정적 풀로 시작.
export const MESSAGES: string[] = [
  "오늘 하루,\n충분히 잘했어요.",
  "숨 한 번,\n천천히.",
  "지나간 일은\n이미 지나갔어요.",
  "지금 이 순간,\n당신이 있어요.",
  "스트레스, 펑.",
  "어깨, 잠시 내려놓기.",
  "괜찮아요,\n진짜 괜찮아요.",
  "오늘만의 색,\n잘 어울려요.",
  "내일은\n조금 더 가벼울 거예요.",
  "마음, 정돈.",
  "한 박자 쉬어가도\n돼요.",
  "당신 페이스대로,\n천천히.",
  "고생했어요,\n오늘도.",
  "잠깐 멈춤,\n그것도 진행이에요.",
  "당신의 속도가\n맞아요.",
];

export function pickMessage(): string {
  return MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
}
