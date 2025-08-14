import * as https from 'https';

export function httpsJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        const chunks: Uint8Array[] = [];
        res.on('data', (c) =>
          chunks.push(Buffer.isBuffer(c) ? new Uint8Array(c) : new Uint8Array(Buffer.from(c)))
        );
        res.on('end', () => {
          try {
            const body = Buffer.concat(chunks as any).toString('utf8');
            resolve(JSON.parse(body));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on('error', reject);
  });
}


