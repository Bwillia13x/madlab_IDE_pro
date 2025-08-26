/**
 * Tiny centralized error logger to standardize console warnings/errors.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: unknown;
  timestamp: number;
}

export interface TelemetryEvent {
  action: string;
  success: boolean;
  duration?: number;
  context?: Record<string, unknown>;
  timestamp: number;
}

const history: LogEntry[] = [];
const telemetry: TelemetryEvent[] = [];

export function log(level: LogLevel, message: string, context?: Record<string, unknown>, error?: unknown): void {
  const entry: LogEntry = { level, message, context, error, timestamp: Date.now() };
  history.push(entry);
  // Fan out to console with consistent formatting
  const prefix = `[MADLAB ${level.toUpperCase()}]`;
  // eslint-disable-next-line no-console
  if (level === 'error') console.error(prefix, message, context || '', error || '');
  // eslint-disable-next-line no-console
  else if (level === 'warn') console.warn(prefix, message, context || '', error || '');
  // eslint-disable-next-line no-console
  else if (level === 'info') console.info(prefix, message, context || '', error || '');
  // eslint-disable-next-line no-console
  else console.debug(prefix, message, context || '', error || '');
}

export function trackEvent(action: string, success: boolean, context?: Record<string, unknown>, duration?: number): void {
  const event: TelemetryEvent = {
    action,
    success,
    duration,
    context,
    timestamp: Date.now(),
  };
  telemetry.push(event);
  
  // Log telemetry events at info level
  log('info', `Telemetry: ${action} ${success ? 'succeeded' : 'failed'}`, { ...context, duration });
}

export function getHistory(limit = 200): LogEntry[] {
  return history.slice(-limit);
}

export function getTelemetry(limit = 100): TelemetryEvent[] {
  return telemetry.slice(-limit);
}

export function clearHistory(): void {
  history.length = 0;
}

export function clearTelemetry(): void {
  telemetry.length = 0;
}


