import { NextRequest, NextResponse } from 'next/server';
import { getMonitoringStatus } from '@/lib/monitoring/integration';
import { withTracing } from '@/lib/tracing/opentelemetry';

async function handleMonitoringStatus(request: NextRequest) {
  try {
    if (request.method === 'GET') {
      const monitoringStatus = getMonitoringStatus();
      
      return NextResponse.json({
        status: 'success',
        data: monitoringStatus,
        timestamp: new Date().toISOString()
      });
    }
    
    return NextResponse.json(
      { error: 'Method not allowed' },
      { status: 405 }
    );
    
  } catch (error) {
    console.error('Failed to get monitoring status:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to get monitoring status',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Export wrapped handlers with tracing
export const GET = withTracing(handleMonitoringStatus);

