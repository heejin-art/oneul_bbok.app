# 🅵 스트레스 캡슐 (Stress Capsule)

> 일일 캡슐 + 길게 누르기 카타르시스 + 메시지 컬렉션

## 컨셉
매일 5개의 3D 캡슐. 길게 누르면 캡슐이 부풀고 진동, 임계점에 *빵!* 안에서 오늘의 한 줄·컬러·미니 보상이 튀어나옴.

## 핵심 인터랙션
- **길게 누르기 → 압력 게이지 → 폭발**
- 폭발 시 ① 오늘의 한 줄 ② 컬러/스킨 ③ 미니 보상 랜덤 등장
- 받은 메시지는 *컬렉션 보관함*에 누적

## 기술 스택
- Vite + TypeScript
- Three.js (vanilla)
- Web Audio API + navigator.vibrate
- vite-plugin-pwa
- LocalStorage (컬렉션·일일 카운트)

## 배포
- 웹: Vercel
- 앱: PWABuilder.com → APK → Google Play

## 상태
- [ ] 스캐폴딩
- [ ] 캡슐 셰이더
- [ ] 길게 누르기 + 압력 게이지
- [ ] 폭발 파편 효과
- [ ] 메시지 풀 + 랜덤 추첨
- [ ] 컬렉션 보관함
- [ ] 일일 시스템 (5개/일, 0시 충전)
- [ ] 공유 카드 자동 생성
- [ ] 웹 히어로 섹션
- [ ] PWA 설정
- [ ] Vercel 배포
- [ ] APK 패키징
- [ ] Play 콘솔 업로드
