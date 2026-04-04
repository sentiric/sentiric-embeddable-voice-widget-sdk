// [ARCH-COMPLIANCE] audio-manager.ts - VAD Stability Tuning
import { AUDIO_WORKLET_CODE } from './audio-processor-worklet';
import { Logger } from '../utils/logger';

export class SentiricAudioManager {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private nextStartTime: number = 0;
  private activeSourceNodes: AudioBufferSourceNode[] = [];

  // [TUNING]: Hassasiyeti artırıyoruz. 0.015 -> 0.025 (Gürültü filtresi)
  public vadThreshold: number = 0.025; 
  public vadPauseTime: number = 1500; 
  private isSpeaking: boolean = false;
  private lastSpkTime: number = 0;
  
  // [TUNING]: Debouncer'ı güçlendiriyoruz. 5 -> 15 (Anlık tıkırtıları yutar)
  private speechFramesCount: number = 0;
  private readonly SPEECH_FRAMES_REQUIRED: number = 15; 

  constructor(
    private onAudioData: (data: Uint8Array) => void,
    private onInterrupt: () => void,
    private sampleRate: number = 24000
  ) {}

  public async startMicrophone(): Promise<void> {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      if (!this.audioContext) this.audioContext = new AudioContext({ sampleRate: this.sampleRate });
      if (this.audioContext.state === 'suspended') await this.audioContext.resume();
      const blob = new Blob([AUDIO_WORKLET_CODE], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      await this.audioContext.audioWorklet.addModule(url);
      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.workletNode = new AudioWorkletNode(this.audioContext, 'sentiric-audio-processor');
      this.workletNode.port.onmessage = (e) => this.handleVadAndEmit(new Uint8Array(e.data.pcmData), e.data.rms);
      this.sourceNode.connect(this.workletNode);
      Logger.info("MIC_STARTED", "Mic active with hardened VAD.");
    } catch (err) {
      Logger.error("MIC_ERROR", "Mic init fail", { error: err });
      throw err;
    }
  }

  private handleVadAndEmit(pcmBytes: Uint8Array, rms: number) {
    if (rms > this.vadThreshold) {
      this.lastSpkTime = Date.now();
      this.speechFramesCount++;
      
      // Sadece gerçek bir konuşma (15 frame) ise müdahale et
      if (!this.isSpeaking && this.speechFramesCount >= this.SPEECH_FRAMES_REQUIRED) {
        this.isSpeaking = true;
        Logger.info("VAD_SPEECH_START", "Human speech confirmed. Sending Interrupt.");
        this.flushPlayback(); 
        this.onInterrupt();   
      }
      this.onAudioData(pcmBytes);
    } else {
      this.speechFramesCount = 0;
      if (this.isSpeaking && (Date.now() - this.lastSpkTime > this.vadPauseTime)) {
        this.isSpeaking = false;
        Logger.info("VAD_SPEECH_STOP", "User finished speaking.");
      }
      if (this.isSpeaking) this.onAudioData(pcmBytes);
    }
  }

  public playChunk(pcmData: Uint8Array): void {
    if (!this.audioContext || pcmData.length < 2) return;
    try {
      const safeLength = Math.floor(pcmData.byteLength / 2) * 2;
      const bufferToUse = pcmData.byteLength === safeLength ? pcmData : pcmData.slice(0, safeLength);
      const int16Buffer = new Int16Array(bufferToUse.buffer, bufferToUse.byteOffset, bufferToUse.byteLength / 2);
      const float32Buffer = new Float32Array(int16Buffer.length);
      for (let i = 0; i < int16Buffer.length; i++) float32Buffer[i] = int16Buffer[i] / 32768.0;
      const audioBuffer = this.audioContext.createBuffer(1, float32Buffer.length, this.sampleRate);
      audioBuffer.getChannelData(0).set(float32Buffer);
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      const currentTime = this.audioContext.currentTime;
      if (this.nextStartTime < currentTime) this.nextStartTime = currentTime;
      source.start(this.nextStartTime);
      this.nextStartTime += audioBuffer.duration;
      this.activeSourceNodes.push(source);
      source.onended = () => { this.activeSourceNodes = this.activeSourceNodes.filter(n => n !== source); };
    } catch (e) {}
  }

  public flushPlayback(): void {
    this.activeSourceNodes.forEach(node => { try { node.stop(); } catch (e) {} });
    this.activeSourceNodes = [];
    this.nextStartTime = this.audioContext ? this.audioContext.currentTime : 0;
  }

  public stop() {
    this.flushPlayback();
    this.workletNode?.disconnect();
    this.sourceNode?.disconnect();
    this.mediaStream?.getTracks().forEach((track) => track.stop());
    this.audioContext?.close();
    this.audioContext = null;
    this.isSpeaking = false;
  }
}