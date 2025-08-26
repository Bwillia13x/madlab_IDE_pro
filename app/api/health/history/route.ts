import { NextRequest, NextResponse } from 'next/server';
import { getHealthHistory, getHealthTrends, getHealthAnalytics, clearHealthHistory } from '@/lib/health/history';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const timeframe = searchParams.get('timeframe') || undefined;
    const component = searchParams.get('component') || undefined;
    const type = searchParams.get('type') || 'history';
    
    if (type === 'trends') {
      const trends = getHealthTrends();
      return NextResponse.json({
        trends,
        timestamp: new Date().toISOString()
      });
    }
    
    if (type === 'analytics') {
      const analytics = getHealthAnalytics();
      return NextResponse.json({
        analytics,
        timestamp: new Date().toISOString()
      });
    }
    
    // Default to history
    const history = getHealthHistory(limit, timeframe, component);
    
    return NextResponse.json({
      history,
      total: history.length,
      filters: {
        limit,
        timeframe,
        component
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Failed to retrieve health history:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to retrieve health history',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    clearHealthHistory();
    
    return NextResponse.json({
      message: 'Health history cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to clear health history:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to clear health history',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

