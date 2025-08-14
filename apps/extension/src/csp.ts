/**
 * CSP utilities for VS Code webview
 */

/**
 * Rewrites relative asset URLs in HTML to webview URIs using the provided mapper
 */
export function rewriteAssetUrls(html: string, mapUrl: (url: string) => string): string {
  return html.replace(/(src|href)=["'](?!https?:\/\/)([^"']+)["']/g, (_m, attr, url) => {
    return `${attr}="${mapUrl(String(url))}"`;
  });
}

/**
 * Adds nonce attributes to all script tags that don't already include one
 */
export function addNonceToScriptTags(html: string, nonce: string): string {
  return html.replace(/<script(?![^>]*nonce=)([^>]*)>/gi, `<script nonce="${nonce}"$1>`);
}

/**
 * Builds a CSP meta tag string for the given webview cspSource and nonce
 */
export function buildCspMeta(webviewCspSource: string, nonce: string): string {
  return `
    <meta http-equiv="Content-Security-Policy"
      content="default-src 'none';
               img-src ${webviewCspSource} data:;
               style-src ${webviewCspSource} 'unsafe-inline';
               script-src 'nonce-${nonce}';
               connect-src ${webviewCspSource} https:;
               font-src ${webviewCspSource};">
  `;
}


