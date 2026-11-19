import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { BEHAVIOR_APPS, isValidBehaviorPage } from '@/lib/behavior/page'

/**
 * 손님 행동 기록 받기 — POST /api/menu/behavior (2026-10-24)
 *
 * 화면 수집기(BehaviorTracker · lib/behavior.ts)가 5초마다 묶어서 보낸다 → `behavior_events` 표.
 * 사장님 2026-10-24 「모든 헛클릭을 기록하고 바로 분석할수있게도 해」.
 *
 * `/api/fresh/track` 과 같은 원칙이다 (그 파일 머리 주석을 먼저 읽을 것):
 *  · 무인증이라 값을 믿지 않는다 — 화면 이름·이벤트 이름은 아래 집합에 있는 것만, 글자는 잘라서 넣는다
 *  · 외부 분석 도구를 쓰지 않는다 — 주문 토큰 주소가 밖으로 나가면 안 된다
 *  · **무슨 일이 있어도 200.** 곁다리 기록이 손님 화면에 오류를 띄우면 안 된다
 *  · 표가 아직 없으면(마이그레이션 전) 조용히 버린다 — 인스턴스당 한 번만 로그
 */

/*
  화면 이름(2026-10-28 전 화면 확대): 고정 목록 대신 모양 검사. '/' 로 시작·80자 이하·[A-Za-z0-9_:-.]·
  토큰처럼 생긴 조각이 안 가려진 채 들어 있으면 버린다 (수집기가 토큰을 :token 으로 가려서 보낸다).
*/
export const dynamic = 'force-dynamic'

const APPS = new Set<string>(BEHAVIOR_APPS)

const EVENTS = new Set([
  // 헛클릭·답답함 (수집기)
  'dead_click', 'disabled_click', 'no_effect_click', 'rage_click',
  'field_empty_leave', 'error_shown', 'js_error', 'leave',
  // 주문과 잇기
  'order_created',
  // 품절 상품을 더 사려고 누름 = 사고 싶다는 표시 (2026-10-31 사장님)
  'soldout_want',
  // 운영 관리(/operation)에서 사장님이 쓴 칸 이름 — 많이 쓰는 칸을 위로 올리려고 (2026-10-31 사장님)
  'op_use',
  // 깊은 기록 (2026-11-10 사장님 「기록 깊게 많이해」) — behavior-listeners.ts deep
  'ctx', 'tap', 'scroll_depth', 'card_seen', 'card_dwell', 'return',
  // 기존 퍼널 이벤트 (campaign-track.ts 가 같이 보낸다) — api/fresh/track 의 EVENTS 와 같게
  'view', 'add_qty', 'cart_next', 'cart_blocked', 'submit_click', 'submit_blocked', 'submit_error',
  'submit_success', 'deposit_view', 'copy_account', 'copy_name',
  'block_qty', 'block_method', 'block_ship_blocked', 'block_pickup_day', 'block_ship_date', 'block_address',
  'block_name_empty', 'block_name_bad', 'block_phone_empty', 'block_phone_bad',
  'name_confirm_ok', 'name_confirm_fix',
])

const ID_RE = /^[A-Za-z0-9_-]{8,64}$/
const MAX_EVENTS = 50

function smallInt(v: unknown, max = 32000): number | null {
  const n = Number(v)
  if (!Number.isFinite(n)) return null
  return Math.max(-max, Math.min(max, Math.round(n)))
}

/** meta 는 얕은 객체 하나, 값은 짧은 글자·숫자·참거짓만. 토큰처럼 긴 글자는 잘린다 */
function cleanMeta(v: unknown): Record<string, string | number | boolean | null> | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null
  const out: Record<string, string | number | boolean | null> = {}
  let n = 0
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (n >= 8 || !/^[a-zA-Z_]{1,20}$/.test(k)) continue
    if (typeof val === 'number' && Number.isFinite(val)) out[k] = val
    else if (typeof val === 'boolean' || val === null) out[k] = val
    else if (typeof val === 'string') out[k] = val.slice(0, 40)
    else continue
    n++
  }
  return n ? out : null
}

let warnedMissingTable = false

export async function POST(req: NextRequest) {
  try {
    // 본문은 글자로 읽어 직접 JSON 으로 푼다 — req.json() 은 Content-Type 을 안 따지지만, 다른 사이트(buildup·psychart)의
    // 수집기는 CORS 사전 확인(preflight)을 피하려고 text/plain 으로 보낸다. 같은 사이트는 application/json. 둘 다 여기서 통한다.
    const raw = await req.text()
    if (raw.length > 64_000) return NextResponse.json({ ok: true })
    const body = (() => { try { return JSON.parse(raw) } catch { return null } })()
    if (!body || typeof body !== 'object') return NextResponse.json({ ok: true })

    const page = typeof body.page === 'string' ? body.page : ''
    const visitor = typeof body.visitor === 'string' ? body.visitor : ''
    const session = typeof body.session === 'string' ? body.session : ''
    if (!isValidBehaviorPage(page) || !ID_RE.test(visitor) || !ID_RE.test(session)) {
      return NextResponse.json({ ok: true })
    }
    const app = typeof body.app === 'string' && APPS.has(body.app) ? body.app : 'mandu'
    const step = smallInt(body.step, 9)
    const vw = smallInt(body.vw)
    const vh = smallInt(body.vh)
    const events = Array.isArray(body.events) ? body.events.slice(0, MAX_EVENTS) : []

    const now = Date.now()
    const rows = []
    for (const e of events) {
      if (!e || typeof e !== 'object') continue
      const event = typeof e.event === 'string' ? e.event : ''
      if (!EVENTS.has(event)) continue
      // 손님 시계를 그대로 믿지 않는다 — 지금 기준 ±10분 안쪽일 때만 그 시각을 쓴다
      const t = Number(e.t)
      const at = Number.isFinite(t) && Math.abs(now - t) < 600_000 ? new Date(t) : new Date(now)
      rows.push({
        created_at: at.toISOString(),
        visitor, session, page, vw, vh,
        step: e.s === undefined ? step : smallInt(e.s, 9),
        event,
        target: typeof e.target === 'string' ? e.target.slice(0, 80) : null,
        x: smallInt(e.x),
        y: smallInt(e.y),
        meta: app ? { ...(cleanMeta(e.meta) ?? {}), app } : cleanMeta(e.meta),
      })
    }
    if (!rows.length) return NextResponse.json({ ok: true })

    // behavior_events 는 생성 타입에 없어서 느슨한 타입으로 쓴다
    const supabase = createServerSupabaseClient() as unknown as { from: (t: string) => { insert: (r: unknown) => Promise<{ error: { message: string } | null }> } }
    const { error } = await supabase.from('behavior_events').insert(rows)
    if (error) {
      const missing = /does not exist|schema cache/i.test(error.message)
      if (!missing || !warnedMissingTable) {
        console.error('[menu/behavior] 기록 실패:', error.message)
        if (missing) warnedMissingTable = true
      }
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[menu/behavior] 기록 실패:', e instanceof Error ? e.message : e)
    return NextResponse.json({ ok: true })
  }
}
