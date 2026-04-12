# ElevenLabs TTS로 신규 주문 음성 알림 교체

> 요청일: 2026-04-12
> 지시: "ElevenLabs TTS로 주문 알림 구현해줘" / "너 추천대로 ㄱㄱ"

## 배경

- 기존 `src/hooks/useNewOrderAlert.ts`는 Supabase realtime으로 신규 주문을 감지해 `window.speechSynthesis`(브라우저 내장 TTS)로 음성 알림 재생 중.
- 브라우저 내장 TTS는 목소리 품질이 기계적이고 한국어 억양이 어색함.
- ElevenLabs `eleven_multilingual_v2` 모델로 교체해 자연스러운 음성으로 개선.

## 목표

- 신규 주문 INSERT 이벤트 시, 기존 포매팅된 메시지(`전골 예약 주문! {요일}{시간}, {메뉴}`)를 ElevenLabs API로 음성화 → 관리자 브라우저에서 재생.
- ElevenLabs 실패 시 기존 Web Speech API로 **자동 폴백** (API 장애·할당량 초과 대비).
- 기존 메시지 포매팅·구독 로직은 **그대로 유지** (교체 범위 최소화).

## 아키텍처

```
Supabase realtime (INSERT)
      ↓ (기존)
useNewOrderAlert 훅: 메시지 조립
      ↓ (신규)
POST /api/tts/speak { text }  ← x-admin-password 헤더 인증
      ↓
Next.js route → ElevenLabs API (xi-api-key)
      ↓
audio/mpeg 스트림 응답
      ↓
new Audio(blob URL).play() — 브라우저에서 재생
```

## 파일 변경

### 신규: `src/app/api/tts/speak/route.ts`
- POST body: `{ text: string }`
- 인증: `verifyAdminAuth`
- 입력 검증: `text` 길이 500자 이내
- 환경변수:
  - `ELEVENLABS_API_KEY` (필수)
  - `ELEVENLABS_VOICE_ID` (선택, 기본값 `21m00Tcm4TlvDq8ikWAM` — Rachel)
  - 모델: `eleven_multilingual_v2` 하드코딩 (한국어 지원)
- ElevenLabs 호출 실패 시 502 반환
- 성공 시 `audio/mpeg` binary 그대로 스트림

### 수정: `src/hooks/useNewOrderAlert.ts`
- `speak(text)` 함수 내부를 교체:
  1. `/api/tts/speak`에 POST → blob 받기
  2. `currentAudioRef`로 기존 재생 중 audio가 있으면 `pause()` + `URL.revokeObjectURL`
  3. `new Audio(url).play()` + `onended` / `onerror`에서 URL 해제
  4. try/catch로 ElevenLabs 실패 시 `window.speechSynthesis` 폴백 (현재 코드 그대로 유지)
- `currentAudioRef: useRef<HTMLAudioElement | null>` 추가
- `getAdminPassword()` import 추가

## 환경변수 설정

- **로컬 (`.env.local`)**: 이미 `ELEVENLABS_API_KEY` 저장 완료
- **Vercel (운영)**: 별도 설정 필요 (`vercel env add ELEVENLABS_API_KEY production`)
- **음성 변경 원할 시**: `ELEVENLABS_VOICE_ID=xxx`를 추가 (voice_id는 ElevenLabs 대시보드 > Voices에서 확인)

## 비용·운영 고려사항

- ElevenLabs는 문자 수 과금. 평균 알림 메시지 ~50자.
- 예상: 50 주문/일 × 50자 = 2,500자/일 ≈ 75,000자/월.
- **ElevenLabs Free tier = 10,000 chars/월, Starter = 30,000**. 주문 양에 따라 **Creator tier (100K chars/월, $11/월) 이상 필요** 가능.
- 사장님 현재 플랜 확인 권장. 초과 시 자동으로 Web Speech API 폴백.

## 브라우저 자동재생 정책

- 일부 브라우저는 사용자 인터랙션 없이 audio.play()를 차단.
- 관리자는 로그인 시 이미 버튼 클릭 경험이 있어 대부분 OK.
- 실패 시 에러 로그 남기고 Web Speech API로 폴백 (폴백 역시 autoplay 제약 있지만 보통 인정됨).

## 구현 검증

1. TypeScript 빌드 통과 확인 (`npm run build`)
2. 로컬 `npm run dev` → /admin 로그인 → 실제 주문 1건 만들어 알림 재생 확인
   - 또는: `curl -X POST http://localhost:3000/api/tts/speak -H "x-admin-password: 4423" -H "content-type: application/json" -d '{"text":"테스트 주문입니다"}' -o /tmp/test.mp3` 후 재생
3. ElevenLabs 응답 정상 확인 → 빌드 + 커밋 + 푸시

## 작업 순서

- [ ] `src/app/api/tts/speak/route.ts` 작성
- [ ] `src/hooks/useNewOrderAlert.ts` speak() 교체 + currentAudioRef 추가
- [ ] `npm run build` 통과 확인
- [ ] 사장님께 Vercel 환경변수 등록 필요 여부 확인
- [ ] 커밋 + 푸시

## 범위 외 (안 건드리는 것)

- 메시지 포매팅 로직 (그대로 유지 — 기존 포맷이 충분)
- 알림 on/off 토글 UI (기존엔 `admin.isAuthenticated`만으로 enable — 필요 시 추후)
- 캐싱·프리페치 (주문마다 텍스트가 다르므로 의미 없음. 공통 prefix "전골 예약 주문"만 캐시하는 건 복잡도 대비 이득 작음)
