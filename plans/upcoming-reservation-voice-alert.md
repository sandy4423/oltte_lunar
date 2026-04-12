# 예약 픽업 20분 전 음성 알림

## 요구사항
- 픽업 예약 건이 **픽업 시간 20분 전**이 되면 음성으로 "예약 건 있다" 알림
- 주방 준비 시간 확보용
- `/admin` 페이지 로그인 상태에서만 동작

## 대상
- `is_pickup === true` (배달은 시간 필드 없음)
- `status === 'PAID'` (결제 완료, 아직 픽업 안 함)
- `pickup_date` = 오늘 (KST)
- `pickup_time` 필드가 있는 주문

## 알림 시점
- KST 파싱: `new Date(\`${pickup_date}T${pickup_time}:00+09:00\`)`
- `alertAt = pickupDateTime - 20분`
- 발화 조건: `now ∈ [alertAt, alertAt + 10분)` (stale guard)

## 중복 방지
- `sessionStorage` 키: `upcoming-alert-fired-v1` → JSON array of orderIds
- 발화 직전에 체크, 발화 직후 추가
- 브라우저 탭 세션 단위로 초기화 → 매일 운영 시작 시 자동 리셋(사장님이 매일 새로 로그인하므로)

## 구현 파일
1. **신규 `src/lib/clientTts.ts`**
   - `speakText(text: string): Promise<void>` — ElevenLabs fetch + audio 재생
   - `stopSpeaking()` — 현재 오디오 중단
   - 모듈 싱글톤 `currentAudio`/`currentAudioUrl`
   - ElevenLabs 실패 시 Web Speech API 폴백

2. **수정 `src/hooks/useNewOrderAlert.ts`**
   - 자체 `speak`/`stopCurrentAudio` 제거
   - `clientTts`의 `speakText`/`stopSpeaking` 사용

3. **신규 `src/hooks/useUpcomingOrderAlert.ts`**
   - 인자: `orders: OrderFull[]`, `enabled: boolean`
   - `setInterval` 30초마다 스캔
   - 조건 만족 시 `speakText(message)` + fired set 업데이트
   - 메시지: `"20분 뒤 픽업 예정! ${HH시 MM분}"`

4. **수정 `src/app/admin/page.tsx`**
   - `useUpcomingOrderAlert(admin.orders, admin.isAuthenticated)` 추가

## 검증
- `npm run build` 통과
- 타입 에러 없음
- 동일 주문 중복 발화 방지 확인 (코드 리뷰)

## 비활성 테스트
- 실기기 테스트는 사장님이 운영 시간 중 확인 (내일 주문부터 자연스럽게 발화)
