import { SentiricStreamClient } from '../core/stream-client';

export class SentiricVoiceWidget extends HTMLElement {
  private client: SentiricStreamClient | null = null;
  private isActive: boolean = false;
  private shadow: ShadowRoot;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
  }

  // Widget parametrelerini HTML attribute'larından al
  static get observedAttributes() {
    return ['tenant-id', 'gateway-url', 'language', 'theme-color'];
  }

  connectedCallback() {
    this.render();
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

    this.client = new SentiricStreamClient({
      gatewayUrl,
      tenantId,
      language,
      onClose: () => this.stop(),
      onError: (err) => {
        console.error('Sentiric Error:', err);
        this.stop();
      }
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
  }

  private updateUI() {
    const button = this.shadow.querySelector('.main-button');
    if (button) {
      if (this.isActive) {
        button.classList.add('active');
        button.innerHTML = '<span>✕</span>'; // Kapatma ikonu
      } else {
        button.classList.remove('active');
        button.innerHTML = '<span>🎤</span>'; // Mikrofon ikonu
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
        }
        .main-button {
          width: 60px;
          height: 60px;
          border-radius: 30px;
          background: ${themeColor};
          border: none;
          color: white;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), background 0.3s;
          position: relative;
        }
        .main-button:hover {
          transform: scale(1.1);
        }
        .main-button span {
          font-size: 24px;
        }
        .main-button.active {
          background: #ef4444; /* Kırmızı (Kapatırken) */
        }
        /* AI Pulse Animasyonu */
        .main-button.active::after {
          content: '';
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          border: 4px solid ${themeColor};
          animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.6); opacity: 0; }
        }
      </style>
      <button class="main-button">
        <span>🎤</span>
      </button>
    `;

    this.shadow.querySelector('.main-button')?.addEventListener('click', () => this.toggleConversation());
  }
}

// Custom element'i tarayıcıya kaydet
if (!customElements.get('sentiric-voice-widget')) {
  customElements.define('sentiric-voice-widget', SentiricVoiceWidget);
}