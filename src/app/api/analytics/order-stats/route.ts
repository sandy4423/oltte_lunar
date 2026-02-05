import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/analytics/order-stats
 * 주문 유입 경로 통계 조회
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30');
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // 유입 경로별 주문 수 (숨긴 주문 제외)
    const { data: orderSourceStats, error } = await supabase
      .from('orders')
      .select('source, status')
      .not('source', 'is', null)
      .eq('is_hidden', false)
      .gte('created_at', startDate.toISOString());
    
    if (error) throw error;
    
    const sourceBreakdown = (orderSourceStats || []).reduce((acc, { source, status }) => {
      if (source) {
        if (!acc[source]) {
          acc[source] = { total: 0, paid: 0 };
        }
        acc[source].total++;
        if (status === 'PAID' || status === 'OUT_FOR_DELIVERY' || status === 'DELIVERED') {
          acc[source].paid++;
        }
      }
      return acc;
    }, {} as Record<string, { total: number; paid: number }>);
    
    return NextResponse.json({
      sourceBreakdown,
      period: { days, startDate: startDate.toISOString() },
    });
  } catch (error) {
    console.error('[API] Order stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
