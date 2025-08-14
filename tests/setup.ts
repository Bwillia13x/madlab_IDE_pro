import '@testing-library/jest-dom/vitest'

// jsdom polyfills for charting libs
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const g: any = globalThis as any;
if (typeof g.ResizeObserver === 'undefined') {
  g.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Polyfill URL.createObjectURL / revokeObjectURL for tests
if (!g.URL) {
  g.URL = {} as any;
}
if (typeof g.URL.createObjectURL !== 'function') {
  g.URL.createObjectURL = (_blob: Blob) => 'blob:mock-url';
}
if (typeof g.URL.revokeObjectURL !== 'function') {
  g.URL.revokeObjectURL = (_url: string) => {};
}

// Ensure Blob.text() is available and returns correct content
if (typeof g.Blob !== 'undefined') {
  const proto: any = (g.Blob as any).prototype;
  if (typeof proto.text !== 'function') {
    proto.text = async function () {
      if (typeof this.arrayBuffer === 'function') {
        const ab: ArrayBuffer = await this.arrayBuffer();
        return new TextDecoder().decode(ab);
      }
      // Fallback: try FileReader if available
      return new Promise<string>((resolve, reject) => {
        try {
          const reader = new (g.FileReader || (function () {}) as any)();
          reader.onload = () => resolve(String(reader.result ?? ''));
          reader.onerror = (e: any) => resolve('');
          reader.readAsText(this);
        } catch {
          resolve('');
        }
      });
    };
  }
}