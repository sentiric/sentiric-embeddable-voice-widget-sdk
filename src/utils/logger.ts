// [ARCH-COMPLIANCE] SUTS v4.0 Flight Recorder Implementation
export class Logger {
  private static tenantId: string = "unknown";
  private static traceId: string | null = null;
  private static sessionId: string | null = null;
  private static flightBuffer: any[] = []; // RAM'deki kara kutu

  public static debugMode: boolean = true;

  static setContext(tenantId: string, traceId: string, sessionId: string) {
    this.tenantId = tenantId;
    this.traceId = traceId;
    this.sessionId = sessionId;
  }

  // Kara kutuyu dışarı aktarır
  public static getFlightLog(): string {
    return JSON.stringify(this.flightBuffer, null, 2);
  }

  private static log(
    severity: string,
    event: string,
    message: string,
    attributes: any = {},
  ) {
    const record = {
      schema_v: "1.0.0",
      ts: new Date().toISOString(),
      severity,
      tenant_id: this.tenantId,
      resource: {
        "service.name": "sentiric-stream-sdk",
        "service.version": __APP_VERSION__,
        "service.env": "production",
      },
      trace_id: this.traceId,
      event,
      message,
      attributes: { session_id: this.sessionId, ...attributes },
    };

    // Kara kutuya ekle (Son 100 logu tut)
    this.flightBuffer.push(record);
    if (this.flightBuffer.length > 100) this.flightBuffer.shift();

    if (this.debugMode) {
      const time = new Date().toLocaleTimeString("en-US", {
        hour12: false,
        fractionalSecondDigits: 3,
      });
      let color = "#3b82f6";
      if (severity === "WARN") color = "#f59e0b";
      if (severity === "ERROR") color = "#ef4444";

      // <empty string> sorununu attributes kontrolüyle çözüyoruz
      const hasAttrs = Object.keys(attributes).length > 0;
      console.log(
        `%c[${time}] [${severity}] [${event}]%c ${message}`,
        `color: ${color}; font-weight: bold;`,
        "color: inherit;",
        hasAttrs ? attributes : "", // Eğer boşsa hiçbir şey basma
      );
    }
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
  static debug(event: string, message: string, attrs: any = {}) {
    this.log("DEBUG", event, message, attrs);
  }
}
