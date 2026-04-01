/**
 * Sentiric Stream Client Options
 */
export interface StreamClientOptions {
  gatewayUrl: string;
  tenantId: string;
  language?: string;
  onAudioReceived?: (chunk: Uint8Array) => void;
  onError?: (error: any) => void;
  onClose?: () => void;
}

export class SentiricStreamClient {
  private ws: WebSocket | null = null;
  private options: StreamClientOptions;
  private isReady: boolean = false;

  constructor(options: StreamClientOptions) {
    this.options = {
      language: 'tr-TR',
      ...options,
    };
  }

  /**
   * Gateway'e WebSocket bağlantısını başlatır.
   */
  public async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        console.log(`🔗 Connecting to: ${this.options.gatewayUrl}`);
        this.ws = new WebSocket(this.options.gatewayUrl);
        this.ws.binaryType = 'arraybuffer';

        this.ws.onopen = () => {
          console.log('🔌 WebSocket Connected to Gateway');
          this.sendSessionConfig();
          this.isReady = true;
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onerror = (err) => {
          console.error('❌ WebSocket Error:', err);
          if (this.options.onError) this.options.onError(err);
          reject(err);
        };

        this.ws.onclose = () => {
          console.warn('⚠️ WebSocket Closed');
          this.isReady = false;
          if (this.options.onClose) this.options.onClose();
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Gateway'in beklediği SessionConfig mesajını gönderir.
   */
  private sendSessionConfig() {
    console.log('🛡️ Sending SessionConfig for Tenant:', this.options.tenantId);
    // TODO: Protobuf Encode logic (WIDGET-002)
  }

  /**
   * Ham ses verisini (PCM) Gateway'e gönderir.
   */
  public sendAudio(_chunk: Uint8Array) {
    if (!this.isReady || !this.ws) return;
    // TODO: Protobuf Encode logic (WIDGET-002)
  }

  private handleMessage(_data: ArrayBuffer) {
    // TODO: Protobuf Decode logic (WIDGET-002)
  }

  public disconnect() {
    this.ws?.close();
    this.isReady = false;
  }
}