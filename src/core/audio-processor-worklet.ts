/**
 * Bu kod tarayıcının ses thread'inde (AudioWorklet) çalışır.
 * Ana thread'i yormadan ham ses verisini işler.
 */
export const AUDIO_WORKLET_CODE = `
class SentiricAudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input.length > 0) {
      const channelData = input[0]; // Mono kanal verisi
      
      // Float32 -> Int16 Çevrimi (PCM)
      const pcmData = new Int16Array(channelData.length);
      for (let i = 0; i < channelData.length; i++) {
        // Sesi normalize et ve sınırla
        const s = Math.max(-1, Math.min(1, channelData[i]));
        pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }

      // Ana thread'e işlenmiş paketi gönder
      this.port.postMessage(pcmData.buffer, [pcmData.buffer]);
    }
    return true;
  }
}

registerProcessor('sentiric-audio-processor', SentiricAudioProcessor);
`;