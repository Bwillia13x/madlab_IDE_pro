"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWebviewContent = void 0;
function getWebviewContent(_a) {
    var webview = _a.webview, scriptUri = _a.scriptUri, styleUri = _a.styleUri, nonce = _a.nonce;
    var cspSource = webview.cspSource;
    var csp = [
        "default-src 'none'",
        "img-src ".concat(cspSource, " data:"),
        "style-src ".concat(cspSource, " 'nonce-").concat(nonce, "'"),
        "script-src 'nonce-".concat(nonce, "'"),
        "font-src ".concat(cspSource, " data:"),
    ].join('; ');
    var script = scriptUri.toString();
    var style = styleUri.toString();
    return "<!DOCTYPE html>\n<html lang=\"en\">\n  <head>\n    <meta charset=\"UTF-8\" />\n    <meta http-equiv=\"Content-Security-Policy\" content=\"".concat(csp, "\" />\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />\n    <link rel=\"stylesheet\" href=\"").concat(style, "\" nonce=\"").concat(nonce, "\" />\n    <title>MadLab Finance Panel</title>\n  </head>\n  <body>\n    <div id=\"app\" aria-label=\"MadLab Finance Panel\"></div>\n    <script nonce=\"").concat(nonce, "\" src=\"").concat(script, "\"></script>\n  </body>\n  </html>");
}
exports.getWebviewContent = getWebviewContent;
