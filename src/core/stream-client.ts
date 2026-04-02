// File: src/core/stream-client.ts

import protobuf from 'protobufjs';
import { SentiricAudioManager } from './audio-manager';
import { Logger } from '../utils/logger';

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
    Logger.setTenant(this.options.tenantId);
  }

  public async start(): Promise<void> {
    await this.initProtobuf();
    
    // Mikrofonu ve ses menajerini hazırla
    this.audioManager = new SentiricAudioManager(
      (chunk) => this.sendAudio(chunk), 
      () => this.sendInterruptSignal(), // VAD söz kesmeyi algıladığında tetiklenir
      this.options.sampleRate
    );

    await this.connect();
    await this.audioManager.startMicrophone();
    
    Logger.info("SESSION_ACTIVE", "Sentiric AI Session started successfully.");
  }

  /**
   * Dışarıdan ses basmak (Mobil WebView / React Native / Flutter Bridge için)
   */
  public injectExternalAudio(pcm16Data: Int16Array, rmsOverride?: number) {
    if (this.audioManager) {
      this.audioManager.injectExternalAudio(pcm16Data, rmsOverride);
    }
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
                      oneofs: { data: { oneof: ["config", "audioChunk", "textMessage", "control"] } },
                      fields: {
                        config: { id: 1, type: "SessionConfig" },
                        audioChunk: { id: 2, type: "bytes" },
                        textMessage: { id: 3, type: "string" },
                        control: { id: 4, type: "SessionControl" }
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
                    SessionControl: {
                      fields: {
                        event: { id: 1, type: "EventType" }
                      },
                      nested: {
                        EventType: {
                          values: {
                            EVENT_TYPE_UNSPECIFIED: 0,
                            EVENT_TYPE_INTERRUPT: 1,
                            EVENT_TYPE_EOS: 2,
                            EVENT_TYPE_HANGUP: 3
                          }
                        }
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
        Logger.info("WS_CONNECTING", `Connecting to ${this.options.gatewayUrl}`);

        this.ws = new WebSocket(this.options.gatewayUrl);
        this.ws.binaryType = 'arraybuffer';

        this.ws.onopen = () => {
          Logger.info("WS_CONNECTED", "WebSocket connection established.");
          this.sendSessionConfig();
          this.isReady = true;
          resolve();
        };

        this.ws.onmessage = (event) => this.handleMessage(event.data);
        
        this.ws.onerror = (err) => {
          Logger.error("WS_ERROR", "WebSocket error occurred", { error: err });
          reject(err);
        };
        
        this.ws.onclose = () => {
          Logger.warn("WS_CLOSED", "WebSocket connection closed.");
          this.isReady = false;
          this.audioManager?.stop();
          if (this.options.onClose) this.options.onClose();
        };
      } catch (err) {
        Logger.error("WS_INIT_FAIL", "Failed to initialize WebSocket", { error: err });
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

  /**
   * Sunucuya donanımsal söz kesme (Barge-in) sinyali atar.
   */
  private sendInterruptSignal() {
    if (!this.isReady || !this.ws || !this.RequestType) return;
    const controlPayload = {
      control: {
        event: 1 // EVENT_TYPE_INTERRUPT
      }
    };
    const message = this.RequestType.create(controlPayload);
    const buffer = this.RequestType.encode(message).finish();
    this.ws.send(buffer);
    Logger.info("SIGNAL_SENT", "EVENT_TYPE_INTERRUPT sent to Gateway.");
  }

  private sendAudio(chunk: Uint8Array) {
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
      
      if (message.audioResponse) {
        this.audioManager?.playChunk(message.audioResponse);
        if (this.options.onAudioReceived) this.options.onAudioReceived(message.audioResponse);
      } 
      else if (message.textResponse) {
        console.log('🤖 AI:', message.textResponse);
      }
    } catch (e) {
      Logger.error("WS_DECODE_ERROR", "Failed to decode incoming Protobuf message", { error: e });
    }
  }

  public stop() {
    this.ws?.close();
    this.audioManager?.stop();
    this.isReady = false;
  }
}