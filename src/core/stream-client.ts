import protobuf from 'protobufjs';
import { SentiricAudioManager } from './audio-manager';
import { Logger } from '../utils/logger';

export interface StreamClientOptions {
  gatewayUrl: string;
  tenantId: string;
  traceId?: string;
  sessionId?: string;
  token?: string;
  language?: string;
  sampleRate?: number;
  edgeMode?: boolean;
  onAudioReceived?: (chunk: Uint8Array) => void;
  onTranscript?: (data: any) => void;
  onError?: (error: any) => void;
  onClose?: () => void;
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export class SentiricStreamClient {
  private ws: WebSocket | null = null;
  private options: StreamClientOptions;
  private isReady: boolean = false;
  private audioManager: SentiricAudioManager | null = null;
  
  private RequestType: any = null;
  private ResponseType: any = null;

  private isIntentionallyStopped: boolean = false;
  private retryCount: number = 0;
  private readonly maxRetries: number = 5;
  
  public readonly traceId: string;
  public readonly sessionId: string;

  constructor(options: StreamClientOptions) {
    this.traceId = options.traceId || generateUUID();
    this.sessionId = options.sessionId || generateUUID();
    
    this.options = {
      language: 'tr-TR',
      sampleRate: 24000,
      edgeMode: false,
      token: 'guest-token',
      ...options,
    };
    
    Logger.setContext(this.options.tenantId, this.traceId, this.sessionId);
  }

  public async start(): Promise<void> {
    this.isIntentionallyStopped = false;
    this.retryCount = 0;

    await this.initProtobuf();
    
    this.audioManager = new SentiricAudioManager(
      (chunk) => this.sendAudio(chunk), 
      () => this.sendInterruptSignal(), 
      this.options.sampleRate
    );

    await this.connect(true);
    await this.audioManager.startMicrophone();
    
    Logger.info("SESSION_ACTIVE", "Sentiric AI Session started successfully.");
  }

  public injectExternalAudio(pcm16Data: Int16Array, rmsOverride?: number) {
    if (this.audioManager) {
      this.audioManager.injectExternalAudio(pcm16Data, rmsOverride);
    }
  }

  private async initProtobuf() {
    // [CRITICAL FIX]: camelCase eşleşme hatasını önlemek için TAM OLARAK .proto formatı (snake_case) kullanıldı.
    const root = protobuf.Root.fromJSON({
      nested: {
        sentiric: {
          nested: {
            stream: {
              nested: {
                v1: {
                  nested: {
                    StreamSessionRequest: {
                      fields: {
                        config: { id: 1, type: "SessionConfig" },
                        audio_chunk: { id: 2, type: "bytes" },
                        text_message: { id: 3, type: "string" },
                        control: { id: 4, type: "SessionControl" }
                      }
                    },
                    SessionConfig: {
                      fields: {
                        token: { id: 1, type: "string" },
                        language: { id: 2, type: "string" },
                        sample_rate: { id: 3, type: "uint32" },
                        edge_mode: { id: 4, type: "bool" },
                        trace_id: { id: 5, type: "string" },
                        session_id: { id: 6, type: "string" }
                      }
                    },
                    SessionControl: {
                      fields: { event: { id: 1, type: "EventType" } },
                      nested: {
                        EventType: {
                          values: { EVENT_TYPE_UNSPECIFIED: 0, EVENT_TYPE_INTERRUPT: 1, EVENT_TYPE_EOS: 2, EVENT_TYPE_HANGUP: 3 }
                        }
                      }
                    },
                    TranscriptEvent: {
                      fields: {
                        text: { id: 1, type: "string" },
                        is_final: { id: 2, type: "bool" },
                        sender: { id: 3, type: "string" },
                        emotion: { id: 4, type: "string" },
                        gender: { id: 5, type: "string" }
                      }
                    },
                    StreamSessionResponse: {
                      fields: {
                        audio_response: { id: 1, type: "bytes" },
                        text_response: { id: 2, type: "string" },
                        status_update: { id: 3, type: "string" },
                        transcript: { id: 4, type: "TranscriptEvent" },
                        clear_audio_buffer: { id: 5, type: "bool" }
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

  private async connect(isInitial: boolean = false): Promise<void> {
    return new Promise((resolve, reject) => {
      const attempt = () => {
        Logger.info("WS_CONNECTING", `Connecting to gateway...`, { attempt: this.retryCount });
        this.ws = new WebSocket(this.options.gatewayUrl);
        this.ws.binaryType = 'arraybuffer';

        this.ws.onopen = () => {
          Logger.info("WS_CONNECTED", "WebSocket connection established.");
          this.retryCount = 0;
          this.isReady = true;
          this.sendSessionConfig();
          resolve();
        };

        this.ws.onmessage = (event) => this.handleMessage(event.data);

        this.ws.onerror = (err) => {
          Logger.warn("WS_ERROR", "WebSocket encountered an error.");
        };
        
        this.ws.onclose = () => {
          this.isReady = false;
          if (this.isIntentionallyStopped) {
            Logger.info("WS_CLOSED", "Connection closed intentionally.");
            return;
          }
          if (this.retryCount < this.maxRetries) {
            this.retryCount++;
            const backoffMs = Math.min(30000, 1000 * Math.pow(2, this.retryCount - 1));
            Logger.warn("WS_RECONNECTING", `Connection lost. Retrying in ${backoffMs}ms...`, { attempt: this.retryCount });
            setTimeout(attempt, backoffMs);
          } else {
            Logger.error("WS_DISCONNECTED_FATAL", "Max reconnection attempts reached. Session dead.");
            this.audioManager?.stop();
            if (isInitial) reject(new Error("Failed to connect to gateway"));
            if (this.options.onError) this.options.onError(new Error("Connection lost permanently"));
            if (this.options.onClose) this.options.onClose();
          }
        };
      };
      attempt();
    });
  }

  private sendSessionConfig() {
    if (!this.ws || !this.RequestType) return;
    const message = this.RequestType.create({
      config: {
        token: this.options.token,
        language: this.options.language,
        sample_rate: this.options.sampleRate,
        edge_mode: this.options.edgeMode,
        trace_id: this.traceId,
        session_id: this.sessionId
      }
    });
    this.ws.send(this.RequestType.encode(message).finish());
  }

  private sendInterruptSignal() {
    if (!this.isReady || !this.ws || !this.RequestType) return;
    const message = this.RequestType.create({ control: { event: 1 } });
    this.ws.send(this.RequestType.encode(message).finish());
    Logger.info("SIGNAL_SENT", "EVENT_TYPE_INTERRUPT sent to Gateway.");
  }

  private sendAudio(chunk: Uint8Array) {
    if (!this.isReady || !this.ws || !this.RequestType) return;
    const message = this.RequestType.create({ audio_chunk: chunk });
    this.ws.send(this.RequestType.encode(message).finish());
  }

  private handleMessage(data: ArrayBuffer) {
    if (!this.ResponseType) return;
    
    try {
      const message = this.ResponseType.decode(new Uint8Array(data));
      
      if (message.audio_response) {
        if (message.audio_response.length > 0) {
            this.audioManager?.playChunk(message.audio_response);
            if (this.options.onAudioReceived) this.options.onAudioReceived(message.audio_response);
        }
      } 
      else if (message.clear_audio_buffer) {
        this.audioManager?.flushPlayback();
      }
      else if (message.transcript) {
        Logger.info("TRANSCRIPT_RECEIVED", "Received text from AI Pipeline", { text: message.transcript.text });
        if (this.options.onTranscript) this.options.onTranscript(message.transcript);
      }
    } catch (e) {
      // [CRITICAL FALLBACK]: Kütüphane çökse bile sesi çal!
      Logger.warn("WS_DECODE_ERROR", "Protobuf decode failed, attempting manual rescue...", { error: e });
      const arr = new Uint8Array(data);
      // Tag 1 (audio_response) = 0x0A
      if (arr[0] === 0x0A) {
         let offset = 1; let len = 0; let shift = 0;
         while (offset < arr.length) {
             const b = arr[offset++];
             len |= (b & 0x7f) << shift;
             if ((b & 0x80) === 0) break;
             shift += 7;
         }
         const audioData = arr.subarray(offset, offset + len);
         if (audioData.length > 0) this.audioManager?.playChunk(audioData);
      }
    }
  }

  public stop() {
    this.isIntentionallyStopped = true;
    this.isReady = false;
    this.ws?.close();
    this.audioManager?.stop();
    Logger.info("SESSION_STOPPED", "Client manually stopped the session.");
  }
}