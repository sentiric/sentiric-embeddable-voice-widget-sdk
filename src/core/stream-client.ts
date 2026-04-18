// File: src/core/stream-client.ts
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
  userId?: string;
  traceId?: string;
  sessionId?: string;
  token?: string;
  language?: string;
  sampleRate?: number;
  edgeMode?: boolean;
  listenOnlyMode?: boolean;
  speakOnlyMode?: boolean;
  chatOnlyMode?: boolean;
  systemPromptId?: string;
  ttsVoiceId?: string;
  onAudioReceived?: (chunk: Uint8Array) => void;
  onTranscript?: (data: TranscriptEvent) => void;
  onStatusUpdate?: (statusStr: string) => void;
  onCognitiveMap?: (data: any) => void;
  onError?: (error: any) => void;
  onClose?: () => void;
}

// [ARCH-COMPLIANCE FIX]: Cryptographically Secure UUID Generation
function generateSecureUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export class SentiricStreamClient {
  private ws: WebSocket | null = null;
  public options: StreamClientOptions;
  private isReady: boolean = false;
  private audioManager: SentiricAudioManager | null = null;
  private qaLog: any[] = [];
  private activeAiText: string = "";

  public readonly traceId: string;
  public readonly sessionId: string;
  public readonly userId: string;

  constructor(options: StreamClientOptions) {
    this.traceId = options.traceId || generateSecureUUID();
    this.sessionId = options.sessionId || generateSecureUUID();

    let storedUserId = localStorage.getItem("sentiric_demo_uid");
    if (!storedUserId) {
      storedUserId = "usr_" + generateSecureUUID().split("-")[0];
      localStorage.setItem("sentiric_demo_uid", storedUserId);
    }
    this.userId = options.userId || storedUserId;

    this.options = {
      language: "tr-TR",
      sampleRate: 16000,
      edgeMode: false,
      listenOnlyMode: false,
      speakOnlyMode: false,
      chatOnlyMode: false,
      token: "guest-token",
      systemPromptId: "PROMPT_SYSTEM_DEFAULT",
      ttsVoiceId: "",
      ...options,
    };
    Logger.setContext(this.options.tenantId, this.traceId, this.sessionId);
  }

  private async connect(): Promise<void> {
    return new Promise((resolve) => {
      const urlWithTrace = `${this.options.gatewayUrl}?trace_id=${this.traceId}`;
      this.ws = new WebSocket(urlWithTrace);
      this.ws.binaryType = "arraybuffer";

      this.ws.onopen = () => {
        this.isReady = true;
        // [ARCH-COMPLIANCE FIX]: ts-proto flattening rules applied (No $case, no data wrapper)
        const configReq = StreamSessionRequest.create({
          config: {
            token: this.options.token!,
            language: this.options.language!,
            sampleRate: this.options.sampleRate!,
            edgeMode: this.options.edgeMode!,
            listenOnlyMode: this.options.listenOnlyMode!,
            speakOnlyMode: this.options.speakOnlyMode!,
            chatOnlyMode: this.options.chatOnlyMode!,
            traceId: this.traceId,
            sessionId: this.sessionId,
            systemPromptId: this.options.systemPromptId!,
            ttsVoiceId: this.options.ttsVoiceId!,
          },
        });
        this.ws?.send(StreamSessionRequest.encode(configReq).finish());
        resolve();
      };

      this.ws.onmessage = (e) => this.handleMessage(e.data);

      this.ws.onclose = () => {
        Logger.warn("WS_CLOSED", "WebSocket connection closed.");
        if (this.isReady) {
          this.audioManager?.flushPlayback();
          setTimeout(() => this.connect(), 2000);
        }
        if (this.options.onClose) this.options.onClose();
      };

      this.ws.onerror = (err) => {
        Logger.error("WS_ERROR", "WebSocket encountered an error.", {
          error: err,
        });
        if (this.options.onError) this.options.onError(err);
      };
    });
  }

  public sendInterrupt() {
    if (!this.isReady || !this.ws) return;
    // EVENT_TYPE_INTERRUPT (1)
    const req = StreamSessionRequest.create({
      control: { event: 1 },
    });
    this.ws.send(StreamSessionRequest.encode(req).finish());
  }

  public sendEos() {
    if (!this.isReady || !this.ws) return;
    // EVENT_TYPE_EOS (2)
    const req = StreamSessionRequest.create({
      control: { event: 2 },
    });
    this.ws.send(StreamSessionRequest.encode(req).finish());
  }

  public sendAudio(chunk: Uint8Array) {
    if (!this.isReady || !this.ws) return;
    const req = StreamSessionRequest.create({
      audioChunk: chunk,
    });
    this.ws.send(StreamSessionRequest.encode(req).finish());
  }

  public sendText(text: string) {
    if (!this.isReady || !this.ws) return;
    const req = StreamSessionRequest.create({
      textMessage: text,
    });
    this.ws.send(StreamSessionRequest.encode(req).finish());
    this.sendEos();
  }

  private handleMessage(data: ArrayBuffer) {
    try {
      const message = StreamSessionResponse.decode(new Uint8Array(data));

      // [ARCH-COMPLIANCE FIX]: ts-proto flattened properties evaluation
      if (message.audioResponse && message.audioResponse.length > 0) {
        this.handleAudioResponse(message.audioResponse);
      } else if (message.transcript) {
        this.handleTranscript(message.transcript);
      } else if (message.cognitiveMap) {
        this.handleCognitiveMap(message.cognitiveMap);
      } else if (message.clearAudioBuffer) {
        this.audioManager?.flushPlayback();
      } else if (message.statusUpdate) {
        if (this.options.onStatusUpdate) {
          this.options.onStatusUpdate(message.statusUpdate);
        }
      }
    } catch (e) {
      Logger.error("WS_DECODE_ERROR", "Protobuf decode failed.", { error: e });
    }
  }

  private handleAudioResponse(audioData: Uint8Array) {
    this.audioManager?.setAiSpeaking(true);
    this.audioManager?.playChunk(audioData);
    if (this.options.onAudioReceived) this.options.onAudioReceived(audioData);
  }

  private handleTranscript(t: TranscriptEvent) {
    const isFinal = t.isFinal;
    const text = t.text;

    if (t.sender === "USER") {
      this.audioManager?.setElasticMode(!isFinal);
      if (isFinal) {
        this.qaLog.push({
          timestamp: new Date().toISOString(),
          speaker: "USER",
          text,
        });
      }
    } else if (t.sender === "AI") {
      this.activeAiText = text;
      if (isFinal) {
        this.audioManager?.setAiSpeaking(false);
        this.qaLog.push({
          timestamp: new Date().toISOString(),
          speaker: "AI",
          text: this.activeAiText,
        });
        this.activeAiText = "";
      }
    }
    if (this.options.onTranscript) this.options.onTranscript(t);
  }

  private handleCognitiveMap(mapData: any) {
    if (this.options.onCognitiveMap) this.options.onCognitiveMap(mapData);
  }

  public stop() {
    this.isReady = false;
    this.ws?.close();
    this.audioManager?.stop();
    Logger.info("SESSION_STOPPED", "User ended session.");
  }

  public async start(): Promise<void> {
    this.audioManager = new SentiricAudioManager(
      (c) => this.sendAudio(c),
      () => this.sendInterrupt(),
      () => this.sendEos(),
      this.options.sampleRate,
    );
    await this.connect();

    if (!this.options.chatOnlyMode && !this.options.speakOnlyMode) {
      await this.audioManager.startMicrophone();
    }
    Logger.info("SESSION_ACTIVE", "AI Session started successfully.");
  }
}
