/**
 * Sentiric SUTS v4.0 Lightweight Logger for SDK
 */
export declare class Logger {
    private static tenantId;
    static setTenant(id: string): void;
    private static log;
    static info(event: string, message: string, attrs?: any): void;
    static warn(event: string, message: string, attrs?: any): void;
    static error(event: string, message: string, attrs?: any): void;
}
