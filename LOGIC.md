# 🧬 Stream SDK Audio Processing & VAD Logic

Bu belge, Web ve Mobil istemcilerin (Frontend) sunucuya ses gönderirken ve alırken kullandığı WebAudio API ve donanım soyutlamalarını açıklar.

## 1. Dynamic VAD (Voice Activity Detection) ve Yankı Koruması
Tarayıcı mikrofonu sürekli açıktır. Yapay zeka konuştuğunda, hoparlörden çıkan ses mikrofona geri girerek VAD'ı tetikleyebilir (Self-Noise / Echo-Barge-in).
* **Algoritma:** `audioManager.setAiSpeaking(true)` çağrıldığında, SDK'nın mikrofon duyarlılık eşiği (Threshold) 2.5 katına çıkarılır ve bekleme süresi (Pause Time) düşürülür. Böylece AI konuşurken mikrofon "sağırlaşır", sadece kullanıcı gerçekten bağırarak araya girerse (Barge-in) tetiklenir.

## 2. Priming Buffer (Jitter & Cızırtı Koruması)
Sunucudan (TTS) gelen ses parçaları (Chunk) ağdaki dalgalanmalar (Jitter) nedeniyle düzensiz aralıklarla ulaşır. Geleni anında çalmak (Play chunk) seste korkunç cızırtılara ve kesilmelere (Stuttering) yol açar.
* **Algoritma (Gapless Playback):** İlk gelen ses paketleri hemen çalınmaz. `primingBuffer` içine atılır. Toplam ses süresi `1000ms` (1 saniye) birikene kadar beklenir. Dolduğu an `AudioContext` tetiklenir ve sonraki gelen paketler, mevcut oynatmanın tam bitiş zamanına (`nextStartTime`) mükemmel milisaniye hassasiyetinde eklenir (Scheduling).

## 3. Zero-Latency Barge-In (Söz Kesme)
Kullanıcı mikrofondan konuştuğu an (VAD Tetiklendi):
1. Yerel `activeSourceNodes` (çalmayı bekleyen sesler) anında `stop()` ile durdurulur.
2. Sunucuya WebSocket üzerinden `{ control: { event: 1 } }` (EVENT_TYPE_INTERRUPT) sinyali atılır.
3. Sunucu AI üretimini iptal eder.
