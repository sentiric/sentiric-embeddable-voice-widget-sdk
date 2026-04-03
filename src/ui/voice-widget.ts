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

  static get observedAttributes() {
    return ['tenant-id', 'gateway-url', 'language', 'theme-color'];
  }

  connectedCallback() {
    this.render();
    this.transcriptBox = this.shadow.querySelector('#transcriptBox');
    
    // Gizli DevMode Tetikleyicisi (Butona çift tıklama veya uzun basma simülasyonu)
    let clickCount = 0;
    let clickTimer: any = null;
    const btn = this.shadow.querySelector('.main-button');
    if (btn) {
        btn.addEventListener('contextmenu', (e) => {
            e.preventDefault(); // Sağ tıkı engelle
            this.devModeActive = !this.devModeActive;
            const metricsBox = this.shadow.querySelector('.metrics-box');
            if (metricsBox) {
                if (this.devModeActive) metricsBox.classList.add('visible');
                else metricsBox.classList.remove('visible');
            }
        });
    }
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
      onTranscript: (data) => this.handleTranscript(data) 
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

  // [YENİ]: STT'den gelen Gender ve Emotion verisini Emoji'ye çevirir (Affective UI)
  private getAvatarHtml(sender: string, gender: string, emotion: string): string {
      if (sender === 'AI') {
          // AI her zaman robot ikonudur
          return `<div class="avatar ai-avatar">🤖</div>`;
      }
      
      // Kullanıcı için cinsiyet ve duygu analizi
      let face = '👤'; // Bilinmeyen
      if (gender === 'M' || gender === 'm') face = '👨';
      else if (gender === 'F' || gender === 'f') face = '👩';

      let emo = '';
      if (emotion === 'happy' || emotion === 'excited') emo = '<div class="emo-badge">🔥</div>';
      else if (emotion === 'angry') emo = '<div class="emo-badge">😠</div>';
      else if (emotion === 'sad') emo = '<div class="emo-badge">😢</div>';
      
      return `<div class="avatar user-avatar">${face}${emo}</div>`;
  }

  private handleTranscript(data: any) {
    if (!this.transcriptBox) return;

    const msgClass = data.sender === 'USER' ? 'user' : 'ai';
    const activeMsgId = `msg-${msgClass}-active`;
    
    let rowEl = this.transcriptBox.querySelector(`#${activeMsgId}`) as HTMLElement | null;
    let msgEl: HTMLElement | null = null;
    
    if (!rowEl) {
        rowEl = document.createElement('div');
        rowEl.id = activeMsgId;
        rowEl.className = `message-row ${msgClass}`;
        
        const avatarHtml = this.getAvatarHtml(data.sender, data.gender, data.emotion);
        
        rowEl.innerHTML = `
            ${msgClass === 'ai' ? avatarHtml : ''}
            <div class="message ${msgClass} partial"></div>
            ${msgClass === 'user' ? avatarHtml : ''}
        `;
        
        this.transcriptBox.appendChild(rowEl);
    }
    
    msgEl = rowEl.querySelector('.message') as HTMLElement;
    if (msgEl) {
        msgEl.innerText = data.text;
    }

    const isFinal = data.isFinal !== undefined ? data.isFinal : data.is_final;

    if (isFinal) {
        rowEl.removeAttribute('id');
        if (msgEl) msgEl.classList.remove('partial');
        
        // Eğer DevMode açıksa, gelen verinin bir kısmını metrik kutusuna yaz (Sürekli Güncellenir)
        if (this.devModeActive) {
            const metricsEl = this.shadow.querySelector('#metricsData');
            if (metricsEl) {
                const now = new Date().toLocaleTimeString('en-US', {hour12:false, fractionalSecondDigits: 1});
                metricsEl.innerHTML = `
                    <b>Last Turn:</b> ${now}<br>
                    <b>Sender:</b> ${data.sender}<br>
                    <b>Affective:</b> ${data.gender || '?'} | ${data.emotion || 'neutral'}<br>
                    <b>Char Count:</b> ${data.text.length}
                `;
            }
        }
    }

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
        button.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>'; 
      } else {
        button.classList.remove('active');
        button.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="22"></line></svg>'; 
      }
    }
  }

  private render() {
    const themeColor = this.getAttribute('theme-color') || '#3b82f6';
    
    this.shadow.innerHTML = `
      <style>
        :host {
          position: fixed;
          bottom: 30px;
          right: 30px;
          z-index: 99999;
          font-family: system-ui, -apple-system, sans-serif;
          --theme-color: ${themeColor};
        }
        
        /* Main Action Button */
        .main-button {
          width: 64px;
          height: 64px;
          border-radius: 32px;
          background: var(--theme-color);
          border: none;
          color: white;
          cursor: pointer;
          box-shadow: 0 10px 25px rgba(0,0,0,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), background 0.3s;
          position: relative;
          z-index: 10;
        }
        .main-button:hover { transform: scale(1.05); }
        .main-button.active { background: #ef4444; }
        .main-button.active::after {
          content: ''; position: absolute; width: 100%; height: 100%;
          border-radius: 50%; border: 3px solid var(--theme-color);
          animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        
        /* Transcript Box (Sohbet Ekranı) */
        .transcript-box {
          position: absolute;
          bottom: 90px;
          right: 0;
          width: 320px;
          max-height: 400px;
          overflow-y: auto;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          padding: 16px;
          color: #1e293b;
          font-size: 14px;
          line-height: 1.5;
          box-shadow: 0 20px 40px -10px rgba(0,0,0,0.15);
          opacity: 0;
          transform: translateY(20px) scale(0.95);
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          pointer-events: none;
          display: flex;
          flex-direction: column;
          gap: 12px;
          z-index: 5;
        }
        
        .transcript-box.visible {
          opacity: 1;
          transform: translateY(0) scale(1);
          pointer-events: auto;
        }
        
        .transcript-box::-webkit-scrollbar { width: 6px; }
        .transcript-box::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        
        /* Message Rows and Avatars */
        .message-row { display: flex; gap: 8px; width: 100%; align-items: flex-end; }
        .message-row.user { justify-content: flex-end; }
        .message-row.ai { justify-content: flex-start; }
        
        .avatar {
            width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
            font-size: 18px; flex-shrink: 0; position: relative; background: #f1f5f9; border: 1px solid #e2e8f0;
        }
        .ai-avatar { background: #e0e7ff; border-color: #c7d2fe; }
        .emo-badge {
            position: absolute; bottom: -4px; right: -4px; font-size: 12px; background: white; border-radius: 50%;
            width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .message {
          padding: 10px 14px;
          border-radius: 16px;
          max-width: 75%;
          word-wrap: break-word;
          box-shadow: 0 2px 5px rgba(0,0,0,0.05);
          animation: slideIn 0.2s ease-out forwards;
        }
        .message.user { 
          background: var(--theme-color); 
          color: white;
          border-bottom-right-radius: 4px; 
        }
        .message.ai { 
          background: #f1f5f9; 
          color: #0f172a;
          border-bottom-left-radius: 4px; 
        }
        .message.partial { opacity: 0.6; font-style: italic; }
        
        @keyframes slideIn { 
          from { opacity: 0; transform: translateY(10px); } 
          to { opacity: 1; transform: translateY(0); } 
        }

        /* Developer Metrics Box (Gizli) */
        .metrics-box {
            position: absolute;
            top: -120px;
            right: 0;
            width: 250px;
            background: rgba(15, 23, 42, 0.9);
            backdrop-filter: blur(8px);
            color: #10b981;
            font-family: monospace;
            font-size: 11px;
            padding: 12px;
            border-radius: 12px;
            border: 1px solid #334155;
            opacity: 0;
            pointer-events: none;
            transition: 0.2s;
            z-index: 15;
            box-shadow: 0 10px 25px rgba(0,0,0,0.3);
        }
        .metrics-box.visible { opacity: 1; }
        .metrics-box h4 { margin: 0 0 6px 0; color: #f8fafc; font-size: 12px; border-bottom: 1px solid #334155; padding-bottom: 4px; }
      </style>
      
      <div class="metrics-box" id="metricsBox">
          <h4>🛠️ Developer Metrics (STT/DSP)</h4>
          <div id="metricsData">Waiting for data...</div>
      </div>

      <div class="transcript-box" id="transcriptBox">
         <!-- Messages will appear here -->
      </div>
      
      <!-- Sağ tıka özel Developer Mode için title eklendi -->
      <button class="main-button" title="Sağ Tık: Geliştirici Modunu Açar">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="22"></line></svg>
      </button>
    `;

    this.shadow.querySelector('.main-button')?.addEventListener('click', () => this.toggleConversation());
  }
}

if (!customElements.get('sentiric-voice-widget')) {
  customElements.define('sentiric-voice-widget', SentiricVoiceWidget);
}