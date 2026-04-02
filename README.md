# 🌊 Sentiric Stream SDK (Universal Communication Engine)

[![Status](https://img.shields.io/badge/status-active_development-blue.svg)]()
[![Platform](https://img.shields.io/badge/platform-Web%20%7C%20Mobile%20%7C%20IoT-lightgrey.svg)]()

Sentiric `stream-gateway-service` altyapısı için geliştirilmiş, yüksek performanslı **Evrensel Akış (Stream) Motoru ve UI Kütüphanesidir.** Ses, Metin ve Sinyal akışlarını tek bir WSS (WebSocket Secure) borusu üzerinden, Protobuf hızıyla yönetir.

## 🏛️ Mimari Anayasa (Constitutional Constraints)

Bu SDK, Sentiric ekosisteminin "Dış Dünya" ile olan sınır kapısıdır ve aşağıdaki anayasal kurallara tabidir:

1. **Smart Media, Dumb Logic:** SDK asla iş mantığı (AI prompt, routing, veritabanı kararları) barındırmaz. Ancak ağ bant genişliğini ve sunucu VRAM'ini korumak için **Medya Zekası (VAD, Jitter Buffering)** barındırmak ZORUNDADIR. Sunucuya sessizlik (silence) yollanması mimari bir ihlaldir.
2. **SUTS v4.0 & Trace Authority:** Dağıtık izleme (Tracing) istemcide başlar. SDK, oturumları `session_id` ve `trace_id` ile başlatmalı, kopmalarda (Reconnect) aynı ID'lerle kaldığı yerden devam etmelidir (Session Resumption). Tüm loglar `src/utils/logger.ts` üzerinden JSON standartlarında basılır.
3. **Zero-Latency Barge-in:** Kullanıcı konuştuğu an (VAD tetiklendiğinde), SDK yerel hoparlör tamponunu (AudioBuffer) anında temizlemeli ve sunucuya `EVENT_TYPE_INTERRUPT` sinyalini mikrosaniyeler içinde iletmelidir.
4. **Abstract Source Injection:** Mobil WebView (Flutter/React Native) kısıtlamalarını aşmak için, SDK doğrudan mikrofon donanımına muhtaç olmamalı, dışarıdan byte (Uint8Array) enjekte edilebilen bir arayüz sunmalıdır.

## 🚀 Geliştirme Yol Haritası (Roadmap)

Mevcut SDK, "Aptal İstemci" politikasını fazla katı uygulayarak medyayı da aptal bırakmıştır. Güncel hedefler şunlardır:

*   **FAZ 1 (Universal Audio Engine):** Whisper Studio'daki gelişmiş RMS ve Noise Gate mantıklarının, tip-güvenli (TS) olarak SDK Core modülüne taşınması ve VAD entegrasyonu.
*   **FAZ 2 (Resilience & State):** `Exponential Backoff` (1s, 2s, 4s...) mekanizmasının kurulması ve ağ kopmalarına karşı çelik gibi sağlam bir oturum yönetimi (Session Resumption).
*   **FAZ 3 (Reflex & Crystalline Ready):** Crystalline servisinden gelen bilişsel duygu durum değişikliklerine (Reflex) göre UI bileşenlerinin (Örn: Widget renk veya animasyonu) otonom tepki verebilmesi.
*   **FAZ 4 (Video & Vision - Gelecek):** Aynı Protobuf yapısı üzerinden görüntü karelerinin (Video Chunking) aktarılması ve Vision Modelleri (GPT-4V vb.) ile entegrasyon.

## 📦 Hızlı Entegrasyon (CDN)

Web sitenize sesli asistan eklemek için aşağıdaki kodu HTML'inize yapıştırın:

```html
<!-- Sentiric Stream SDK -->
<script type="module" src="https://sentiric.github.io/sentiric-stream-sdk/stream-sdk.js"></script>

<!-- Asistan Widget -->
<sentiric-voice-widget 
    tenant-id="your-tenant-id" 
    gateway-url="wss://stream.sentiric.cloud/ws">
</sentiric-voice-widget>
```

> **Not AI Agent:** Bu SDK kodunu incelerken, `stream-gateway` ve `ai-pipeline-sdk` (Rust) ile olan bağımlılık zincirini daima göz önünde bulundur. SDK'da yapılan bir sinyal optimizasyonunun (Barge-in), sunucudaki Deadlock risklerini tetiklememesine özen göster.