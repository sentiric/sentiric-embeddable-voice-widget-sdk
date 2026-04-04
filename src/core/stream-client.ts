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

const PROTO_DEF = `
syntax = "proto3";
package sentiric.stream.v1;

message StreamSessionRequest {
  oneof data {
    SessionConfig config = 1;
    bytes audio_chunk = 2;
    string text_message = 3;
    SessionControl control = 4;
  }
}

message StreamSessionResponse {
  oneof data {
    bytes audio_response = 1;
    string text_response = 2;
    string status_update = 3;
    TranscriptEvent transcript = 4;
    bool clear_audio_buffer = 5;
  }
}

message TranscriptEvent {
  string text = 1;
  bool is_final = 2;
  string sender = 3;
  string emotion = 4;
  string gender = 5;
}

message SessionConfig {
  string token = 1;
  string language = 2;
  uint32 sample_rate = 3;
  bool edge_mode = 4;
  string trace_id = 5;
  string session_id = 6;
}

message SessionControl {
  enum EventType {
    EVENT_TYPE_UNSPECIFIED = 0;
    EVENT_TYPE_INTERRUPT = 1;
    EVENT_TYPE_EOS = 2;
    EVENT_TYPE_HANGUP = 3;
  }
  EventType event = 1;
}
`;

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
    const root = protobuf.parse(PROTO_DEF).root;
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
    // JS Objelerini Protobuf için güvenli camelCase olarak gönderiyoruz
    const message = this.RequestType.create({
      config: {
        token: this.options.token,
        language: this.options.language,
        sampleRate: this.options.sampleRate,
        edgeMode: this.options.edgeMode,
        traceId: this.traceId,
        sessionId: this.sessionId
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
    const message = this.RequestType.create({ audioChunk: chunk });
    this.ws.send(this.RequestType.encode(message).finish());
  }

  private handleMessage(data: ArrayBuffer) {
    if (!this.ResponseType) return;
    
    try {
      const decoded = this.ResponseType.decode(new Uint8Array(data));
      
      // [CRITICAL FIX]: protobufjs snake_case key'leri camelCase'e çeviriyor.
      // Emniyet kemeri takıyoruz ve iki ihtimali de kontrol ediyoruz.
      const audioData = decoded.audioResponse || decoded.audio_response;
      const clearBuffer = decoded.clearAudioBuffer || decoded.clear_audio_buffer;
      const transcriptEvent = decoded.transcript;

      if (audioData) {
        // Garantili bir Uint8Array view çıkarıyoruz
        const chunk = new Uint8Array(audioData);
        if (chunk.length > 0) {
            this.audioManager?.playChunk(chunk);
            if (this.options.onAudioReceived) this.options.onAudioReceived(chunk);
        }
      } 
      else if (clearBuffer) {
        this.audioManager?.flushPlayback();
      }
      else if (transcriptEvent) {
        Logger.info("TRANSCRIPT_RECEIVED", `[${transcriptEvent.sender}] ${transcriptEvent.text}`);
        if (this.options.onTranscript) this.options.onTranscript(transcriptEvent);
      }
    } catch (e) {
      Logger.error("WS_DECODE_ERROR", "Protobuf decode failed.", { error: e });
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