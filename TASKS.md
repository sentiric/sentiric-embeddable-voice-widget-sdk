# 🌐 Sentiric Embeddable Voice Widget SDK - Görev Listesi

Bu belge, `embeddable-voice-widget-sdk`'nın geliştirme yol haritasını ve önceliklerini tanımlar.

---

### Faz 1: Temel Widget ve Arayüz (Sıradaki Öncelik)

Bu faz, widget'ın görsel olarak var olmasını ve temel kullanıcı etkileşimlerini almasını hedefler.

-   [ ] **Görev ID: WIDGET-001 - Proje İskeleti**
    -   **Açıklama:** TypeScript, Rollup/Webpack ve Lit/Preact kullanarak temel proje yapısını oluştur.
    -   **Durum:** ⬜ Planlandı.

-   [ ] **Görev ID: WIDGET-002 - Temel UI Bileşenleri**
    -   **Açıklama:** Tıklanabilir bir "Çağrı Başlat" butonu ve çağrı durumunu gösteren basit bir modal/pencere arayüzü tasarla.
    -   **Durum:** ⬜ Planlandı.

-   [ ] **Görev ID: WIDGET-003 - Mikrofon Erişimi**
    -   **Açıklama:** Tarayıcıdan mikrofon izni isteme ve ses akışını yakalama mantığını implemente et.
    -   **Durum:** ⬜ Planlandı.

---

### Faz 2: WebRTC Entegrasyonu

Bu faz, widget'ın platformla gerçek zamanlı sesli iletişim kurmasını sağlamayı hedefler.

-   [ ] **Görev ID: WIDGET-004 - SIP over WebSockets**
    -   **Açıklama:** `sip-gateway`'e WebSocket üzerinden bağlanarak bir SIP oturumu başlatan `JsSIP` veya benzeri bir kütüphaneyi entegre et.
    -   **Durum:** ⬜ Planlandı.

-   [ ] **Görev ID: WIDGET-005 - RTP/SRTP Akışı**
    -   **Açıklama:** Mikrofon'dan gelen ses verisini WebRTC `RTCPeerConnection` üzerinden `media-service`'e (veya gateway'e) gönder. Gelen ses akışını hoparlörde çal.
    -   **Durum:** ⬜ Planlandı.

---

### Faz 3: Geliştirici API'si ve Özelleştirme

-   [ ] **Görev ID: WIDGET-006 - Geliştirici API'si**
    -   **Açıklama:** Widget'ı başlatan, olayları dinleyen (`onCallStart`, `onEnd`) ve özelleştiren (`setColor`, `setText`) bir JavaScript API'si oluştur.
    -   **Durum:** ⬜ Planlandı.