declare global {
  interface Window {
    madlabBridge?: {
      post?: (type: string, payload?: unknown) => void;
      onMessage?: (handler: (msg: { type: string; payload?: unknown }) => void) => void;
      request?: <T>(method: string, params?: unknown) => Promise<T>;
      isAvailable?: () => boolean;
    };
  }
}
export {};
