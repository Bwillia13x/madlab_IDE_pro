declare global {
  interface Window {
    madlabBridge?: {
      post: (type: string, payload?: unknown) => void;
      onMessage: (
        handler: (msg: { type: string; payload?: unknown }) => void
      ) => void;
    };
  }
}
export {};
