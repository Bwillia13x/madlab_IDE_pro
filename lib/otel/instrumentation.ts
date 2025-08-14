// Minimal OpenTelemetry setup for Next.js server handlers
// Lazy-import pattern to avoid hard dependency in environments without OTEL

export function withSpan<T>(name: string, fn: () => Promise<T> | T): Promise<T> | T {
  try {
    // Dynamically require to keep bundle small and optional
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const api = require('@opentelemetry/api') as any
    const tracer = api?.trace?.getTracer ? api.trace.getTracer('madlab') : { startActiveSpan: (_: string, run: (span: any) => any) => run({ end() {}, recordException() {}, setStatus() {} }) }
    return tracer.startActiveSpan(name, (span: any) => {
      try {
        const res = fn()
        if (res && typeof (res as any).then === 'function') {
          return (res as Promise<T>).then((v) => { span.end(); return v }).catch((e) => { span.recordException(e); span.setStatus({ code: 2 }); span.end(); throw e })
        }
        span.end()
        return res as T
      } catch (e) {
        span.recordException(e as Error)
        span.setStatus({ code: 2 })
        span.end()
        throw e
      }
    })
  } catch {
    // If OTEL is not present, just run
    return fn()
  }
}


