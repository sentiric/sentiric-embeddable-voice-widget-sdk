// File: src/core/audio-processor-worklet.ts

export const AUDIO_WORKLET_CODE = `
class SentiricAudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input.length > 0 && input[0].length > 0) {
      const channelData = input[0]; // Mono kanal
      const pcmData = new Int16Array(channelData.length);
      let sumSquares = 0;

      for (let i = 0; i < channelData.length; i++) {
        // Clipping koruması
        const s = Math.max(-1, Math.min(1, channelData[i]));
        // Float32 -> Int16 (PCM)
        pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        // RMS (Kök Ortalama Kare) için enerji toplamı
        sumSquares += channelData[i] * channelData[i];
      }

      const rms = Math.sqrt(sumSquares / channelData.length);

      // Ana thread'e işlenmiş paketi ve RMS değerini gönder
      this.port.postMessage({ 
        pcmData: pcmData.buffer, 
        rms: rms 
      }, [pcmData.buffer]);
    }
    return true;
  }
}

registerProcessor('sentiric-audio-processor', SentiricAudioProcessor);
`;