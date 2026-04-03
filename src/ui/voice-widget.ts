// [ARCH-COMPLIANCE] stream-sdk/src/ui/voice-widget.ts (TAMAMI)

import { SentiricStreamClient } from '../core/stream-client';

export class SentiricVoiceWidget extends HTMLElement {
  private client: SentiricStreamClient | null = null;
  private isActive: boolean = false;
  private shadow: ShadowRoot;
  private transcriptBox: HTMLElement | null = null;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
  }

  static get observedAttributes() {
    return ['tenant-id', 'gateway-url', 'language', 'theme-color'];
  }

  connectedCallback() {
    this.render();
    this.transcriptBox = this.shadow.querySelector('#transcriptBox');
  }

  private async toggleConversation() {
    if (this.isActive) {
      this.stop();
    } else {
      await this.start();
    }
  }

  private async start() {
    const gatewayUrl = this.getAttribute('gateway-url') || '';
    const tenantId = this.getAttribute('tenant-id') || '';
    const language = this.getAttribute('language') || 'tr-TR';

    if (!gatewayUrl || !tenantId) {
      console.error('❌ Sentiric: gateway-url and tenant-id are required!');
      return;
    }

    if (this.transcriptBox) {
        this.transcriptBox.innerHTML = '';
        this.transcriptBox.classList.add('visible');
    }

    this.client = new SentiricStreamClient({
      gatewayUrl,
      tenantId,
      language,
      onClose: () => this.stop(),
      onError: (err) => {
        console.error('Sentiric Error:', err);
        this.stop();
      },
      onTranscript: (data) => this.handleTranscript(data) // [CRITICAL FIX]: Metin akışı UI'a bağlandı.
    });

    try {
      this.isActive = true;
      this.updateUI();
      await this.client.start();
    } catch (e) {
      this.stop();
    }
  }

  private stop() {
    this.isActive = false;
    this.client?.stop();
    this.updateUI();
    if (this.transcriptBox) {
        this.transcriptBox.classList.remove('visible');
    }
  }

  // [YENİ]: AI ve User metinlerini ekrana basan/güncelleyen fonksiyon
  // [ARCH-COMPLIANCE] TS2339 Hatası Giderildi.
  private handleTranscript(data: any) {
    if (!this.transcriptBox) return;

    const msgClass = data.sender === 'USER' ? 'user' : 'ai';
    const activeMsgId = `msg-${msgClass}-active`;
    
    let msgEl = this.transcriptBox.querySelector(`#${activeMsgId}`) as HTMLElement | null;
    
    if (!msgEl) {
        msgEl = document.createElement('div');
        msgEl.id = activeMsgId;
        msgEl.className = `message ${msgClass}`;
        this.transcriptBox.appendChild(msgEl);
    }

    msgEl.innerText = data.text;

    // [CRITICAL FIX]: Protobuf.js snake_case'i camelCase'e çevirir. İki ihtimali de destekle.
    const isFinal = data.isFinal !== undefined ? data.isFinal : data.is_final;

    if (isFinal) {
        msgEl.removeAttribute('id');
        msgEl.classList.remove('partial');
    } else {
        msgEl.classList.add('partial');
    }

    // Scroll'u pürüzsüzce en alta kaydır
    this.transcriptBox.scrollTo({
      top: this.transcriptBox.scrollHeight,
      behavior: 'smooth'
    });
  }

  private updateUI() {
    const button = this.shadow.querySelector('.main-button');
    if (button) {
      if (this.isActive) {
        button.classList.add('active');
        button.innerHTML = '<span>✕</span>'; 
      } else {
        button.classList.remove('active');
        button.innerHTML = '<span>🎤</span>'; 
      }
    }
  }

  private render() {
    const themeColor = this.getAttribute('theme-color') || '#3b82f6';
    
    this.shadow.innerHTML = `
      <style>
        :host {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 9999;
          font-family: system-ui, -apple-system, sans-serif;
          --theme-color: ${themeColor};
        }
        .main-button {
          width: 60px;
          height: 60px;
          border-radius: 30px;
          background: var(--theme-color);
          border: none;
          color: white;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), background 0.3s;
          position: relative;
          z-index: 2;
        }
        .main-button:hover { transform: scale(1.1); }
        .main-button span { font-size: 24px; }
        .main-button.active { background: #ef4444; }
        .main-button.active::after {
          content: ''; position: absolute; width: 100%; height: 100%;
          border-radius: 50%; border: 4px solid var(--theme-color);
          animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        
        /* [YENİ]: Transcript Box Styles */
        .transcript-box {
          position: absolute;
          bottom: 80px;
          right: 0;
          width: 280px;
          max-height: 350px;
          overflow-y: auto;
          background: rgba(24, 24, 27, 0.85);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 16px;
          padding: 12px;
          color: #fff;
          font-size: 13px;
          line-height: 1.4;
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
          opacity: 0;
          transform: translateY(10px) scale(0.95);
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          pointer-events: none;
          display: flex;
          flex-direction: column;
          gap: 8px;
          z-index: 1;
        }
        .transcript-box.visible {
          opacity: 1;
          transform: translateY(0) scale(1);
          pointer-events: auto;
        }
        .transcript-box::-webkit-scrollbar { width: 4px; }
        .transcript-box::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }
        
        .message {
          padding: 10px 14px;
          border-radius: 12px;
          max-width: 90%;
          word-wrap: break-word;
          animation: popIn 0.2s ease-out forwards;
        }
        .message.user { 
          background: var(--theme-color); 
          align-self: flex-end; 
          border-bottom-right-radius: 2px; 
        }
        .message.ai { 
          background: rgba(255,255,255,0.1); 
          align-self: flex-start; 
          border-bottom-left-radius: 2px; 
        }
        .message.partial { opacity: 0.7; font-style: italic; }
        @keyframes popIn { 
          from { opacity: 0; transform: scale(0.95) translateY(5px); } 
          to { opacity: 1; transform: scale(1) translateY(0); } 
        }
      </style>
      
      <div class="transcript-box" id="transcriptBox"></div>
      <button class="main-button"><span>🎤</span></button>
    `;

    this.shadow.querySelector('.main-button')?.addEventListener('click', () => this.toggleConversation());
  }
}

if (!customElements.get('sentiric-voice-widget')) {
  customElements.define('sentiric-voice-widget', SentiricVoiceWidget);
}