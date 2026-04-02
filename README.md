# 🌊 Sentiric Stream SDK

Sentiric `stream-gateway-service` altyapısı için geliştirilmiş evrensel iletişim motoru ve UI kütüphanesidir.

## 📦 Hızlı Entegrasyon (CDN)
Web sitenize sesli asistan eklemek için aşağıdaki kodu HTML'inize yapıştırın:

```html
<!-- Sentiric Stream SDK -->
<script type="module" src="https://sentiric.github.io/sentiric-stream-sdk/stream-sdk.js"></script>

<!-- Asistan Widget -->
<sentiric-voice-widget 
    tenant-id="your-id" 
    gateway-url="wss://stream.sentiric.ai/ws">
</sentiric-voice-widget>
```

---

## 🤖 AI AGENT ORIENTATION (For LLM Orchestrators)

**DİKKAT:** Bu proje bir `TASKS.md` dosyası barındırmaz. Projeyi devralan AI modeli, aşağıdaki "Anayasal Vizyon" ve "Mevcut Durum" verilerine bakarak bir sonraki mantıklı adımı kendisi planlamalıdır.

### 🏛️ Mimari Anayasa (Constitutional Constraints)
1. **Dumb Client Policy:** SDK asla iş mantığı (AI prompt, routing vb.) barındırmaz. Sadece ses/metin borusudur.
2. **SUTS v4.0 Mandate:** Tüm loglar `src/utils/logger.ts` üzerinden standart JSON formatında basılmalıdır.
3. **Protobuf Strictness:** İletişim sadece `sentiric.stream.v1` şeması ile WebSocket üzerinden yapılır.
4. **Resilience First:** İnternet kopmalarına karşı `Exponential Backoff` mekanizması her zaman korunmalıdır.

### 🎯 Mevcut Yetenekler
* Full-duplex Audio (PCM 16-bit / AudioWorklet).
* Text Messaging (Chat support ready).
* Shadow-DOM isolated UI components.
* Auto-reconnection engine.

### 🚀 Geliştirme Beklentisi
Bu repoyu inceleyen AI modeli; **Performans Optimizasyonu, Video Akışı Hazırlığı, UI Özelleştirme Yetenekleri veya Cross-Platform (Mobile) Uyumluluğu** gibi alanlarda eksikleri tespit etmeli ve otonom olarak geliştirme planı sunmalıdır.

