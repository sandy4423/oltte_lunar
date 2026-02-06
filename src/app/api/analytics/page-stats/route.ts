import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

/**
 * GET /api/analytics/page-stats
 * 페이지 방문 통계 조회
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const searchParams = req.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30');
    
    // 기간 설정
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // 전체 통계
    const { count: totalViews, error: totalError } = await supabase
      .from('page_views')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString());
    
    if (totalError) throw totalError;
    
    // 페이지별 통계
    const { data: pageStats, error: pageError } = await supabase
      .from('page_views')
      .select('page')
      .gte('created_at', startDate.toISOString());
    
    if (pageError) throw pageError;
    
    const pageBreakdown = (pageStats || []).reduce((acc, { page }) => {
      acc[page] = (acc[page] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // 단지별 통계 (주문 페이지만)
    const { data: aptStats, error: aptError } = await supabase
      .from('page_views')
      .select('apt_code')
      .eq('page', '/order')
      .not('apt_code', 'is', null)
      .gte('created_at', startDate.toISOString());
    
    if (aptError) throw aptError;
    
    const aptBreakdown = (aptStats || []).reduce((acc, { apt_code }) => {
      if (apt_code) {
        acc[apt_code] = (acc[apt_code] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    
    // 일별 추이
    const { data: dailyData, error: dailyError } = await supabase
      .from('page_views')
      .select('created_at')
      .gte('created_at', startDate.toISOString());
    
    if (dailyError) throw dailyError;
    
    const dailyBreakdown = (dailyData || []).reduce((acc, { created_at }) => {
      const date = created_at.split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // 유입 경로별 방문 통계
    const { data: sourceStats, error: sourceError } = await supabase
      .from('page_views')
      .select('source')
      .not('source', 'is', null)
      .gte('created_at', startDate.toISOString());
    
    if (sourceError) throw sourceError;
    
    const sourceBreakdown = (sourceStats || []).reduce((acc, { source }) => {
      if (source) {
        acc[source] = (acc[source] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    
    return NextResponse.json({
      totalViews: totalViews || 0,
      pageBreakdown,
      aptBreakdown,
      dailyBreakdown,
      sourceBreakdown,
      period: { days, startDate: startDate.toISOString() },
    });
  } catch (error) {
    console.error('[API] Page stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
