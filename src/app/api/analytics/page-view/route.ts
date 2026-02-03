import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * POST /api/analytics/page-view
 * 페이지 방문 기록
 */
export async function POST(req: NextRequest) {
  try {
    const { page, aptCode, source, userAgent } = await req.json();
    
    if (!page) {
      return NextResponse.json(
        { error: 'Page is required' },
        { status: 400 }
      );
    }
    
    const { error } = await supabase.from('page_views').insert({
      page,
      apt_code: aptCode || null,
      source: source || null,
      user_agent: userAgent || null,
    });
    
    if (error) {
      console.error('[API] Page view insert error:', error);
      return NextResponse.json(
        { error: 'Failed to track page view' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Page view tracking error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
