# 디자인 토큰 v1

> 작성: [디자이니] · 1 디자인 시스템, 2 게임 테마

## 공통 (Foundation)

### 타이포그래피
- 한글: **Pretendard Variable** (400 / 600 / 800)
- 영문: **Inter Variable** (400 / 600 / 800)
- 스케일: 12 / 14 / 16 / 20 / 28 / 40 / 56 (px)

### 모션
- 기본 이징: `cubic-bezier(0.32, 0.72, 0, 1)` — soft satisfying
- 빠른 응답: 120ms (탭 피드백)
- 표준 전환: 240ms
- 강조 전환: 480ms

### 그림자
- 글래스: `0 8px 32px rgba(0,0,0,0.12)`
- 부드러운: `0 2px 12px rgba(0,0,0,0.08)`

### 반경
- 작음: 8px
- 표준: 16px
- 카드: 24px
- 캡슐: 999px

### 햅틱 패턴 (navigator.vibrate)
- 가벼운 탭: `[10]`
- 만족 폭발: `[20, 30, 60]`
- 빌드업: `[5, 5, 5, 5, 5, 5, 5, 5]`

---

## 🅳 버블팝랩 테마

### 컬러
- 배경 그라데이션: `linear-gradient(180deg, #E6F9FA 0%, #FFF8FB 100%)`
- 버블 베이스: 반투명 화이트 + 굴절
- 액센트 1: `#7AE5E5` (민트)
- 액센트 2: `#FFB7D5` (분홍)
- 강조: `#5A6FFF` (블루)
- 텍스트: `#1A1F36`

### 3D 무드
- 환경: 부드러운 HDR (분홍·민트 그라데이션 라이트맵)
- 머티리얼: `MeshPhysicalMaterial` — `transmission: 1.0`, `roughness: 0.1`, `iridescence: 1.0`
- 파편: 작은 구체 5–8개, 중력 + 페이드

### 사운드
- 팝: 부드러운 "퐁" (저음 + 짧은 어택)
- 콤보: 음정 상승

---

## 🅵 스트레스 캡슐 테마

### 컬러
- 배경: `radial-gradient(ellipse at top, #2A1A4A 0%, #0A0518 100%)`
- 캡슐 베이스: 메탈릭 라벤더 `#B8A4E8`
- 액센트 1: `#FFD66B` (골드)
- 액센트 2: `#E879F9` (마젠타)
- 강조: `#7C3AED` (퍼플)
- 텍스트: `#F8F5FF`

### 3D 무드
- 환경: 다크 스튜디오 HDR + 골드 림라이트
- 머티리얼: `MeshStandardMaterial` — `metalness: 0.6`, `roughness: 0.25`, 내부 발광
- 부풀기: 셰이더 vertex 변형 (`sin` 펄스 + 사용자 압력 입력)
- 폭발 파편: 별가루 — 30개 작은 발광 입체

### 사운드
- 빌드업: 저주파 럼블 점진 증폭
- 폭발: 톡 + 종소리 잔향
- 메시지 등장: 부드러운 차임

---

## CSS 변수 (구현 참고)

```css
:root {
  /* 공통 */
  --font-kr: "Pretendard Variable", system-ui, sans-serif;
  --font-en: "Inter Variable", system-ui, sans-serif;
  --ease-soft: cubic-bezier(0.32, 0.72, 0, 1);
  --shadow-glass: 0 8px 32px rgba(0, 0, 0, 0.12);
  --shadow-soft: 0 2px 12px rgba(0, 0, 0, 0.08);
  --radius-card: 24px;
}

/* 🅳 버블팝랩 */
[data-theme="bubble"] {
  --bg-grad: linear-gradient(180deg, #E6F9FA 0%, #FFF8FB 100%);
  --accent-1: #7AE5E5;
  --accent-2: #FFB7D5;
  --emphasis: #5A6FFF;
  --text: #1A1F36;
}

/* 🅵 스트레스 캡슐 */
[data-theme="capsule"] {
  --bg-grad: radial-gradient(ellipse at top, #2A1A4A 0%, #0A0518 100%);
  --accent-1: #FFD66B;
  --accent-2: #E879F9;
  --emphasis: #7C3AED;
  --text: #F8F5FF;
}
```
