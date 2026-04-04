/**
 * Sentiric Logger for SDK
 * Geliştirici dostu (Pretty Print) ve SUTS v4.0 (JSON) uyumlu logger.
 */
export class Logger {
  private static tenantId: string = "unknown";
  private static traceId: string | null = null;
  private static sessionId: string | null = null;

  // [YENİ] Konsolu kirletmemek için Pretty Print modu.
  public static debugMode: boolean = true;

  static setContext(tenantId: string, traceId: string, sessionId: string) {
    this.tenantId = tenantId;
    this.traceId = traceId;
    this.sessionId = sessionId;
  }

  private static generateSpanId(): string {
    return Math.random().toString(16).substring(2, 18).padStart(16, "0");
  }

  private static log(
    severity: string,
    event: string,
    message: string,
    attributes: any = {},
  ) {
    if (this.debugMode) {
      const time = new Date().toLocaleTimeString("en-US", {
        hour12: false,
        fractionalSecondDigits: 3,
      });
      let color = "color: #3b82f6; font-weight: bold;";
      if (severity === "WARN") color = "color: #f59e0b; font-weight: bold;";
      if (severity === "ERROR") color = "color: #ef4444; font-weight: bold;";

      console.log(
        `%c[${time}] [${severity}] [${event}]%c ${message}`,
        color,
        "color: inherit;",
        Object.keys(attributes).length ? attributes : "",
      );
      return;
    }

    const record = {
      schema_v: "1.0.0",
      ts: new Date().toISOString(),
      severity,
      tenant_id: this.tenantId,
      resource: {
        "service.name": "sentiric-stream-sdk",
        "service.version": "0.1.17",
        "service.env": "production",
      },
      trace_id: this.traceId,
      span_id: this.generateSpanId(),
      event,
      message,
      attributes: { session_id: this.sessionId, ...attributes },
    };
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
