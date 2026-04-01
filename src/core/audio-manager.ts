import { AUDIO_WORKLET_CODE } from './audio-processor-worklet';

export class SentiricAudioManager {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;

  constructor(private onAudioData: (data: Uint8Array) => void) {}

  /**
   * Mikrofonu başlatır ve ses akışını yakalamaya başlar.
   */
  public async startMicrophone(sampleRate: number = 24000): Promise<void> {
    try {
      console.log('🎤 Requesting microphone access...');
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: sampleRate,
        },
      });

      this.audioContext = new AudioContext({ sampleRate });
      
      // Worklet kodunu bir Blob olarak yükle (Harici dosya bağımlılığını yok eder)
      const blob = new Blob([AUDIO_WORKLET_CODE], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      await this.audioContext.audioWorklet.addModule(url);

      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.workletNode = new AudioWorkletNode(this.audioContext, 'sentiric-audio-processor');

      this.workletNode.port.onmessage = (event) => {
        // Gelen ArrayBuffer'ı Uint8Array olarak (Protobuf için) ana menajere ilet
        this.onAudioData(new Uint8Array(event.data));
      };

      this.sourceNode.connect(this.workletNode);
      // Worklet'i herhangi bir yere bağlamıyoruz (Destination'a gitmesine gerek yok, duyulmasın)
      
      console.log('✅ Microphone and AudioWorklet started at', sampleRate, 'Hz');
    } catch (err) {
      console.error('❌ Failed to start microphone:', err);
      throw err;
    }
  }

  /**
   * Mikrofonu ve ses işleme zincirini durdurur.
   */
  public stopMicrophone(): void {
    this.workletNode?.disconnect();
    this.sourceNode?.disconnect();
    this.mediaStream?.getTracks().forEach((track) => track.stop());
    this.audioContext?.close();
    
    this.workletNode = null;
    this.sourceNode = null;
    this.mediaStream = null;
    this.audioContext = null;
    
    console.log('🛑 Microphone stopped.');
  }
}