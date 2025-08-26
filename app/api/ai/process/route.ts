import { NextRequest, NextResponse } from 'next/server';
import { processAIRequest, getAvailableAIModels } from '@/lib/ai/service';
import { withTracing } from '@/lib/tracing/tracer';

async function handleAIRequest(request: NextRequest) {
  try {
    if (request.method === 'GET') {
      // Get available AI models
      const models = getAvailableAIModels();
      
      return NextResponse.json({
        availableModels: models,
        timestamp: new Date().toISOString()
      });
    }
    
    if (request.method === 'POST') {
      // Process AI request
      const body = await request.json();
      const { model, prompt, context, stream, maxTokens, temperature } = body;
      
      // Validate required fields
      if (!model || !prompt) {
        return NextResponse.json(
          { error: 'Missing required fields: model and prompt' },
          { status: 400 }
        );
      }
      
      // Check if model is available
      const availableModels = getAvailableAIModels();
      if (!availableModels.includes(model)) {
        return NextResponse.json(
          { 
            error: `Model '${model}' is not available`,
            availableModels 
          },
          { status: 400 }
        );
      }
      
      // Process the AI request
      const aiRequest = {
        model,
        prompt,
        context,
        stream: stream || false,
        maxTokens,
        temperature
      };
      
      const response = await processAIRequest(aiRequest);
      
      return NextResponse.json({
        success: true,
        response,
        timestamp: new Date().toISOString()
      });
    }
    
    return NextResponse.json(
      { error: 'Method not allowed' },
      { status: 405 }
    );
    
  } catch (error) {
    console.error('AI request processing failed:', error);
    
    if (error instanceof Error && error.message.includes('Rate limit exceeded')) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please try again later.',
          retryAfter: 60
        },
        { status: 429 }
      );
    }
    
    return NextResponse.json(
      {
        error: 'AI request processing failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Export wrapped handlers with tracing
export const GET = withTracing(handleAIRequest);
export const POST = withTracing(handleAIRequest);

