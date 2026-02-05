# 환불/취소 시스템 테스트 가이드

## 구현 완료 사항

✅ 데이터베이스 마이그레이션 (새 상태 및 refund_tokens 테이블)
✅ TypeScript 타입 정의 업데이트
✅ 취소 요청 API (`/api/admin/orders/cancel-request`)
✅ 계좌번호 입력 및 자동 환불 API (`/api/refund/account`)
✅ 고객용 계좌번호 입력 페이지 (`/refund/account/[token]`)
✅ 관리자 UI - 취소 요청 다이얼로그
✅ SMS/Slack 알림 함수

## 시스템 플로우

```
1. 고객이 전화/문자로 취소 요청
   ↓
2. 관리자가 관리자 페이지에서 주문 선택 후 "취소 요청" 클릭
   → 환불 금액 입력 (전액 또는 부분)
   → 환불 사유 입력
   → "취소 요청 및 링크 전송" 클릭
   ↓
3. 시스템 처리:
   - 주문 상태: PAID → CANCEL_REQUESTED
   - refund_tokens 테이블에 토큰 생성 (환불금액, 사유 포함)
   - 고객에게 SMS 발송 (계좌입력 링크)
   - Slack 알림 발송
   ↓
4. 고객이 SMS 링크 클릭 → 계좌번호 입력 페이지
   → 은행, 계좌번호, 예금주 입력
   → "환불 계좌 등록 및 환불 요청" 클릭
   ↓
5. 시스템 자동 처리:
   - 주문 상태: CANCEL_REQUESTED → REFUND_PROCESSING
   - 토스페이먼츠 환불 API 호출
   - 성공 시:
     * 주문 상태: REFUND_PROCESSING → REFUNDED
     * 환불 정보 orders 테이블 저장
     * 고객에게 환불 완료 SMS
     * Slack 알림
   - 실패 시:
     * 상태 롤백: REFUND_PROCESSING → CANCEL_REQUESTED
     * Slack 에러 알림
```

## 테스트 시나리오

### 1. 전액 환불 테스트

1. 관리자 페이지에서 PAID 상태 주문 하나 선택
2. "취소 요청" 버튼 클릭
3. "전액 환불" 버튼 클릭하여 주문금액 자동 입력 확인
4. 환불 사유 입력: "고객 요청"
5. "취소 요청 및 링크 전송" 클릭
6. 확인사항:
   - 주문 상태가 CANCEL_REQUESTED로 변경되었는지
   - SMS 로그 확인 (개발 모드에서는 콘솔)
   - Slack 알림 확인 (개발 모드에서는 콘솔)

### 2. 부분 환불 테스트

1. 관리자 페이지에서 다른 PAID 주문 선택
2. "취소 요청" 버튼 클릭
3. 환불 금액에 주문금액보다 작은 금액 직접 입력 (예: 배송비 공제)
4. 환불 사유 입력: "배송비 공제"
5. "취소 요청 및 링크 전송" 클릭
6. 확인사항:
   - 입력한 금액이 정확히 표시되는지
   - 알림이 발송되는지

### 3. 고객 계좌번호 입력 테스트

1. SMS에 포함된 링크로 접속 (또는 직접 `/refund/account/{token}` 접속)
2. 확인사항:
   - 주문 정보가 올바르게 표시되는지
   - 환불 금액이 맞는지
   - 환불 사유가 표시되는지
3. 계좌정보 입력:
   - 은행 선택
   - 계좌번호 입력 (숫자만 가능, 하이픈 자동 제거 확인)
   - 예금주명 입력
4. "환불 계좌 등록 및 환불 요청" 클릭
5. 확인사항:
   - 토스페이먼츠 환불 API 호출 (개발 환경에서는 실제 호출되지 않을 수 있음)
   - 성공 메시지 표시
   - 주문 상태가 REFUNDED로 변경
   - 환불 완료 SMS 발송
   - Slack 알림

### 4. 에러 처리 테스트

#### 4-1. 환불 금액 초과
1. 관리자가 주문 금액보다 큰 금액 입력 시도
2. 확인사항: "환불 금액이 주문 금액을 초과할 수 없습니다" 에러 표시

#### 4-2. 만료된 토큰
1. refund_tokens 테이블에서 expires_at를 과거로 수정
2. 링크 접속 시도
3. 확인사항: "만료된 링크입니다" 에러 표시

#### 4-3. 이미 사용된 토큰
1. 계좌번호를 이미 입력한 주문의 토큰으로 재접속
2. 확인사항: "이미 처리된 요청입니다" 에러 표시

#### 4-4. 계좌번호 형식 오류
1. 계좌번호에 문자나 특수문자 입력 시도
2. 확인사항: 숫자만 입력되도록 자동 필터링

### 5. 관리자 페이지 통합 테스트

1. 관리자 페이지에서 여러 상태의 주문들 확인:
   - CANCEL_REQUESTED: "🟡 계좌정보 대기" 표시
   - REFUND_PROCESSING: "🟠 환불처리중" 표시
   - REFUNDED: "⚪ 환불완료" 표시
2. 필터에서 새로운 상태들로 필터링 가능한지 확인
3. 통계 카드에 환불 관련 주문들이 포함되는지 확인

## 주요 API 엔드포인트

### 관리자 API
- `POST /api/admin/orders/cancel-request` - 취소 요청 등록

### 고객 API
- `GET /api/refund/account?token={token}` - 주문 정보 조회
- `POST /api/refund/account` - 계좌정보 제출 및 자동 환불

## 데이터베이스 확인

### refund_tokens 테이블
```sql
SELECT 
  rt.id,
  rt.token,
  rt.refund_amount,
  rt.refund_reason,
  rt.used,
  rt.expires_at,
  o.status,
  c.name as customer_name
FROM refund_tokens rt
JOIN orders o ON rt.order_id = o.id
JOIN customers c ON o.customer_id = c.id
ORDER BY rt.created_at DESC;
```

### orders 테이블 (환불 관련 필드)
```sql
SELECT 
  id,
  status,
  total_amount,
  refund_amount,
  refund_reason,
  refund_bank_code,
  refund_account_number,
  refund_account_holder,
  refunded_at
FROM orders
WHERE status IN ('CANCEL_REQUESTED', 'REFUND_PROCESSING', 'REFUNDED')
ORDER BY updated_at DESC;
```

## 프로덕션 배포 전 체크리스트

- [ ] 데이터베이스 마이그레이션 적용 확인
- [ ] Supabase RLS 정책 확인 (refund_tokens 테이블에 대한 접근 권한)
- [ ] NEXT_PUBLIC_SITE_URL 환경변수 설정 (SMS 링크용)
- [ ] 토스페이먼츠 환불 API 테스트 (실제 결제건으로)
- [ ] SMS 템플릿 확인 (고객에게 보이는 문구)
- [ ] Slack 알림 채널 확인
- [ ] 관리자 페이지에서 새 상태 라벨 정상 표시 확인
- [ ] 환불 계좌 정보 보안 처리 (마스킹 등)

## 알려진 제한사항

1. 현재 가상계좌 결제만 지원 (카드 결제는 별도 처리 필요)
2. 부분 환불 시 환불 금액 검증은 관리자가 수동으로 해야 함
3. 토큰 유효기간은 7일로 고정
4. 하나의 주문에 대해 하나의 환불만 가능 (부분 환불 후 추가 환불 불가)

## 트러블슈팅

### 문제: SMS가 발송되지 않음
- 해결: SOLAPI_API_KEY, SOLAPI_API_SECRET, SOLAPI_SENDER_NUMBER 환경변수 확인
- 개발 모드에서는 콘솔에 SMS 내용이 출력됩니다.

### 문제: Slack 알림이 오지 않음
- 해결: SLACK_WEBHOOK_URL 환경변수 확인
- 개발 모드에서는 콘솔에 Slack 메시지 내용이 출력됩니다.

### 문제: 토스페이먼츠 환불 실패
- 해결: TOSS_SECRET_KEY 확인
- 주문의 toss_payment_key가 올바른지 확인
- 토스페이먼츠 대시보드에서 결제 상태 확인

### 문제: 관리자 페이지에서 취소 요청 버튼이 안 보임
- 해결: 주문을 정확히 1개만 선택했는지 확인
- 선택한 주문의 상태가 PAID, OUT_FOR_DELIVERY, LATE_DEPOSIT 중 하나인지 확인

## 문의

문제가 발생하거나 추가 기능이 필요한 경우 개발팀에 문의해주세요.
