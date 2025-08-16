# 🌐 Sentiric Embeddable Voice Widget SDK

[![Status](https://img.shields.io/badge/status-prototype-orange.svg)]()
[![Language](https://img.shields.io/badge/language-JavaScript_/_TypeScript-blue.svg)]()

Bu repo, web sitelerine kolayca entegre edilebilen, Sentiric'in sesli etkileşim yeteneklerini doğrudan son kullanıcılara sunan bir **JavaScript widget/SDK'sı** geliştirmeyi hedefler.

## 🎯 Temel Sorumluluklar

*   **WebRTC Entegrasyonu:** Tarayıcıdan mikrofon ve hoparlör erişimi sağlayarak, sesi `sentiric-sip-gateway-service`'e WebRTC üzerinden gönderir.
*   **Kullanıcı Arayüzü:** Web sitesine eklenebilen, tıklanabilir bir "Bize Sesle Ulaşın" butonu ve temel bir çağrı arayüzü (örn: kayıt/durdur butonu, durum göstergesi) sağlar.
*   **Geliştirici API'si:** Widget'ın davranışını (renkler, metinler vb.) özelleştirmek ve `onCallStart`, `onTranscriptReceived` gibi olayları dinlemek için geliştirici dostu bir API sunar.

## 🛠️ Teknoloji Yığını

*   **Dil:** TypeScript
*   **Protokol:** WebRTC
*   **UI:** Lit Element veya Preact (hafif ve Shadow DOM ile izolasyon için)
*   **Paketleyici:** Rollup veya Webpack (SDK dağıtımı için)

## 🔌 API Etkileşimleri

*   **Protokol İletişimi:** `sentiric-sip-gateway-service` ile WebRTC üzerinden SIP ve RTP/SRTP iletişimi kurar.
*   **API İstemcisi:** Kimlik doğrulama ve oturum başlatma için `sentiric-api-gateway-service`'i çağırabilir.

## 🚀 Yerel Geliştirme

1.  **Bağımlılıkları Yükleyin:** `npm install`
2.  **Örnek Sayfayı Başlatın:** `npm run dev`

## 🤝 Katkıda Bulunma

Katkılarınızı bekliyoruz! Lütfen projenin ana [Sentiric Governance](https://github.com/sentiric/sentiric-governance) reposundaki kodlama standartlarına ve katkıda bulunma rehberine göz atın.

---
## 🏛️ Anayasal Konum

Bu servis, [Sentiric Anayasası'nın (v11.0)](https://github.com/sentiric/sentiric-governance/blob/main/docs/blueprint/Architecture-Overview.md) **Zeka & Orkestrasyon Katmanı**'nda yer alan merkezi bir bileşendir.