import protobuf from 'protobufjs';

/**
 * SDK'nın Gateway ile konuşması için gerekli ayarlar
 */
export interface StreamClientOptions {
  gatewayUrl: string;
  tenantId: string;
  token?: string; // Kimlik doğrulama için
  language?: string;
  sampleRate?: number;
  edgeMode?: boolean;
  onAudioReceived?: (chunk: Uint8Array) => void;
  onError?: (error: any) => void;
  onClose?: () => void;
}

export class SentiricStreamClient {
  private ws: WebSocket | null = null;
  private options: StreamClientOptions;
  private isReady: boolean = false;
  
  // Protobuf mesaj tipleri
  private RequestType: any = null;
  private ResponseType: any = null;

  constructor(options: StreamClientOptions) {
    this.options = {
      language: 'tr-TR',
      sampleRate: 24000,
      edgeMode: false,
      token: 'guest-token',
      ...options,
    };
  }

  /**
   * Gateway ile el sıkışmak için Protobuf şemalarını hazırlar
   */
  private async initProtobuf() {
    // [ARCH-COMPLIANCE]: Şemaları contracts paketinden veya tanımlardan alıyoruz
    // Basitlik ve hız için şemayı burada inline tanımlıyoruz (contracts ile birebir aynı)
    const root = protobuf.Root.fromJSON({
      nested: {
        sentiric: {
          nested: {
            stream: {
              nested: {
                v1: {
                  nested: {
                    StreamSessionRequest: {
                      oneofs: { data: { oneof: ["config", "audioChunk", "textMessage"] } },
                      fields: {
                        config: { id: 1, type: "SessionConfig" },
                        audioChunk: { id: 2, type: "bytes" },
                        textMessage: { id: 3, type: "string" }
                      }
                    },
                    SessionConfig: {
                      fields: {
                        token: { id: 1, type: "string" },
                        language: { id: 2, type: "string" },
                        sampleRate: { id: 3, type: "uint32" },
                        edgeMode: { id: 4, type: "bool" }
                      }
                    },
                    StreamSessionResponse: {
                      oneofs: { data: { oneof: ["audioResponse", "textResponse", "statusUpdate"] } },
                      fields: {
                        audioResponse: { id: 1, type: "bytes" },
                        textResponse: { id: 2, type: "string" },
                        statusUpdate: { id: 3, type: "string" }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    this.RequestType = root.lookupType("sentiric.stream.v1.StreamSessionRequest");
    this.ResponseType = root.lookupType("sentiric.stream.v1.StreamSessionResponse");
  }

  public async connect(): Promise<void> {
    await this.initProtobuf();

    return new Promise((resolve, reject) => {
      try {
        console.log(`🌊 Connecting to Sentiric Gateway: ${this.options.gatewayUrl}`);
        this.ws = new WebSocket(this.options.gatewayUrl);
        this.ws.binaryType = 'arraybuffer';

        this.ws.onopen = () => {
          console.log('🔌 WebSocket Connected');
          this.sendSessionConfig();
          this.isReady = true;
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onerror = (err) => {
          if (this.options.onError) this.options.onError(err);
          reject(err);
        };

        this.ws.onclose = () => {
          this.isReady = false;
          if (this.options.onClose) this.options.onClose();
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * [KRİTİK]: Gateway'e ilk "Merhaba" mesajını gönderir.
   */
  private sendSessionConfig() {
    if (!this.ws || !this.RequestType) return;

    const configPayload = {
      config: {
        token: this.options.token,
        language: this.options.language,
        sampleRate: this.options.sampleRate,
        edgeMode: this.options.edgeMode
      }
    };

    const message = this.RequestType.create(configPayload);
    const buffer = this.RequestType.encode(message).finish();
    
    console.log('🛡️ SessionConfig sent. Handshake initiated.');
    this.ws.send(buffer);
  }

  /**
   * Mikrofondan gelen ses parçalarını Gateway'e iletir.
   */
  public sendAudio(chunk: Uint8Array) {
    if (!this.isReady || !this.ws || !this.RequestType) return;

    const audioPayload = { audioChunk: chunk };
    const message = this.RequestType.create(audioPayload);
    const buffer = this.RequestType.encode(message).finish();
    
    this.ws.send(buffer);
  }

  /**
   * Gateway'den gelen ikili veriyi anlamlandırır.
   */
  private handleMessage(data: ArrayBuffer) {
    if (!this.ResponseType) return;

    try {
      const message = this.ResponseType.decode(new Uint8Array(data));
      
      // Eğer gelen veri bir ses yanıtıysa
      if (message.audioResponse && this.options.onAudioReceived) {
        this.options.onAudioReceived(message.audioResponse);
      } 
      // Eğer gelen veri bir metin yanıtıysa
      else if (message.textResponse) {
        console.log('🤖 AI Says:', message.textResponse);
      }
    } catch (e) {
      console.error('❌ Failed to decode Gateway message:', e);
    }
  }

  public disconnect() {
    this.ws?.close();
    this.isReady = false;
  }
}