// [ARCH-COMPLIANCE] SOP-01: Expose Logger for Global Observability
import "./ui/voice-widget";
import { SentiricStreamClient } from "./core/stream-client";
import { Logger } from "./utils/logger"; // Eklendi

export { SentiricStreamClient, Logger }; // Logger export edildi
export type { StreamClientOptions } from "./core/stream-client";

if (typeof window !== "undefined") {
  (window as any).SentiricStreamClient = SentiricStreamClient;
  (window as any).SentiricLogger = Logger; // Global köprü kuruldu
}
