/**
 * Sentiric SUTS v4.0 Lightweight Logger for SDK
 */
export class Logger {
  private static tenantId: string = 'unknown';

  static setTenant(id: string) {
    this.tenantId = id;
  }

  private static log(severity: string, event: string, message: string, attributes: any = {}) {
    const record = {
      schema_v: "1.0.0",
      ts: new Date().toISOString(),
      severity,
      tenant_id: this.tenantId,
      resource: {
        "service.name": "voice-widget-sdk",
        "service.version": "0.1.0",
        "service.env": "production"
      },
      event,
      message,
      attributes
    };

    // Anayasaya göre: console.log yasak, ama JSON formatında basılabilir
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