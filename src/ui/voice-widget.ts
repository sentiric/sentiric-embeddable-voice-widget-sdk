// File: src/ui/voice-widget.ts
import { SentiricStreamClient } from "../core/stream-client";
import htmlTemplate from "./voice-widget.html?raw";
import cssTemplate from "./voice-widget.css?inline";
import { TranscriptEvent } from "@sentiric/contracts/stream";

export class SentiricVoiceWidget extends HTMLElement {
  private client: SentiricStreamClient | null = null;
  private isActive: boolean = false;
  private shadow: ShadowRoot;
  private devModeActive: boolean = false;
  private isListenOnly: boolean = false;

  private liquidBar: HTMLElement | null = null;
  private activeSpeakerEl: HTMLElement | null = null;
  private activeTextEl: HTMLElement | null = null;
  private metricsDataEl: HTMLElement | null = null;

  private lockedSpeakerId: string | null = null;
  private colors = [
    "#3B82F6",
    "#10B981",
    "#F59E0B",
    "#EF4444",
    "#8B5CF6",
    "#EC4899",
    "#06B6D4",
  ];
  private speakerMap: Record<string, { name: string; color: string }> = {};

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
  }

  static get observedAttributes() {
    return [
      "tenant-id",
      "gateway-url",
      "language",
      "theme-color",
      "listen-only",
    ];
  }

  connectedCallback() {
    this.initUI();
  }

  private initUI() {
    const themeColor = this.getAttribute("theme-color") || "#3b82f6";
    this.isListenOnly =
      this.hasAttribute("listen-only") &&
      this.getAttribute("listen-only") !== "false";

    this.shadow.innerHTML = `
      <style>${cssTemplate.replace("--theme-color: #3b82f6;", `--theme-color: ${themeColor};`)}</style>
      ${htmlTemplate}
    `;

    this.liquidBar = this.shadow.querySelector("#liquidBar");
    this.activeSpeakerEl = this.shadow.querySelector("#activeSpeaker");
    this.activeTextEl = this.shadow.querySelector("#activeText");
    this.metricsDataEl = this.shadow.querySelector("#metricsData");

    setTimeout(() => this.liquidBar?.classList.add("visible"), 100);

    const btn = this.shadow.querySelector("#actionBtn");
    btn?.addEventListener("click", () => this.toggleConversation());

    btn?.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      this.devModeActive = !this.devModeActive;
      this.shadow
        .querySelector(".metrics-box")
        ?.classList.toggle("visible", this.devModeActive);
    });
  }

  private async toggleConversation() {
    if (this.isActive) this.stop();
    else await this.start();
  }

  private async start() {
    const gatewayUrl = this.getAttribute("gateway-url") || "";
    const tenantId = this.getAttribute("tenant-id") || "";
    if (!gatewayUrl || !tenantId) return;

    if (this.activeTextEl) this.activeTextEl.innerText = "Bağlanıyor...";

    this.client = new SentiricStreamClient({
      gatewayUrl,
      tenantId,
      language: this.getAttribute("language") || "tr-TR",
      listenOnlyMode: this.isListenOnly,
      onClose: () => this.stop(),
      onError: () => this.stop(),
      onTranscript: (data) => this.handleTranscript(data),
      onStatusUpdate: (statusStr) => this.handleStatusUpdate(statusStr),
    });

    this.isActive = true;
    this.updateUI();

    try {
      await this.client.start();
      if (this.activeTextEl) this.activeTextEl.innerText = "Sizi dinliyor...";
    } catch {
      if (this.activeTextEl) this.activeTextEl.innerText = "Bağlantı hatası.";
      this.stop();
    }
  }

  private stop() {
    this.isActive = false;
    this.client?.stop();
    this.updateUI();
    this.lockedSpeakerId = null;

    if (this.activeTextEl) this.activeTextEl.innerText = "Bağlantı kesildi.";
    if (this.activeSpeakerEl) {
      this.activeSpeakerEl.innerText = "SİSTEM";
      this.activeSpeakerEl.style.color = "var(--theme-color)";
    }

    setTimeout(() => {
      if (!this.isActive && this.activeTextEl) {
        this.activeTextEl.innerText = "Başlamak için mikrofona dokunun.";
      }
    }, 2000);
  }

  private getSpeakerInfo(speakerId: string) {
    if (!speakerId || speakerId === "?" || speakerId === "AI")
      return { name: "Bilinmeyen", color: "#64748b" };

    if (!this.speakerMap[speakerId]) {
      const idx = Object.keys(this.speakerMap).length;
      const letter = String.fromCharCode(65 + idx);
      this.speakerMap[speakerId] = {
        name: `KİŞİ ${letter}`,
        color: this.colors[idx % this.colors.length],
      };
    }
    return this.speakerMap[speakerId];
  }

  // [ARCH-COMPLIANCE FIX]: Strict Typing for TranscriptEvent
  private handleTranscript(data: TranscriptEvent) {
    if (!this.activeTextEl || !this.activeSpeakerEl) return;

    const isUser = data.sender === "USER";
    const isFinal = data.isFinal;
    const rawSpeakerId = data.speakerId || "?";

    if (!this.lockedSpeakerId) {
      this.lockedSpeakerId = rawSpeakerId;
    }

    const displaySpeakerId = isUser ? this.lockedSpeakerId || "?" : "AI";
    const spkInfo = this.getSpeakerInfo(displaySpeakerId);

    this.activeSpeakerEl.innerText = isUser ? spkInfo.name : "🤖 YAPAY ZEKA";
    this.activeSpeakerEl.style.color = isUser
      ? spkInfo.color
      : "var(--theme-color)";

    this.activeTextEl.innerText = data.text || "...";

    if (isUser) {
      this.activeTextEl.className = isFinal
        ? "subtitle-text"
        : "subtitle-text partial";
    } else {
      this.activeTextEl.className = isFinal
        ? "subtitle-text"
        : "subtitle-text ai-typing";
    }

    if (this.devModeActive && this.metricsDataEl) {
      const v = data.speakerVec || [];
      this.metricsDataEl.innerHTML = `
         <b>Mode:</b> ${isUser ? "Listening" : "Synthesizing"}<br>
         <b>Spk ID:</b> ${this.lockedSpeakerId} (Raw: ${rawSpeakerId})<br>
         <b>Emotion:</b> ${data.emotion || "neutral"} <br>
         <b>Arousal:</b> ${data.arousal?.toFixed(2)}<br>
         <b>Valence:</b> ${data.valence?.toFixed(2)}<br>
         <b>Vec[0]:</b> ${v[0]?.toFixed(2)}<br>
         <b>Vec[1]:</b> ${v[1]?.toFixed(2)}
      `;
    }

    if (isFinal) {
      this.lockedSpeakerId = null;

      if (!isUser) {
        const currentText = this.activeTextEl.innerText;
        setTimeout(() => {
          if (
            !this.lockedSpeakerId &&
            this.activeTextEl?.innerText === currentText
          ) {
            this.activeTextEl.innerText = "Sizi dinliyor...";
            this.activeTextEl.className = "subtitle-text partial";
            if (this.activeSpeakerEl) {
              this.activeSpeakerEl.innerText = "SİSTEM";
              this.activeSpeakerEl.style.color = "var(--theme-color)";
            }
          }
        }, 2000);
      }
    }
  }

  private handleStatusUpdate(statusStr: string) {
    try {
      const status = JSON.parse(statusStr);
      if (status.type === "MOOD_SHIFT" && this.liquidBar) {
        let glowColor = "transparent";
        if (status.new_mood === "angry") glowColor = "#ef4444";
        else if (status.new_mood === "excited") glowColor = "#f59e0b";
        else if (status.new_mood === "sad") glowColor = "#3b82f6";

        this.liquidBar.style.setProperty("--glow-color", glowColor);

        if (this.activeTextEl) {
          this.activeTextEl.innerText = `[Bilişsel Anomali: ${status.new_mood.toUpperCase()}]`;
          this.activeTextEl.className = "subtitle-text partial";
        }

        setTimeout(() => {
          if (this.liquidBar)
            this.liquidBar.style.setProperty("--glow-color", "transparent");
        }, 5000);
      }
    } catch {
      // Ignore JSON parse errors
    }
  }

  private updateUI() {
    const btn = this.shadow.querySelector("#actionBtn") as HTMLElement;
    if (btn) {
      btn.classList.toggle("active", this.isActive);

      if (this.isActive && this.isListenOnly) {
        btn.innerHTML = "<span>👁️</span>";
      } else {
        btn.innerHTML = this.isActive ? "<span>✕</span>" : "<span>🎤</span>";
      }
    }
  }
}

if (!customElements.get("sentiric-voice-widget")) {
  customElements.define("sentiric-voice-widget", SentiricVoiceWidget);
}
