import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const swaggerHtml = generateSwaggerHTML();
    
    return new NextResponse(swaggerHtml, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (error) {
    console.error('Failed to generate Swagger UI:', error);
    
    return new NextResponse(
      '<html><body><h1>Error</h1><p>Failed to generate Swagger UI</p></body></html>',
      {
        status: 500,
        headers: {
          'Content-Type': 'text/html'
        }
      }
    );
  }
}

function generateSwaggerHTML(): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MAD LAB Platform API Documentation</title>
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.10.3/swagger-ui.css" />
    <style>
        html {
            box-sizing: border-box;
            overflow: -moz-scrollbars-vertical;
            overflow-y: scroll;
        }
        *, *:before, *:after {
            box-sizing: inherit;
        }
        body {
            margin:0;
            background: #fafafa;
        }
        .swagger-ui .topbar {
            background-color: #1a1a1a;
        }
        .swagger-ui .topbar .download-url-wrapper .select-label {
            color: #fff;
        }
        .swagger-ui .topbar .download-url-wrapper input[type=text] {
            border: 2px solid #41444e;
            border-radius: 4px 0 0 4px;
            color: #fff;
        }
        .swagger-ui .topbar .download-url-wrapper .select-label {
            color: #fff;
        }
        .swagger-ui .topbar .download-url-wrapper .select-label select {
            border: 2px solid #41444e;
            border-left: none;
            border-radius: 0 4px 4px 0;
            color: #fff;
        }
        .swagger-ui .topbar .download-url-wrapper .btn {
            background-color: #4990e2;
            border: 2px solid #4990e2;
            border-radius: 0 4px 4px 0;
            color: #fff;
        }
        .swagger-ui .info .title {
            color: #3b4151;
        }
        .swagger-ui .info .description {
            color: #3b4151;
        }
        .swagger-ui .scheme-container {
            background-color: #f7f7f7;
            margin: 0 0 20px;
            padding: 20px;
            border-radius: 4px;
        }
        .swagger-ui .scheme-container .schemes-title {
            color: #3b4151;
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 10px;
        }
        .swagger-ui .scheme-container .schemes {
            display: flex;
            gap: 10px;
        }
        .swagger-ui .scheme-container .schemes .scheme {
            background-color: #4990e2;
            color: #fff;
            padding: 8px 16px;
            border-radius: 4px;
            text-decoration: none;
            font-weight: 600;
        }
        .swagger-ui .scheme-container .schemes .scheme:hover {
            background-color: #357abd;
        }
        .custom-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            text-align: center;
            margin-bottom: 20px;
        }
        .custom-header h1 {
            margin: 0;
            font-size: 2.5em;
            font-weight: 300;
        }
        .custom-header p {
            margin: 10px 0 0 0;
            font-size: 1.2em;
            opacity: 0.9;
        }
        .custom-header .version {
            background: rgba(255,255,255,0.2);
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.9em;
            margin-top: 10px;
            display: inline-block;
        }
    </style>
</head>
<body>
    <div class="custom-header">
        <h1>MAD LAB Platform API</h1>
        <p>Comprehensive financial analysis and trading platform API</p>
        <div class="version">v1.0.0</div>
    </div>
    
    <div id="swagger-ui"></div>
    
    <script src="https://unpkg.com/swagger-ui-dist@5.10.3/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@5.10.3/swagger-ui-standalone-preset.js"></script>
    <script>
        window.onload = function() {
            const ui = SwaggerUIBundle({
                url: '/api/docs?format=json',
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIStandalonePreset
                ],
                plugins: [
                    SwaggerUIBundle.plugins.DownloadUrl
                ],
                layout: "StandaloneLayout",
                validatorUrl: null,
                onComplete: function() {
                    console.log('MAD LAB Platform API Documentation loaded successfully');
                },
                onFailure: function(data) {
                    console.error('Failed to load API documentation:', data);
                }
            });
        };
    </script>
</body>
</html>
  `;
}

