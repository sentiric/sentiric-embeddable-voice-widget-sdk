import { AUDIO_WORKLET_CODE } from './audio-processor-worklet';

export class SentiricAudioManager {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  
  // Playback için zamanlama (Scheduling) değişkenleri
  private nextStartTime: number = 0;

  constructor(
    private onAudioData: (data: Uint8Array) => void,
    private sampleRate: number = 24000
  ) {}

  /**
   * Mikrofonu başlatır.
   */
  public async startMicrophone(): Promise<void> {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      if (!this.audioContext) {
        this.audioContext = new AudioContext({ sampleRate: this.sampleRate });
      }

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const blob = new Blob([AUDIO_WORKLET_CODE], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      await this.audioContext.audioWorklet.addModule(url);

      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.workletNode = new AudioWorkletNode(this.audioContext, 'sentiric-audio-processor');

      this.workletNode.port.onmessage = (event) => {
        this.onAudioData(new Uint8Array(event.data));
      };

      this.sourceNode.connect(this.workletNode);
      console.log('🎤 Microphone started.');
    } catch (err) {
      console.error('❌ Microphone error:', err);
      throw err;
    }
  }

  /**
   * Gateway'den gelen ham ses (PCM) parçalarını hoparlörde çalar.
   */
  public playChunk(pcmData: Uint8Array): void {
    if (!this.audioContext) return;

    // Uint8Array (bytes) -> Int16Array -> Float32Array (Web Audio API standardı)
    const int16Buffer = new Int16Array(pcmData.buffer);
    const float32Buffer = new Float32Array(int16Buffer.length);

    for (let i = 0; i < int16Buffer.length; i++) {
      float32Buffer[i] = int16Buffer[i] / 0x8000;
    }

    const audioBuffer = this.audioContext.createBuffer(1, float32Buffer.length, this.sampleRate);
    audioBuffer.getChannelData(0).set(float32Buffer);

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);

    // Ses parçalarını uç uca ekleyerek pürüzsüz çal (Jitter Scheduling)
    const currentTime = this.audioContext.currentTime;
    if (this.nextStartTime < currentTime) {
      this.nextStartTime = currentTime;
    }

    source.start(this.nextStartTime);
    this.nextStartTime += audioBuffer.duration;
  }

  public stop(): void {
    this.workletNode?.disconnect();
    this.sourceNode?.disconnect();
    this.mediaStream?.getTracks().forEach((track) => track.stop());
    this.audioContext?.close();
    this.audioContext = null;
    console.log('🛑 Audio stopped.');
  }
}