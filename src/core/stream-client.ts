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
  private qaLog: any[] = []; // QA Analizleri için Kara Kutu

  public readonly traceId: string;
  public readonly sessionId: string;

  constructor(options: StreamClientOptions) {
    this.traceId = options.traceId || generateUUID();
    this.sessionId = options.sessionId || generateUUID();
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

        const configReq = StreamSessionRequest.fromPartial({
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
            systemPromptId: this.options.systemPromptId,
            ttsVoiceId: this.options.ttsVoiceId,
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

  private sendEos() {
    if (!this.isReady || !this.ws) return;
    const msg = StreamSessionRequest.fromPartial({ control: { event: 2 } });
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

        // QA RECORDER
        if (
          message.transcript.isFinal ||
          (message.transcript as any).is_final
        ) {
          this.qaLog.push({
            timestamp: new Date().toISOString(),
            speaker: message.transcript.sender,
            speaker_id:
              message.transcript.speakerId ||
              (message.transcript as any).speaker_id ||
              "?",
            emotion: message.transcript.emotion || "neutral",
            text:
              message.transcript.text ||
              (message.transcript as any).text_chunk ||
              "",
          });
        }

        // [ARCH-COMPLIANCE FIX]: UI Callback hatalarını Protobuf hatasından izole et.
        try {
          if (this.options.onTranscript)
            this.options.onTranscript(message.transcript);
        } catch (cbErr) {
          Logger.error("UI_RENDER_ERROR", "Error inside UI callback", {
            error: cbErr,
          });
        }
      } else if (message.clearAudioBuffer) {
        this.audioManager?.flushPlayback();
      } else if (message.statusUpdate) {
        try {
          if (this.options.onStatusUpdate)
            this.options.onStatusUpdate(message.statusUpdate);
        } catch (cbErr) {}
      }
    } catch (e) {
      // Bu sadece GERÇEK Protobuf parse hatalarında tetiklenecek.
      Logger.error("WS_DECODE_ERROR", "Protobuf decode failed.", { error: e });
    }
  }

  public stop() {
    this.isReady = false;
    this.ws?.close();
    this.audioManager?.stop();
    Logger.info("SESSION_STOPPED", "User ended session.");

    // QA ANALİZ ÇIKTISI
    console.log("\n==================================================");
    console.log("🧠 QA TEST REPORT (KOPYALAYIP AI'A GÖNDERİN):");
    console.log(JSON.stringify(this.qaLog, null, 2));
    console.log("==================================================\n");
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

  public sendText(text: string) {
    if (!this.isReady || !this.ws) return;
    const msg = StreamSessionRequest.fromPartial({ textMessage: text });
    this.ws.send(StreamSessionRequest.encode(msg).finish());

    // [CRITICAL FIX]: Metin gönderildikten hemen sonra cümlenin bittiğini (EOS) bildir.
    // Bu sayede Dialog Service beklemeyi bırakıp LLM'i anında tetikler!
    const eosMsg = StreamSessionRequest.fromPartial({ control: { event: 2 } });
    this.ws.send(StreamSessionRequest.encode(eosMsg).finish());
  }
}
