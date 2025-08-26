import { NextRequest, NextResponse } from 'next/server';
import { prometheusMetricsExporter } from '@/lib/monitoring/prometheus';
import { withTracing } from '@/lib/tracing/opentelemetry';

async function handleMetrics(request: NextRequest) {
  try {
    if (request.method === 'GET') {
      // Get the Prometheus metrics endpoint URL
      const metricsUrl = prometheusMetricsExporter.getMetricsUrl();
      
      // Redirect to the actual Prometheus metrics endpoint
      return NextResponse.redirect(metricsUrl);
    }
    
    return NextResponse.json(
      { error: 'Method not allowed' },
      { status: 405 }
    );
    
  } catch (error) {
    console.error('Failed to serve metrics:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to serve metrics',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Export wrapped handlers with tracing
export const GET = withTracing(handleMetrics);

