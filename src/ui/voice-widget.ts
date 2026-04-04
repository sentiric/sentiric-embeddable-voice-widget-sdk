// [ARCH-COMPLIANCE] stream-sdk/src/ui/voice-widget.ts
import { SentiricStreamClient } from '../core/stream-client';

export class SentiricVoiceWidget extends HTMLElement {
  private client: SentiricStreamClient | null = null;
  private isActive: boolean = false;
  private shadow: ShadowRoot;
  private transcriptBox: HTMLElement | null = null;
  private devModeActive: boolean = false;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
  }

  static get observedAttributes() { return ['tenant-id', 'gateway-url', 'language', 'theme-color']; }

  connectedCallback() {
    this.render();
    this.transcriptBox = this.shadow.querySelector('#transcriptBox');
    
    // Sağ Tık -> Dev Mode Toggle
    const btn = this.shadow.querySelector('.main-button');
    btn?.addEventListener('contextmenu', (e) => {
        e.preventDefault(); 
        this.devModeActive = !this.devModeActive;
        this.shadow.querySelector('.metrics-box')?.classList.toggle('visible', this.devModeActive);
    });
  }

  private async toggleConversation() {
    if (this.isActive) this.stop();
    else await this.start();
  }

  private async start() {
    const gatewayUrl = this.getAttribute('gateway-url') || '';
    const tenantId = this.getAttribute('tenant-id') || '';
    if (!gatewayUrl || !tenantId) return;

    if (this.transcriptBox) {
        this.transcriptBox.innerHTML = '';
        this.transcriptBox.classList.add('visible');
    }

    this.client = new SentiricStreamClient({
      gatewayUrl, tenantId, language: this.getAttribute('language') || 'tr-TR',
      onClose: () => this.stop(),
      onError: () => this.stop(),
      onTranscript: (data) => this.handleTranscript(data) 
    });

    this.isActive = true;
    this.updateUI();
    await this.client.start();
  }

  private stop() {
    this.isActive = false;
    this.client?.stop();
    this.updateUI();
    this.transcriptBox?.classList.remove('visible');
  }

  private getAvatarHtml(sender: string, gender: string, emotion: string): string {
      if (sender === 'AI') return `<div class="avatar ai-avatar">🤖</div>`;
      let face = (gender === 'M' || gender === 'm') ? '👨' : (gender === 'F' || gender === 'f' ? '👩' : '👤');
      let emo = '';
      if (emotion === 'excited' || emotion === 'happy') emo = '<div class="emo-badge">🔥</div>';
      else if (emotion === 'angry') emo = '<div class="emo-badge">😠</div>';
      else if (emotion === 'sad') emo = '<div class="emo-badge">😢</div>';
      return `<div class="avatar user-avatar">${face}${emo}</div>`;
  }

  private handleTranscript(data: any) {
    if (!this.transcriptBox) return;
    const isUser = data.sender === 'USER';
    const activeMsgId = `msg-${isUser ? 'user' : 'ai'}-active`;
    
    let rowEl = this.transcriptBox.querySelector(`#${activeMsgId}`) as HTMLElement | null;
    if (!rowEl) {
        rowEl = document.createElement('div');
        rowEl.id = activeMsgId;
        rowEl.className = `message-row ${isUser ? 'user' : 'ai'}`;
        const avatar = this.getAvatarHtml(data.sender, data.gender, data.emotion);
        rowEl.innerHTML = `${!isUser ? avatar : ''}<div class="message ${isUser ? 'user' : 'ai'} partial"></div>${isUser ? avatar : ''}`;
        this.transcriptBox.appendChild(rowEl);
    }
    
    const msgEl = rowEl.querySelector('.message') as HTMLElement;
    if (msgEl) msgEl.innerText = data.text;

    const isFinal = data.isFinal || data.is_final;
    if (isFinal) {
        rowEl.removeAttribute('id');
        msgEl.classList.remove('partial');
        if (this.devModeActive) {
            this.shadow.querySelector('#metricsData')!.innerHTML = 
                `<b>Last Turn:</b> ${new Date().toLocaleTimeString()}<br><b>Sender:</b> ${data.sender}<br><b>Duygu:</b> ${data.emotion || 'nötr'}<br><b>Cinsiyet:</b> ${data.gender || '?'}`;
        }
    }
    this.transcriptBox.scrollTo({ top: this.transcriptBox.scrollHeight, behavior: 'smooth' });
  }

  private updateUI() {
    const btn = this.shadow.querySelector('.main-button') as HTMLElement;
    btn.classList.toggle('active', this.isActive);
    btn.innerHTML = this.isActive ? '<span>✕</span>' : '<span>🎤</span>';
  }

  private render() {
    const themeColor = this.getAttribute('theme-color') || '#3b82f6';
    this.shadow.innerHTML = `
      <style>
        :host { position: fixed; bottom: 30px; right: 30px; z-index: 99999; font-family: system-ui, sans-serif; --theme-color: ${themeColor}; }
        .main-button { width: 64px; height: 64px; border-radius: 32px; background: var(--theme-color); border: none; color: #fff; cursor: pointer; box-shadow: 0 10px 25px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; font-size: 24px; transition: 0.3s; position: relative; z-index: 10; }
        .main-button.active { background: #ef4444; }
        .main-button.active::after { content: ''; position: absolute; width: 100%; height: 100%; border-radius: 50%; border: 3px solid var(--theme-color); animation: pulse 1.5s infinite; }
        @keyframes pulse { 0% { transform: scale(1); opacity: 0.8; } 100% { transform: scale(1.5); opacity: 0; } }
        .transcript-box { position: absolute; bottom: 90px; right: 0; width: 320px; max-height: 400px; overflow-y: auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 20px; padding: 16px; box-shadow: 0 20px 40px -10px rgba(0,0,0,0.15); opacity: 0; transform: translateY(20px) scale(0.95); transition: 0.3s; pointer-events: none; display: flex; flex-direction: column; gap: 12px; }
        .transcript-box.visible { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
        .message-row { display: flex; gap: 8px; width: 100%; align-items: flex-end; }
        .message-row.user { justify-content: flex-end; }
        .avatar { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; background: #f1f5f9; border: 1px solid #e2e8f0; position: relative; }
        .emo-badge { position: absolute; bottom: -4px; right: -4px; font-size: 10px; background: #fff; border-radius: 50%; width: 14px; height: 14px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .message { padding: 10px 14px; border-radius: 16px; max-width: 75%; font-size: 14px; line-height: 1.4; word-wrap: break-word; }
        .message.user { background: var(--theme-color); color: #fff; border-bottom-right-radius: 4px; }
        .message.ai { background: #f1f5f9; color: #1e293b; border-bottom-left-radius: 4px; }
        .message.partial { opacity: 0.6; font-style: italic; }
        .metrics-box { position: absolute; top: -110px; right: 0; width: 220px; background: rgba(15,23,42,0.9); color: #10b981; font-family: monospace; font-size: 10px; padding: 12px; border-radius: 12px; opacity: 0; pointer-events: none; transition: 0.2s; z-index: 15; }
        .metrics-box.visible { opacity: 1; }
      </style>
      <div class="metrics-box"><b>🛠️ Developer Metrics</b><div id="metricsData">No data</div></div>
      <div class="transcript-box" id="transcriptBox"></div>
      <button class="main-button" title="Sağ Tık: Geliştirici Modu"><span>🎤</span></button>
    `;
    this.shadow.querySelector('.main-button')!.addEventListener('click', () => this.toggleConversation());
  }
}
customElements.define('sentiric-voice-widget', SentiricVoiceWidget);