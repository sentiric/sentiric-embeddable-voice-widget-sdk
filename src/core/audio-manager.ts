import { AUDIO_WORKLET_CODE } from './audio-processor-worklet';
import { Logger } from '../utils/logger';

export class SentiricAudioManager {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  
  // Playback State
  private nextStartTime: number = 0;
  private activeSourceNodes: AudioBufferSourceNode[] = [];

  // VAD (Voice Activity Detection) State
  public vadThreshold: number = 0.015; // [CRITICAL FIX]: 0.010'dan 0.015'e çıkarıldı (Arka plan gürültüsü için)
  public vadPauseTime: number = 1500; // ms
  private isSpeaking: boolean = false;
  private lastSpkTime: number = 0;
  
  // [CRITICAL FIX]: Ani patlamaları (nefes, tıkırtı) "Söz Kesme" saymamak için debouncer eklendi.
  private speechFramesCount: number = 0;
  private readonly SPEECH_FRAMES_REQUIRED: number = 5; 

  constructor(
    private onAudioData: (data: Uint8Array) => void,
    private onInterrupt: () => void,
    private sampleRate: number = 24000
  ) {}

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
        const { pcmData, rms } = event.data;
        this.handleVadAndEmit(new Uint8Array(pcmData), rms);
      };

      this.sourceNode.connect(this.workletNode);
      Logger.info("MIC_STARTED", "Microphone and VAD engine started.");
    } catch (err) {
      Logger.error("MIC_ERROR", "Microphone initialization failed", { error: err });
      throw err;
    }
  }

  private handleVadAndEmit(pcmBytes: Uint8Array, rms: number) {
    if (rms > this.vadThreshold) {
      this.lastSpkTime = Date.now();
      
      // [CRITICAL FIX]: Anında tetiklemek yerine çerçeve (frame) sayıyoruz.
      this.speechFramesCount++;
      
      if (!this.isSpeaking && this.speechFramesCount >= this.SPEECH_FRAMES_REQUIRED) {
        this.isSpeaking = true;
        Logger.info("VAD_SPEECH_START", "Valid speech detected. Triggering Barge-in!");
        this.flushPlayback(); 
        this.onInterrupt();   
      }
      
      this.onAudioData(pcmBytes);
    } else {
      // Ses kesildiğinde frame sayacını sıfırla (Anlık patlamaları elemek için)
      this.speechFramesCount = 0;

      if (this.isSpeaking && (Date.now() - this.lastSpkTime > this.vadPauseTime)) {
        this.isSpeaking = false;
        Logger.info("VAD_SPEECH_STOP", "Silence detected. Pausing audio transmission.");
      }

      if (this.isSpeaking) {
        this.onAudioData(pcmBytes);
      }
    }
  }

  public injectExternalAudio(pcm16Data: Int16Array, rmsOverride?: number) {
    let rms = rmsOverride;
    if (rms === undefined) {
      let sumSquares = 0;
      for (let i = 0; i < pcm16Data.length; i++) {
        const normalized = pcm16Data[i] / 0x8000;
        sumSquares += normalized * normalized;
      }
      rms = Math.sqrt(sumSquares / pcm16Data.length);
    }
    this.handleVadAndEmit(new Uint8Array(pcm16Data.buffer), rms);
  }

  public playChunk(pcmData: Uint8Array): void {
    if (!this.audioContext) return;

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

    const currentTime = this.audioContext.currentTime;
    if (this.nextStartTime < currentTime) {
      this.nextStartTime = currentTime;
    }

    source.start(this.nextStartTime);
    this.nextStartTime += audioBuffer.duration;

    this.activeSourceNodes.push(source);
    source.onended = () => {
      this.activeSourceNodes = this.activeSourceNodes.filter(n => n !== source);
    };
  }

  public flushPlayback(): void {
    if (this.activeSourceNodes.length > 0) {
      Logger.info("AUDIO_FLUSH", `Flushing ${this.activeSourceNodes.length} active audio nodes.`);
      this.activeSourceNodes.forEach(node => {
        try { node.stop(); } catch (e) {} 
      });
      this.activeSourceNodes = [];
    }
    this.nextStartTime = this.audioContext ? this.audioContext.currentTime : 0;
  }

  public stop(): void {
    this.flushPlayback();
    this.workletNode?.disconnect();
    this.sourceNode?.disconnect();
    this.mediaStream?.getTracks().forEach((track) => track.stop());
    this.audioContext?.close();
    this.audioContext = null;
    this.isSpeaking = false;
    this.speechFramesCount = 0;
    Logger.info("MIC_STOPPED", "Audio engine stopped cleanly.");
  }
}