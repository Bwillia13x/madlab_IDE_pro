import { NextRequest, NextResponse } from 'next/server';
import { globalTracer } from '@/lib/tracing/tracer';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const traceId = searchParams.get('traceId');
    const limit = parseInt(searchParams.get('limit') || '100');
    
    if (traceId) {
      // Get specific trace
      const trace = globalTracer.getTrace(traceId);
      if (!trace) {
        return NextResponse.json(
          { error: 'Trace not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        traceId,
        spans: trace,
        summary: {
          totalSpans: trace.length,
          duration: trace.reduce((max, span) => 
            span.duration ? Math.max(max, span.duration) : max, 0
          ),
          statuses: trace.reduce((acc, span) => {
            acc[span.status] = (acc[span.status] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        }
      });
    }
    
    // Get all traces
    const allTraces = globalTracer.getAllTraces();
    const limitedTraces = allTraces.slice(-limit);
    
    const traces = limitedTraces.map(trace => {
      const traceId = trace[0]?.traceId || 'unknown';
      const duration = trace.reduce((max, span) => 
        span.duration ? Math.max(max, span.duration) : max, 0
      );
      const statuses = trace.reduce((acc, span) => {
        acc[span.status] = (acc[span.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      return {
        traceId,
        spanCount: trace.length,
        duration,
        statuses,
        startTime: trace[0]?.startTime,
        endTime: trace[0]?.endTime
      };
    });
    
    return NextResponse.json({
      traces,
      total: allTraces.length,
      limit,
      summary: {
        totalTraces: allTraces.length,
        averageSpansPerTrace: allTraces.length > 0 
          ? allTraces.reduce((sum, trace) => sum + trace.length, 0) / allTraces.length 
          : 0,
        averageDuration: allTraces.length > 0
          ? allTraces.reduce((sum, trace) => {
              const traceDuration = trace.reduce((max, span) => 
                span.duration ? Math.max(max, span.duration) : max, 0
              );
              return sum + traceDuration;
            }, 0) / allTraces.length
          : 0
      }
    });
  } catch (error) {
    console.error('Failed to retrieve traces:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to retrieve traces',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    globalTracer.clearTraces();
    
    return NextResponse.json({
      message: 'All traces cleared successfully'
    });
  } catch (error) {
    console.error('Failed to clear traces:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to clear traces',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

