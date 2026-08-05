# migrations/bingsu — 올때빙수 직원 운영 앱 DB

> ⚠️ **이 폴더의 SQL은 만두 주문 시스템 DB(`oltte-main`)에 절대 실행하지 말 것.**
> 상위 `migrations/`와는 대상 Supabase 프로젝트가 다릅니다.

| | 만두 주문 시스템 | 올때빙수 직원 앱 |
|---|---|---|
| 마이그레이션 | `migrations/*.sql` | `migrations/bingsu/*.sql` |
| Supabase 프로젝트 | `oltte-main` | `OltteBingsu_1` |
| project ref | `wcvhqdsusummpjewtmft` | `ynwwrflavhazebrkjsme` |
| 리전 | ap-northeast-2 | ap-northeast-2 |

## 왜 DB를 분리했나

`oltte-main`은 이미 3개 repo(주문 시스템 / bookkeeping / store-automation)가 공유 중이고,
평문 비밀번호(`staff_accounts.password`)·sessionStorage 기반 인증·RLS 미적용 같은
보안 부채가 쌓여 있습니다. 빙수 직원 앱은 알바생 다수가 개인 폰으로 쓰는 앱이라
그 부채를 상속받지 않도록 새 프로젝트에서 시작했습니다.

감수한 비용: 직원 계정이 브랜드별로 이원화되고, 자비스 매출·회계 집계가 두 DB를 각각 읽어야 합니다.

## 설계 원칙

1. **인증은 Supabase Auth.** 자체 password 컬럼을 두지 않는다. `profiles`가 `auth.users`와 1:1.
2. **모든 테이블 RLS ON + 정책 명시.** service_role 의존을 최소화한다.
3. **매장이 하나여도 `store_id`를 둔다.** 2호점/브랜드 확장 시 값만 채우면 된다.
4. **분류값은 enum 대신 text + CHECK.** (oltte-main의 `product_sku` enum이 이것 때문에 깨졌다.)

## 테이블

| 테이블 | 용도 |
|---|---|
| `stores` | 매장. `songdo` 1건 시드 |
| `profiles` | 직원. `auth.users` 1:1, role = staff/manager/owner |
| `inventory_items` | 재고 항목 마스터 |
| `inventory_logs` | 재고 입력 이력 (append-only, UPDATE/DELETE 정책 없음) |
| `work_logs` | 근무일지·출퇴근. (staff_id, work_date) UNIQUE |
| `checklists` / `checklist_items` | 오픈·마감 체크리스트 템플릿 |
| `checklist_runs` / `checklist_run_items` | 일자별 수행 기록 |

Storage 버킷: `staff-uploads` (비공개, 체크리스트 사진용)

## RLS 헬퍼

`current_store_id()`, `current_staff_role()`, `is_manager()` — 전부 `SECURITY DEFINER`.
`profiles` 정책이 `profiles`를 다시 조회하며 생기는 **무한 재귀를 피하기 위한 장치**이므로
`SECURITY INVOKER`로 바꾸지 말 것.

`authenticated` 롤의 EXECUTE 권한도 **회수하면 안 됩니다.** RLS 정책은 호출자 롤로
평가되므로 권한을 뺏으면 모든 정책이 깨집니다. Supabase 어드바이저가
`authenticated_security_definer_function_executable` 경고를 계속 띄우지만
의도된 상태입니다(두 함수 모두 호출자 본인의 store_id/role만 반환).

## 기본 규칙 요약

- 직원은 **자기 매장 데이터만** 읽고 쓴다.
- 재고 항목 추가/삭제, 체크리스트 편집, 근무일지 삭제는 **매니저 이상**만.
- `inventory_logs`는 수정·삭제 불가 (이력 보존).
- `work_logs`는 본인 것만 기록. 조회는 본인 + 매니저는 매장 전체.

## 남은 작업

- [ ] 첫 관리자 계정 생성 후 `profiles`의 `role='owner'`, `store_id` 지정 (아래 참고)
- [ ] `inventory_items` 초기 항목 시드
- [ ] 오픈·마감 체크리스트 템플릿 시드
- [ ] 직원 앱 프론트엔드 (별도 repo 여부 미정)

### 첫 owner 계정 세팅

Supabase 대시보드 > Authentication > Users에서 계정을 만들면 트리거가 `profiles` 행을
자동 생성합니다. 그 다음 SQL Editor에서:

```sql
update profiles
set role = 'owner',
    store_id = (select id from stores where code = 'songdo'),
    name = '사장님'
where id = (select id from auth.users where email = '<가입한 이메일>');
```

`store_id`가 NULL이면 `current_store_id()`가 NULL이라 **아무 데이터도 안 보입니다.**
신규 직원 추가 시에도 `store_id`를 반드시 채워주세요.
