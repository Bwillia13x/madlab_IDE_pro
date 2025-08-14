"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWebviewContent = void 0;
function getWebviewContent({ webview, scriptUri, styleUri, nonce, }) {
    const cspSource = webview.cspSource;
    const csp = [
        "default-src 'none'",
        `img-src ${cspSource} data:`,
        `style-src ${cspSource} 'nonce-${nonce}'`,
        `script-src 'nonce-${nonce}'`,
        `font-src ${cspSource} data:`,
    ].join('; ');
    const script = scriptUri.toString();
    const style = styleUri.toString();
    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="${csp}" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="stylesheet" href="${style}" nonce="${nonce}" />
    <title>MadLab Finance Panel</title>
  </head>
  <body>
    <div id="app" aria-label="MadLab Finance Panel"></div>
    <script nonce="${nonce}" src="${script}"></script>
  </body>
  </html>`;
}
exports.getWebviewContent = getWebviewContent;
