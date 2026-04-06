// Dosya: src/ui/voice-widget.ts (İçeriği Değiştirin)
import { SentiricStreamClient } from "../core/stream-client";
import htmlTemplate from "./voice-widget.html?raw";
import cssTemplate from "./voice-widget.css?inline";

export class SentiricVoiceWidget extends HTMLElement {
  private client: SentiricStreamClient | null = null;
  private isActive: boolean = false;
  private shadow: ShadowRoot;
  private transcriptBox: HTMLElement | null = null;
  private devModeActive: boolean = false;
  private isListenOnly: boolean = false; // [YENİ]

  // [YENİ] Diarization Renk Haritası
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

    this.transcriptBox = this.shadow.querySelector("#transcriptBox");

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

    if (this.transcriptBox) {
      this.transcriptBox.innerHTML = "";
      this.transcriptBox.classList.add("visible");
    }

    this.client = new SentiricStreamClient({
      gatewayUrl,
      tenantId,
      language: this.getAttribute("language") || "tr-TR",
      listenOnlyMode: this.isListenOnly, // [YENİ] Modu arka uca gönder
      onClose: () => this.stop(),
      onError: () => this.stop(),
      onTranscript: (data) => this.handleTranscript(data),
    });

    this.isActive = true;
    this.updateUI();
    await this.client.start();
  }

  private stop() {
    this.isActive = false;
    this.client?.stop();
    this.updateUI();
    this.transcriptBox?.classList.remove("visible");
    this.speakerMap = {}; // Reset speakers
  }

  // [YENİ] Dinamik Konuşmacı Bilgisi Üretici
  private getSpeakerInfo(speakerId: string, gender: string) {
    if (!speakerId || speakerId === "?")
      return { name: "Bilinmeyen", color: "#64748b" };
    if (!this.speakerMap[speakerId]) {
      const idx = Object.keys(this.speakerMap).length;
      const letter = String.fromCharCode(65 + idx);
      this.speakerMap[speakerId] = {
        name: `Kişi ${letter}`,
        color: this.colors[idx % this.colors.length],
      };
    }
    return this.speakerMap[speakerId];
  }

  private getAvatarHtml(
    sender: string,
    gender: string,
    emotion: string,
    color: string,
  ): string {
    if (sender === "AI")
      return `<div class="avatar ai-avatar" style="border-color:${color}">🤖</div>`;
    let face =
      gender === "M" || gender === "m"
        ? "👨"
        : gender === "F" || gender === "f"
          ? "👩"
          : "👤";
    let emo = "";
    if (emotion === "excited" || emotion === "happy")
      emo = '<div class="emo-badge">🔥</div>';
    else if (emotion === "angry") emo = '<div class="emo-badge">😠</div>';
    else if (emotion === "sad") emo = '<div class="emo-badge">😢</div>';
    return `<div class="avatar user-avatar" style="border-color:${color}; color:${color}">${face}${emo}</div>`;
  }

  private handleTranscript(data: any) {
    if (!this.transcriptBox) return;
    const isUser = data.sender === "USER";
    const activeMsgId = `msg-${isUser ? "user" : "ai"}-active`;

    // [YENİ] Zengin Veriyi Çıkar
    const emotion = data.emotion || "neutral";
    const gender = data.gender || "?";
    const speakerId = data.speakerId || data.speaker_id || "?";
    const spkInfo = this.getSpeakerInfo(speakerId, gender);

    let rowEl = this.transcriptBox.querySelector(
      `#${activeMsgId}`,
    ) as HTMLElement | null;

    if (!rowEl) {
      rowEl = document.createElement("div");
      rowEl.id = activeMsgId;
      rowEl.className = `message-row ${isUser ? "user" : "ai"}`;

      const avatar = this.getAvatarHtml(
        data.sender,
        gender,
        emotion,
        spkInfo.color,
      );
      const nameTag = isUser
        ? `<div style="font-size:10px; color:${spkInfo.color}; font-weight:bold; margin-bottom:2px; margin-left:14px">${spkInfo.name}</div>`
        : "";
      const borderColor = isUser
        ? `border-left: 3px solid ${spkInfo.color};`
        : "";

      rowEl.innerHTML = `
        ${!isUser ? avatar : ""}
        <div style="display:flex; flex-direction:column; flex:1">
            ${nameTag}
            <div class="message ${isUser ? "user" : "ai"} partial" style="${borderColor}"></div>
        </div>
        ${isUser ? avatar : ""}
      `;
      this.transcriptBox.appendChild(rowEl);
    }

    const msgEl = rowEl.querySelector(".message") as HTMLElement;
    if (msgEl) msgEl.innerText = data.text || data.text_chunk || "";

    const isFinal = data.isFinal || data.is_final;
    if (isFinal) {
      rowEl.removeAttribute("id");
      msgEl.classList.remove("partial");

      if (this.devModeActive) {
        this.shadow.querySelector("#metricsData")!.innerHTML =
          `<b>Spk ID:</b> ${speakerId}<br>
           <b>Cinsiyet:</b> ${gender}<br>
           <b>Duygu:</b> ${emotion} <br>
           <b>Arousal:</b> ${data.arousal?.toFixed(2)}<br>
           <b>Valence:</b> ${data.valence?.toFixed(2)}`;
      }
    }
    this.transcriptBox.scrollTo({
      top: this.transcriptBox.scrollHeight,
      behavior: "smooth",
    });
  }

  private updateUI() {
    const btn = this.shadow.querySelector("#actionBtn") as HTMLElement;
    btn.classList.toggle("active", this.isActive);

    // Gözlemci Modu ise İkonu değiştir
    if (this.isActive && this.isListenOnly) {
      btn.innerHTML = "<span>👁️</span>";
    } else {
      btn.innerHTML = this.isActive ? "<span>✕</span>" : "<span>🎤</span>";
    }
  }
}

if (!customElements.get("sentiric-voice-widget")) {
  customElements.define("sentiric-voice-widget", SentiricVoiceWidget);
}
