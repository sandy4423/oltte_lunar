/**
 * 출하 수량 설정 API
 * 
 * 관리자가 상품별/날짜별 출하 수량을 설정/수정합니다.
 * UPSERT 방식으로 기존 데이터가 있으면 업데이트, 없으면 생성합니다.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { verifyAdminAuth } from '@/lib/adminAuth';

// 캐싱 비활성화
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 유효한 출하 날짜 범위
const VALID_SHIPMENT_DATES = [
  '2026-02-11',
  '2026-02-12',
  '2026-02-13',
  '2026-02-14',
  '2026-02-15',
];

// 유효한 상품 SKU
const VALID_SKUS = ['meat', 'kimchi', 'half', 'ricecake_1kg', 'broth_1200ml'];

export async function PUT(request: NextRequest) {
  try {
    const authError = verifyAdminAuth(request);
    if (authError) return authError;

    const body = await request.json();
    const { sku, date, quantity } = body;

    // ============================================
    // 입력값 검증
    // ============================================
    if (!sku || !date || quantity === undefined || quantity === null) {
      return NextResponse.json(
        {
          success: false,
          error: 'sku, date, quantity 필드가 필요합니다.',
        },
        { status: 400 }
      );
    }

    if (!VALID_SKUS.includes(sku)) {
      return NextResponse.json(
        {
          success: false,
          error: `유효하지 않은 상품 SKU입니다: ${sku}`,
        },
        { status: 400 }
      );
    }

    if (!VALID_SHIPMENT_DATES.includes(date)) {
      return NextResponse.json(
        {
          success: false,
          error: `유효하지 않은 출하 날짜입니다: ${date} (2026-02-11 ~ 2026-02-15)`,
        },
        { status: 400 }
      );
    }

    const qty = parseInt(String(quantity), 10);
    if (isNaN(qty) || qty < 0) {
      return NextResponse.json(
        {
          success: false,
          error: '출하 수량은 0 이상의 정수여야 합니다.',
        },
        { status: 400 }
      );
    }

    // ============================================
    // UPSERT: 기존 데이터 업데이트 또는 새로 생성
    // ============================================
    const supabase = createServerSupabaseClient();

    // 기존 데이터 확인
    const { data: existingRaw } = await supabase
      .from('product_shipment_quantities')
      .select('id')
      .eq('sku', sku)
      .eq('shipment_date', date)
      .maybeSingle();

    const existing = existingRaw as { id: string } | null;

    let data;
    let error;

    if (existing) {
      // 업데이트
      const result = await (supabase
        .from('product_shipment_quantities') as any)
        .update({
          quantity: qty,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();
      data = result.data;
      error = result.error;
    } else {
      // 새로 생성
      const result = await (supabase
        .from('product_shipment_quantities') as any)
        .insert({
          sku,
          shipment_date: date,
          quantity: qty,
        })
        .select()
        .single();
      data = result.data;
      error = result.error;
    }

    if (error) {
      console.error('[Admin Shipment API] Upsert error:', error);
      return NextResponse.json(
        {
          success: false,
          timestamp: new Date().toISOString(),
          error: '출하 수량 저장에 실패했습니다.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      data,
    });
  } catch (error: any) {
    console.error('[Admin Shipment API] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        timestamp: new Date().toISOString(),
        error: error.message || '서버 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}
