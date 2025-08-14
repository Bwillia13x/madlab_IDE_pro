
export const tokens = {
  colors: {
    light: {
      background: 'hsl(0 0% 100%)', // #ffffff
      foreground: 'hsl(0 0% 0%)', // #000000
      card: 'hsl(0 0% 95%)', // #f3f3f3
      'card-foreground': 'hsl(0 0% 0%)',
      popover: 'hsl(0 0% 95%)',
      'popover-foreground': 'hsl(0 0% 0%)',
      primary: 'hsl(207 100% 40%)', // #007acc
      'primary-foreground': 'hsl(0 0% 100%)',
      secondary: 'hsl(207 100% 40%)', // #0066cc
      'secondary-foreground': 'hsl(0 0% 100%)',
      muted: 'hsl(0 0% 93%)',
      'muted-foreground': 'hsl(0 0% 40%)',
      accent: 'hsl(0 0% 94%)', // #f0f0f0
      'accent-foreground': 'hsl(0 0% 0%)',
      destructive: 'hsl(0 84% 60%)',
      'destructive-foreground': 'hsl(0 0% 98%)',
      warning: 'hsl(40 89% 65%)',
      border: 'hsl(0 0% 88%)', // #e1e1e1
      input: 'hsl(0 0% 100%)', // #ffffff
      ring: 'hsl(207 100% 40%)',
      'selection-background': 'hsl(207 100% 40% / 0.125)', // #007acc20
      'titlebar-background': 'hsl(0 0% 100%)', // #ffffff
    },
    dark: {
      background: 'hsl(240 5% 12%)', // #1e1e1e
      foreground: 'hsl(0 0% 80%)', // #cccccc
      card: 'hsl(240 4% 14%)', // #252526
      'card-foreground': 'hsl(0 0% 80%)',
      popover: 'hsl(240 4% 14%)',
      'popover-foreground': 'hsl(0 0% 80%)',
      primary: 'hsl(207 100% 40%)', // #007acc
      'primary-foreground': 'hsl(0 0% 100%)',
      secondary: 'hsl(210 79% 32%)', // #0e639c
      'secondary-foreground': 'hsl(0 0% 100%)',
      muted: 'hsl(0 0% 58%)', // #969696
      'muted-foreground': 'hsl(0 0% 70%)',
      accent: 'hsl(240 2% 18%)', // #2a2d2e
      'accent-foreground': 'hsl(0 0% 85%)',
      destructive: 'hsl(0 70% 45%)',
      'destructive-foreground': 'hsl(0 0% 98%)',
      warning: 'hsl(40 89% 65%)',
      border: 'hsl(240 3% 18%)', // #2d2d30
      input: 'hsl(240 2% 23%)', // #3c3c3c
      ring: 'hsl(207 100% 40%)',
      'selection-background': 'hsl(207 100% 40% / 0.25)', // #007acc40
      'titlebar-background': 'hsl(240 2% 20%)', // #323233
    },
    chart: {
      red: '#ff0000',
      green: '#00ff00',
      blue: '#0000ff',
    },
  },
  spacing: {
    '0': '0',
    '1': '0.25rem',
    '2': '0.5rem',
    '3': '0.75rem',
    '4': '1rem',
    '5': '1.25rem',
    '6': '1.5rem',
    '8': '2rem',
    '10': '2.5rem',
    '12': '3rem',
    '16': '4rem',
    '20': '5rem',
    '24': '6rem',
    '32': '8rem',
  },
  borderRadius: {
    none: '0',
    sm: '0.125rem',
    DEFAULT: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    full: '9999px',
  },
  typography: {
    fontFamily: {
      sans: ['var(--font-sans)', 'sans-serif'],
      mono: ['var(--font-mono)', 'monospace'],
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
      '5xl': '3rem',
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
  },
  boxShadow: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
    none: 'none',
  },
  zIndex: {
    '0': '0',
    '10': '10',
    '20': '20',
    '30': '30',
    '40': '40',
    '50': '50',
    auto: 'auto',
  },
  duration: {
    '75': '75ms',
    '100': '100ms',
    '150': '150ms',
    '200': '200ms',
    '300': '300ms',
    '500': '500ms',
    '700': '700ms',
    '1000': '1000ms',
  },
  easing: {
    linear: 'linear',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
};
