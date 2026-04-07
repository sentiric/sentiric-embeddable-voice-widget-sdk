// [ARCH-COMPLIANCE] sentiric-stream-sdk/src/core/stream-client.ts
import {
  StreamSessionRequest,
  StreamSessionResponse,
  TranscriptEvent,
} from "@sentiric/contracts/stream";

import { SentiricAudioManager } from "./audio-manager";
import { Logger } from "../utils/logger";

export interface StreamClientOptions {
  gatewayUrl: string;
  tenantId: string;
  traceId?: string;
  sessionId?: string;
  token?: string;
  language?: string;
  sampleRate?: number;
  edgeMode?: boolean;
  listenOnlyMode?: boolean; // [YENİ]
  speakOnlyMode?: boolean; // [YENİ]
  chatOnlyMode?: boolean; // [YENİ]
  onAudioReceived?: (chunk: Uint8Array) => void;
  onTranscript?: (data: TranscriptEvent) => void;
  onStatusUpdate?: (statusStr: string) => void; // [YENİ EKLENDİ]
  onError?: (error: any) => void;
  onClose?: () => void;
}

function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export class SentiricStreamClient {
  private ws: WebSocket | null = null;
  private options: StreamClientOptions;
  private isReady: boolean = false;
  private audioManager: SentiricAudioManager | null = null;

  public readonly traceId: string;
  public readonly sessionId: string;

  constructor(options: StreamClientOptions) {
    this.traceId = options.traceId || generateUUID();
    this.sessionId = options.sessionId || generateUUID();
    this.options = {
      language: "tr-TR",
      sampleRate: 16000,
      edgeMode: false,
      listenOnlyMode: false, // [YENİ]
      token: "guest-token",
      ...options,
    };
    Logger.setContext(this.options.tenantId, this.traceId, this.sessionId);
  }

  public async start(): Promise<void> {
    this.audioManager = new SentiricAudioManager(
      (c) => this.sendAudio(c),
      () => this.sendInterrupt(),
      () => this.sendEos(), // [YENİ]: EOS Sinyali
      this.options.sampleRate,
    );
    await this.connect();
    await this.audioManager.startMicrophone();
    Logger.info("SESSION_ACTIVE", "AI Session started successfully.");
  }

  private async connect(): Promise<void> {
    return new Promise((resolve) => {
      this.ws = new WebSocket(this.options.gatewayUrl);
      this.ws.binaryType = "arraybuffer";
      this.ws.onopen = () => {
        this.isReady = true;

        const configReq = StreamSessionRequest.fromPartial({
          config: {
            token: this.options.token!,
            language: this.options.language!,
            sampleRate: this.options.sampleRate!,
            edgeMode: this.options.edgeMode!,
            listenOnlyMode: this.options.listenOnlyMode!,
            // [ARCH-COMPLIANCE FIX]: Any cast to prevent TS compilation fail if contracts are not fully synced yet.
            speakOnlyMode: this.options.speakOnlyMode! as any,
            chatOnlyMode: this.options.chatOnlyMode! as any, // [YENİ]
            traceId: this.traceId,
            sessionId: this.sessionId,
          },
        });

        this.ws?.send(StreamSessionRequest.encode(configReq).finish());
        resolve();
      };
      this.ws.onmessage = (e) => this.handleMessage(e.data);
      this.ws.onclose = () => {
        if (this.isReady) setTimeout(() => this.connect(), 2000);
      };
    });
  }

  private sendInterrupt() {
    if (!this.isReady || !this.ws) return;
    const msg = StreamSessionRequest.fromPartial({ control: { event: 1 } });
    this.ws.send(StreamSessionRequest.encode(msg).finish());
  }

  // [YENİ]: Sessizlik Bitiş Sinyali
  private sendEos() {
    if (!this.isReady || !this.ws) return;
    const msg = StreamSessionRequest.fromPartial({ control: { event: 2 } }); // EVENT_TYPE_EOS = 2
    this.ws.send(StreamSessionRequest.encode(msg).finish());
  }

  private sendAudio(chunk: Uint8Array) {
    if (!this.isReady || !this.ws) return;
    const msg = StreamSessionRequest.fromPartial({ audioChunk: chunk });
    this.ws.send(StreamSessionRequest.encode(msg).finish());
  }

  private handleMessage(data: ArrayBuffer) {
    try {
      const message = StreamSessionResponse.decode(new Uint8Array(data));

      if (message.audioResponse && message.audioResponse.length > 0) {
        this.audioManager?.setAiSpeaking(true);
        this.audioManager?.playChunk(message.audioResponse);
        if (this.options.onAudioReceived)
          this.options.onAudioReceived(message.audioResponse);
      } else if (message.transcript) {
        if (message.transcript.sender === "USER") {
          this.audioManager?.setElasticMode(!message.transcript.isFinal);
        }
        if (message.transcript.sender === "AI" && message.transcript.isFinal) {
          this.audioManager?.setAiSpeaking(false);
        }
        if (this.options.onTranscript)
          this.options.onTranscript(message.transcript);
      } else if (message.clearAudioBuffer) {
        this.audioManager?.flushPlayback();
      } else if (message.statusUpdate) {
        // [YENİ EKLENDİ]: Gateway'den gelen Status (Mood Shift vb.) yakalandı!
        if (this.options.onStatusUpdate) {
          this.options.onStatusUpdate(message.statusUpdate);
        }
      }
    } catch (e) {
      Logger.error("WS_DECODE_ERROR", "Protobuf decode failed.", { error: e });
    }
  }

  public stop() {
    this.isReady = false;
    this.ws?.close();
    this.audioManager?.stop();
    Logger.info("SESSION_STOPPED", "User ended session.");
  }

  // [YENİ]: SDK üzerinden metin gönderme yeteneği
  public sendText(text: string) {
    if (!this.isReady || !this.ws) return;
    const msg = StreamSessionRequest.fromPartial({ textMessage: text });
    this.ws.send(StreamSessionRequest.encode(msg).finish());
  }
}
