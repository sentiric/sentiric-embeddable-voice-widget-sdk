// File: src/utils/logger.ts

/**
 * Sentiric SUTS v4.0 Lightweight Logger for SDK
 */
export class Logger {
  private static tenantId: string = 'unknown';
  private static traceId: string | null = null;
  private static sessionId: string | null = null;

  static setContext(tenantId: string, traceId: string, sessionId: string) {
    this.tenantId = tenantId;
    this.traceId = traceId;
    this.sessionId = sessionId;
  }

  private static generateSpanId(): string {
    return Math.random().toString(16).substring(2, 18).padStart(16, '0');
  }

  private static log(severity: string, event: string, message: string, attributes: any = {}) {
    const record = {
      schema_v: "1.0.0",
      ts: new Date().toISOString(),
      severity,
      tenant_id: this.tenantId,
      resource: {
        "service.name": "sentiric-stream-sdk",
        "service.version": "0.1.4", // Yeni versiyona uyumlu
        "service.env": "production"
      },
      trace_id: this.traceId,
      span_id: this.generateSpanId(),
      event,
      message,
      attributes: {
        session_id: this.sessionId,
        ...attributes
      }
    };

    // SUTS v4.0 Anayasasına göre loglar JSON olarak standart çıktıya (console) basılır.
    console.debug(JSON.stringify(record));
  }

  static info(event: string, message: string, attrs: any = {}) {
    this.log("INFO", event, message, attrs);
  }

  static warn(event: string, message: string, attrs: any = {}) {
    this.log("WARN", event, message, attrs);
  }

  static error(event: string, message: string, attrs: any = {}) {
    this.log("ERROR", event, message, attrs);
  }
}