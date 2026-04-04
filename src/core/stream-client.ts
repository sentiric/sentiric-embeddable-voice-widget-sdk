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

const PROTO_DEF = `
syntax = "proto3";
package sentiric.stream.v1;
message StreamSessionRequest {
  oneof data { SessionConfig config = 1; bytes audio_chunk = 2; string text_message = 3; SessionControl control = 4; }
}
message StreamSessionResponse {
  oneof data { bytes audio_response = 1; string text_response = 2; string status_update = 3; TranscriptEvent transcript = 4; bool clear_audio_buffer = 5; }
}
message TranscriptEvent { string text = 1; bool is_final = 2; string sender = 3; string emotion = 4; string gender = 5; }
message SessionConfig { string token = 1; string language = 2; uint32 sample_rate = 3; bool edge_mode = 4; string trace_id = 5; string session_id = 6; }
message SessionControl { enum EventType { EVENT_TYPE_UNSPECIFIED = 0; EVENT_TYPE_INTERRUPT = 1; EVENT_TYPE_EOS = 2; EVENT_TYPE_HANGUP = 3; } EventType event = 1; }
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
    this.traceId = options.traceId || Math.random().toString(36).substring(7);
    this.sessionId = options.sessionId || Math.random().toString(36).substring(7);
    this.options = { language: 'tr-TR', sampleRate: 24000, edgeMode: false, token: 'guest-token', ...options };
    Logger.setContext(this.options.tenantId, this.traceId, this.sessionId);
  }

  public async start(): Promise<void> {
    this.isIntentionallyStopped = false;
    const root = protobuf.parse(PROTO_DEF).root;
    this.RequestType = root.lookupType("sentiric.stream.v1.StreamSessionRequest");
    this.ResponseType = root.lookupType("sentiric.stream.v1.StreamSessionResponse");
    this.audioManager = new SentiricAudioManager((c) => this.sendAudio(c), () => this.sendInterrupt(), this.options.sampleRate);
    await this.connect();
    await this.audioManager.startMicrophone();
    Logger.info("SESSION_ACTIVE", "AI Session started.");
  }

  private async connect(): Promise<void> {
    return new Promise((resolve) => {
      this.ws = new WebSocket(this.options.gatewayUrl);
      this.ws.binaryType = 'arraybuffer';
      this.ws.onopen = () => { 
        this.isReady = true; 
        const msg = this.RequestType.create({ config: { token: this.options.token, language: this.options.language, sampleRate: this.options.sampleRate, edgeMode: this.options.edgeMode, traceId: this.traceId, sessionId: this.sessionId }});
        this.ws?.send(this.RequestType.encode(msg).finish());
        resolve(); 
      };
      this.ws.onmessage = (e) => this.handleMessage(e.data);
      this.ws.onclose = () => { if (!this.isIntentionallyStopped) setTimeout(() => this.connect(), 2000); };
    });
  }

  private sendInterrupt() {
    if (!this.isReady || !this.ws) return;
    const msg = this.RequestType.create({ control: { event: 1 } });
    this.ws.send(this.RequestType.encode(msg).finish());
  }

  private sendAudio(chunk: Uint8Array) {
    if (!this.isReady || !this.ws) return;
    const msg = this.RequestType.create({ audioChunk: chunk });
    this.ws.send(this.RequestType.encode(msg).finish());
  }

  private handleMessage(data: ArrayBuffer) {
    try {
      // [CRITICAL FIX]: RangeError'ı önlemek için buffer'ı kopyalıyoruz
      const buf = new Uint8Array(data.slice(0));
      const message = this.ResponseType.decode(buf);
      
      // [CRITICAL FIX]: toObject kullanarak isim çakışmalarını (snake vs camel) eziyoruz.
      const obj = this.ResponseType.toObject(message, { bytes: Uint8Array });

      if (obj.audioResponse) {
        this.audioManager?.playChunk(obj.audioResponse);
      } else if (obj.clearAudioBuffer) {
        this.audioManager?.flushPlayback();
      } else if (obj.transcript) {
        Logger.info("TRANSCRIPT_RECEIVED", `[${obj.transcript.sender}] ${obj.transcript.text}`);
        if (this.options.onTranscript) this.options.onTranscript(obj.transcript);
      }
    } catch (e) {
      Logger.error("WS_DECODE_ERROR", "Decode failed", { error: e });
    }
  }

  public stop() {
    this.isIntentionallyStopped = true;
    this.ws?.close();
    this.audioManager?.stop();
  }
}