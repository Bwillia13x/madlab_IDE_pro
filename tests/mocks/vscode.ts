// Minimal VS Code API mock used for unit tests
export const ColorThemeKind = { Light: 1, Dark: 2, HighContrast: 3 } as const;

type Subscriber = (e: { kind: number }) => void;
const themeSubscribers: Subscriber[] = [];

export const window = {
  activeColorTheme: { kind: ColorThemeKind.Dark },
  onDidChangeActiveColorTheme: (cb: Subscriber) => {
    themeSubscribers.push(cb);
    return { dispose: () => {} } as { dispose(): void };
  },
  showInformationMessage: async (_msg: string) => undefined,
  showWarningMessage: async (_msg: string) => undefined,
  showErrorMessage: async (_msg: string) => undefined,
  _emitTheme(kind: number) {
    for (const cb of themeSubscribers) cb({ kind });
  },
};

export default { window, ColorThemeKind };


