# 🌊 Sentiric Embeddable Voice Widget SDK

[![Status](https://img.shields.io/badge/status-active-green.svg)]()
[![Spec](https://img.shields.io/badge/spec-v4.1-blue.svg)]()

Bu SDK, web sitelerine tek satır kod ile eklenebilen, Sentiric AI asistanı ile gerçek zamanlı (Full-Duplex) sesli iletişim kurmayı sağlayan hafif bir istemci kütüphanesidir.

## 🏛️ Mimari Prensipler (Spec Compliance)

*   **WebSocket & Protobuf:** Eski SIP/RTP protokolleri yerine `stream-gateway-service` ile yüksek performanslı, ikili (binary) Protobuf mesajları üzerinden haberleşir.
*   **Shadow DOM İzolasyonu:** Web Component yapısı sayesinde müşteri sitesinin CSS ve JS kurallarıyla çakışmaz.
*   **Aptal İstemci (Dumb Client):** Hiçbir AI mantığı veya API anahtarı barındırmaz. Sadece mikrofon/hoparlör ile Gateway arasında köprü kurar.
*   **SUTS v4.0:** Tüm dahili olaylar ve hatalar standart telemetri formatında raporlanır.

## 🚀 Hızlı Başlangıç

### 1. HTML Entegrasyonu (CDN)
```html
<script src="https://cdn.sentiric.com/sdk/v1/voice-widget.js"></script>

<sentiric-voice-widget 
    tenant-id="your-tenant-id"
    gateway-url="wss://stream.sentiric.ai/ws"
    language="tr-TR"
    theme-color="#3b82f6">
</sentiric-voice-widget>
```

### 2. NPM ile Kullanım
```bash
npm install @sentiric/contracts @sentiric/voice-widget-sdk
```

## 🛠️ Yerel Geliştirme

1. `npm install`
2. `npm run dev` (Örnek test sayfası ile birlikte başlatır)
3. `npm run build` (UMD ve ESM çıktılarını `dist/` klasörüne yazar)

---
## 📜 Anayasal Konum
Bu SDK, [Sentiric Spec](https://github.com/sentiric/sentiric-spec) dokümantasyonundaki `frontend_sdk` kısıtlamalarına tabidir.

