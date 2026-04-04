import { SentiricStreamClient } from "../core/stream-client";

// Vite magic: Dış dosyaları string olarak içeri alıyoruz
import htmlTemplate from "./voice-widget.html?raw";
import cssTemplate from "./voice-widget.css?inline";

export class SentiricVoiceWidget extends HTMLElement {
  private client: SentiricStreamClient | null = null;
  private isActive: boolean = false;
  private shadow: ShadowRoot;
  private transcriptBox: HTMLElement | null = null;
  private devModeActive: boolean = false;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
  }

  static get observedAttributes() {
    return ["tenant-id", "gateway-url", "language", "theme-color"];
  }

  connectedCallback() {
    this.initUI();
  }

  private initUI() {
    const themeColor = this.getAttribute("theme-color") || "#3b82f6";

    // HTML ve CSS'i dış dosyalardan birleştiriyoruz
    this.shadow.innerHTML = `
      <style>${cssTemplate.replace("--theme-color: #3b82f6;", `--theme-color: ${themeColor};`)}</style>
      ${htmlTemplate}
    `;

    this.transcriptBox = this.shadow.querySelector("#transcriptBox");

    const btn = this.shadow.querySelector("#actionBtn");
    btn?.addEventListener("click", () => this.toggleConversation());

    // Sağ Tık -> Dev Mode
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
  }

  private getAvatarHtml(
    sender: string,
    gender: string,
    emotion: string,
  ): string {
    if (sender === "AI") return `<div class="avatar ai-avatar">🤖</div>`;
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
    return `<div class="avatar user-avatar">${face}${emo}</div>`;
  }

  private handleTranscript(data: any) {
    if (!this.transcriptBox) return;
    const isUser = data.sender === "USER";
    const activeMsgId = `msg-${isUser ? "user" : "ai"}-active`;

    let rowEl = this.transcriptBox.querySelector(
      `#${activeMsgId}`,
    ) as HTMLElement | null;
    if (!rowEl) {
      rowEl = document.createElement("div");
      rowEl.id = activeMsgId;
      rowEl.className = `message-row ${isUser ? "user" : "ai"}`;
      const avatar = this.getAvatarHtml(data.sender, data.gender, data.emotion);
      rowEl.innerHTML = `${!isUser ? avatar : ""}<div class="message ${isUser ? "user" : "ai"} partial"></div>${isUser ? avatar : ""}`;
      this.transcriptBox.appendChild(rowEl);
    }

    const msgEl = rowEl.querySelector(".message") as HTMLElement;
    if (msgEl) msgEl.innerText = data.text;

    const isFinal = data.isFinal || data.is_final;
    if (isFinal) {
      rowEl.removeAttribute("id");
      msgEl.classList.remove("partial");
      if (this.devModeActive) {
        this.shadow.querySelector("#metricsData")!.innerHTML =
          `<b>Last Turn:</b> ${new Date().toLocaleTimeString()}<br><b>Sender:</b> ${data.sender}<br><b>Duygu:</b> ${data.emotion || "nötr"}<br><b>Cinsiyet:</b> ${data.gender || "?"}`;
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
    btn.innerHTML = this.isActive ? "<span>✕</span>" : "<span>🎤</span>";
  }
}

if (!customElements.get("sentiric-voice-widget")) {
  customElements.define("sentiric-voice-widget", SentiricVoiceWidget);
}
