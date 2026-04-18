import "./ui/voice-widget";
import { SentiricStreamClient } from "./core/stream-client";
export { SentiricStreamClient };
export type { StreamClientOptions } from "./core/stream-client";

// [ARCH-COMPLIANCE] Global Fallback: Modül sistemi bozulsa bile window üzerinden kurtar
if (typeof window !== "undefined") {
  (window as any).SentiricStreamClient = SentiricStreamClient;
}
