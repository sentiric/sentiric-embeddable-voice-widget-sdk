import protobuf from 'protobufjs';
import { SentiricAudioManager } from './audio-manager';

export interface StreamClientOptions {
  gatewayUrl: string;
  tenantId: string;
  token?: string;
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
  private audioManager: SentiricAudioManager | null = null;
  
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
   * AI Asistanı Başlatır: Bağlantı kurar ve mikrofonu açar.
   */
  public async start(): Promise<void> {
    await this.initProtobuf();
    
    // Mikrofonu ve ses menajerini hazırla
    this.audioManager = new SentiricAudioManager(
      (chunk) => this.sendAudio(chunk), // Mikrofondan gelen sesi Gateway'e yolla
      this.options.sampleRate
    );

    await this.connect();
    await this.audioManager.startMicrophone();
    
    console.log('🚀 Sentiric AI Session Active.');
  }

  private async initProtobuf() {
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

  private async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.options.gatewayUrl);
        this.ws.binaryType = 'arraybuffer';

        this.ws.onopen = () => {
          this.sendSessionConfig();
          this.isReady = true;
          resolve();
        };

        this.ws.onmessage = (event) => this.handleMessage(event.data);
        this.ws.onerror = (err) => reject(err);
        this.ws.onclose = () => {
          this.isReady = false;
          this.audioManager?.stop();
        };
      } catch (err) {
        reject(err);
      }
    });
  }

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
    this.ws.send(buffer);
  }

  public sendAudio(chunk: Uint8Array) {
    if (!this.isReady || !this.ws || !this.RequestType) return;
    const audioPayload = { audioChunk: chunk };
    const message = this.RequestType.create(audioPayload);
    const buffer = this.RequestType.encode(message).finish();
    this.ws.send(buffer);
  }

  private handleMessage(data: ArrayBuffer) {
    if (!this.ResponseType) return;
    try {
      const message = this.ResponseType.decode(new Uint8Array(data));
      
      // Gateway'den ses geldiğinde çal
      if (message.audioResponse) {
        this.audioManager?.playChunk(message.audioResponse);
        if (this.options.onAudioReceived) this.options.onAudioReceived(message.audioResponse);
      } 
      else if (message.textResponse) {
        console.log('🤖 AI:', message.textResponse);
      }
    } catch (e) {
      console.error('❌ Decode error:', e);
    }
  }

  public stop() {
    this.ws?.close();
    this.audioManager?.stop();
    this.isReady = false;
  }
}