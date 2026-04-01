# 🌐 Sentiric Voice Widget SDK - Görev Listesi

Bu liste, `stream-gateway-service` ile tam uyumlu, gömülebilir sesli widget'ın geliştirme yol haritasıdır.

---

### Faz 1: Core Altyapı ve Bağlantı (ÖNCELİKLİ)

- [ ] **WIDGET-001: Proje İskeleti**
    - **Açıklama:** TypeScript, Vite (Library Mode) ve Prettier/Eslint kurulumu.
    - **Durum:** ⬜ Planlandı.
- [ ] **WIDGET-002: Protobuf Entegrasyonu**
    - **Açıklama:** `@sentiric/contracts` npm paketinin dahil edilmesi ve `StreamSessionRequest` mesaj tiplerinin tanımlanması.
    - **Durum:** ⬜ Planlandı.
- [ ] **WIDGET-003: Core Stream Client**
    - **Açıklama:** `SentiricStreamClient` sınıfının yazılması. WebSocket lifecycle yönetimi ve Gateway el sıkışma (SessionConfig) mantığı.
    - **Durum:** ⬜ Planlandı.

---

### Faz 2: Ses İşleme ve Pipeline

- [ ] **WIDGET-004: AudioWorklet Kaydedici**
    - **Açıklama:** Web Audio API kullanarak mikrofondan ham ses (PCM) alma ve Gateway'in beklediği sample rate (örn: 24kHz) dönüşümü.
    - **Durum:** ⬜ Planlandı.
- [ ] **WIDGET-005: Playback Jitter Buffer**
    - **Açıklama:** Gateway'den gelen ses parçalarını pürüzsüz çalmak için kuyruğa alma ve zamanlama mantığı.
    - **Durum:** ⬜ Planlandı.

---

### Faz 3: UI ve Web Component

- [ ] **WIDGET-006: Shadow DOM Widget Shell**
    - **Açıklama:** `<sentiric-voice-widget>` custom element iskeleti ve CSS izolasyonu.
    - **Durum:** ⬜ Planlandı.
- [ ] **WIDGET-007: Canlı Durum Animasyonları**
    - **Açıklama:** "Dinliyor", "Düşünüyor", "Konuşuyor" durumları için görsel geri bildirimler.
    - **Durum:** ⬜ Planlandı.

---

### Faz 4: SDK Yayınlama

- [ ] **WIDGET-008: CDN & NPM Dağıtımı**
    - **Açıklama:** Rollup/Vite ile tek dosya (minified) build ve sürümleme (v1.0.0).
    - **Durum:** ⬜ Planlandı.

---
