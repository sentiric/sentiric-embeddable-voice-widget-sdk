# 🌊 Sentiric Stream SDK

Sentiric `stream-gateway-service` altyapısı için geliştirilmiş resmi JavaScript/TypeScript istemci kütüphanesidir.

## 🎯 Vizyon
Bu SDK, Sentiric ekosisteminin tüm "Dijital Giriş Kapıları" için ortak iletişim motorudur. İster bir web sitesine sesli asistan ekleyin, ister bir operatör paneli (Web Agent) geliştirin, ister mobil bir chatbot yapın; `stream-sdk` tüm veri akışını standartlaştırır.

## 🛠️ Yetenekler
*   **Audio Streaming:** Full-duplex (söz kesilebilir) ses iletişimi.
*   **Data Streaming:** Gerçek zamanlı metin (transcript) ve sinyal takibi.
*   **UI Components:** Shadow-DOM ile izole edilmiş hazır bileşenler:
    *   `<sentiric-voice-widget>`: AI Asistan butonu ve arayüzü.

## 🚦 Hızlı Başlangıç
```html
<script src="https://cdn.sentiric.com/stream-sdk.js"></script>
<sentiric-voice-widget tenant-id="demo" gateway-url="wss://..."></sentiric-voice-widget>
```
