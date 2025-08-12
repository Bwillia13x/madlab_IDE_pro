# Security Audit

Scope: apps/extension (VS Code), web app (Next.js static), repository-wide secrets and CSP

## Findings

- Webview CSP present and uses a per-session nonce for `script-src`.
  - script-src restricted to `'nonce-<generated>'`.
  - `style-src` permits `'unsafe-inline'` (acceptable for shadcn/ui inline styles in webview constraints).
  - `connect-src` limited to webview origin + https.
- Nonce is injected into all script tags at runtime.
- Secrets are handled via VS Code `SecretStorage` with `madlab.setAlphaVantageKey`, `madlab.setYahooKey`, and `madlab.clearApiKeys` commands.
- Extension enforces `localResourceRoots` scoped to resolved `out` or bundled `dist/webview`.
- Quick grep finds no plaintext API keys in repo.

## Evidence
- CSP injection and nonce handling:
```342:371:apps/extension/src/extension.ts
function getWebviewContent(webview: vscode.Webview, webviewRoot: vscode.Uri): string {
  ...
  const nonce = crypto.randomBytes(16).toString('base64');
  const csp = `
    <meta http-equiv="Content-Security-Policy"
      content="default-src 'none';
               img-src ${webview.cspSource} data:;
               style-src ${webview.cspSource} 'unsafe-inline';
               script-src 'nonce-${nonce}';
               connect-src ${webview.cspSource} https:;
               font-src ${webview.cspSource};">
  `;
  html = html.replace(/<head>([\s\S]*?)<\/head>/i, (_m, headInner) => `<head>${csp}${bridgeScript(nonce)}${headInner}</head>`);
  html = addNonceToScriptTags(html, nonce);
  return html;
}
```
- SecretStorage commands:
```12:45:apps/extension/src/extension.ts
export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('madlab.setAlphaVantageKey', async () => {
      ...
      await context.secrets.store('alphaVantageApiKey', key);
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('madlab.setYahooKey', async () => {
      ...
      await context.secrets.store('yahooApiKey', key);
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('madlab.clearApiKeys', async () => {
      await context.secrets.delete('alphaVantageApiKey');
      await context.secrets.delete('yahooApiKey');
    })
  );
}
```
- TTL cache present in extension for data responses.

## Risks
- `style-src 'unsafe-inline'` is necessary in VS Code webviews but should be minimized by preferring class-based styling.
- No secrets in web app; ensure no `NEXT_PUBLIC_*` secrets are used for financial APIs. Web app should always use mock data in demo mode (confirmed banner present).

## Recommendations
- Keep all network calls in extension process only. Verify all data fetch functions originate in extension (they do: `fetchAlphaVantage*` shims in extension.ts). Avoid new fetches from webview.
- Add a test that validates webview HTML contains CSP meta with `'nonce-...'` and that all `<script>` tags include a `nonce` attribute.
- Consider adding Trusted Types policy if inline scripts are ever added (not currently necessary).