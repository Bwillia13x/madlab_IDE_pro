import { NextRequest, NextResponse } from 'next/server';
import { generateOpenAPISpecJSON, generateOpenAPISpecYAML } from '@/lib/documentation/openapi';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';
    
    if (format === 'yaml' || format === 'yml') {
      // For now, YAML format returns JSON since YAML package is not available
      const yamlSpec = await generateOpenAPISpecYAML();
      return new NextResponse(yamlSpec, {
        headers: {
          'Content-Type': 'application/json', // Changed from text/yaml since we return JSON
          'Cache-Control': 'public, max-age=3600'
        }
      });
    }
    
    // Default to JSON format
    const jsonSpec = generateOpenAPISpecJSON();
    return new NextResponse(jsonSpec, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (error) {
    console.error('Failed to generate API documentation:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to generate API documentation',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Serve OpenAPI specification as JSON by default
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { format = 'json' } = body;
    
    if (format === 'yaml' || format === 'yml') {
      // For now, YAML format returns JSON since YAML package is not available
      const yamlSpec = await generateOpenAPISpecYAML();
      return new NextResponse(yamlSpec, {
        headers: {
          'Content-Type': 'application/json' // Changed from text/yaml since we return JSON
        }
      });
    }
    
    const jsonSpec = generateOpenAPISpecJSON();
    return NextResponse.json(JSON.parse(jsonSpec));
  } catch (error) {
    console.error('Failed to generate API documentation:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to generate API documentation',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
