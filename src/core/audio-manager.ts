// [ARCH-COMPLIANCE] sentiric-stream-sdk/src/core/audio-manager.ts
// NİHAİ SÜRÜM: Dinamik VAD, Elastik Zamanlayıcı, EOS Sinyali ve Jitter Buffer (Gapless Playback)
import { AUDIO_WORKLET_CODE } from "./audio-processor-worklet";
import { Logger } from "../utils/logger";

export class SentiricAudioManager {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;

  private nextStartTime: number = 0;
  private activeSourceNodes: AudioBufferSourceNode[] = [];

  // [MİMARİ DÜZELTME]: Jitter Buffer (Gapless Playback)
  private primingBuffer: Float32Array[] = [];
  private isPlaybackStarted: boolean = false;
  private readonly PRIMING_BUFFER_DURATION_MS = 1000;

  // VAD Dinamik Değişkenleri
  private readonly BASE_THRESHOLD = 0.025;
  private readonly BASE_PAUSE_TIME = 1500;
  private isAiSpeaking: boolean = false;

  public vadThreshold: number = 0.025;
  public vadPauseTime: number = 1500;
  private isSpeaking: boolean = false;
  private lastSpkTime: number = 0;
  private speechFramesCount: number = 0;
  private readonly SPEECH_FRAMES_REQUIRED: number = 15;

  constructor(
    private onAudioData: (data: Uint8Array) => void,
    private onInterrupt: () => void,
    private onEos: () => void,
    private sampleRate: number = 24000,
  ) {}

  public setAiSpeaking(active: boolean) {
    this.isAiSpeaking = active;
    if (active) {
      this.vadThreshold = this.BASE_THRESHOLD * 2.5;
      this.vadPauseTime = 1000;
    } else {
      this.vadThreshold = this.BASE_THRESHOLD;
      this.vadPauseTime = this.BASE_PAUSE_TIME;
    }
  }

  public setElasticMode(isUserThinking: boolean) {
    if (!this.isAiSpeaking) {
      this.vadPauseTime = isUserThinking ? 2800 : 1200;
    }
  }

  public async startMicrophone(): Promise<void> {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      if (!this.audioContext)
        this.audioContext = new AudioContext({ sampleRate: this.sampleRate });
      if (this.audioContext.state === "suspended")
        await this.audioContext.resume();

      const blob = new Blob([AUDIO_WORKLET_CODE], {
        type: "application/javascript",
      });
      const url = URL.createObjectURL(blob);
      await this.audioContext.audioWorklet.addModule(url);

      this.sourceNode = this.audioContext.createMediaStreamSource(
        this.mediaStream,
      );
      this.workletNode = new AudioWorkletNode(
        this.audioContext,
        "sentiric-audio-processor",
      );

      this.workletNode.port.onmessage = (event) => {
        const { pcmData, rms } = event.data;
        this.handleVadAndEmit(new Uint8Array(pcmData), rms);
      };

      this.sourceNode.connect(this.workletNode);
      Logger.info("MIC_STARTED", "Dynamic VAD Engine initialized.");
    } catch (err) {
      Logger.error("MIC_ERROR", "Microphone access failed", { error: err });
      throw err;
    }
  }

  private handleVadAndEmit(pcmBytes: Uint8Array, rms: number) {
    if (rms > this.vadThreshold) {
      this.lastSpkTime = Date.now();
      this.speechFramesCount++;

      if (
        !this.isSpeaking &&
        this.speechFramesCount >= this.SPEECH_FRAMES_REQUIRED
      ) {
        this.isSpeaking = true;
        Logger.info(
          "VAD_SPEECH_START",
          "Speech detected. Mode: " +
            (this.isAiSpeaking ? "Barge-in" : "Normal"),
        );
        if (this.isAiSpeaking) {
          this.flushPlayback();
        }
        this.onInterrupt();
      }
      this.onAudioData(pcmBytes);
    } else {
      this.speechFramesCount = 0;
      if (
        this.isSpeaking &&
        Date.now() - this.lastSpkTime > this.vadPauseTime
      ) {
        this.isSpeaking = false;
        Logger.info("VAD_SPEECH_STOP", "User silent. Sending EOS to server.");
        this.onEos();
      }
      if (this.isSpeaking) {
        this.onAudioData(pcmBytes);
      }
    }
  }

  public playChunk(pcmData: Uint8Array): void {
    if (!this.audioContext || pcmData.length === 0) return;
    try {
      // [MİMARİ DÜZELTME]: Memory Alignment. ArrayBuffer'ın Int16 için 2'nin katı olmasını garanti et.
      const validLength = pcmData.length - (pcmData.length % 2);
      if (validLength === 0) return;

      const alignedBuffer = new ArrayBuffer(validLength);
      const safeArray = new Uint8Array(alignedBuffer);
      safeArray.set(pcmData.subarray(0, validLength));

      const int16Buffer = new Int16Array(alignedBuffer);
      const float32Buffer = new Float32Array(int16Buffer.length);

      for (let i = 0; i < int16Buffer.length; i++) {
        float32Buffer[i] = int16Buffer[i] / 32768.0;
      }

      // [MİMARİ DÜZELTME]: Gapless Playback Priming Buffer
      if (!this.isPlaybackStarted) {
        this.primingBuffer.push(float32Buffer);
        const currentBufferedDuration = 
          this.primingBuffer.reduce((sum, arr) => sum + arr.length, 0) / this.sampleRate * 1000;

        if (currentBufferedDuration >= this.PRIMING_BUFFER_DURATION_MS) {
          this.isPlaybackStarted = true;
          this.flushPrimingBuffer();
        }
      } else {
        this.schedulePlayback(float32Buffer);
      }
    } catch (e) {
      console.warn("Playback error (Handled):", e);
    }
  }

  private flushPrimingBuffer(): void {
    if (this.primingBuffer.length === 0 || !this.audioContext) return;
    
    const totalLength = this.primingBuffer.reduce((sum, arr) => sum + arr.length, 0);
    const concatenated = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of this.primingBuffer) {
      concatenated.set(chunk, offset);
      offset += chunk.length;
    }
    
    // Event Loop'a nefes aldırmak ve jitter'ı engellemek için 50ms avans
    this.nextStartTime = this.audioContext.currentTime + 0.05;
    this.schedulePlayback(concatenated);
    this.primingBuffer = [];
  }

  private schedulePlayback(float32Buffer: Float32Array): void {
    if (!this.audioContext) return;
    
    const audioBuffer = this.audioContext.createBuffer(
      1,
      float32Buffer.length,
      this.sampleRate,
    );
    audioBuffer.getChannelData(0).set(float32Buffer);

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);

    const currentTime = this.audioContext.currentTime;
    if (this.nextStartTime < currentTime) this.nextStartTime = currentTime;

    source.start(this.nextStartTime);
    this.nextStartTime += audioBuffer.duration;

    this.activeSourceNodes.push(source);
    source.onended = () => {
      this.activeSourceNodes = this.activeSourceNodes.filter(
        (n) => n !== source,
      );
      if (this.activeSourceNodes.length === 0) {
        this.setAiSpeaking(false);
        this.isPlaybackStarted = false; // Bir sonraki cümle için Priming'i resetle
      }
    };
  }

  public flushPlayback(): void {
    this.activeSourceNodes.forEach((node) => {
      try {
        node.stop();
      } catch (e) {}
    });
    this.activeSourceNodes = [];
    this.primingBuffer = [];
    this.isPlaybackStarted = false;
    this.nextStartTime = this.audioContext ? this.audioContext.currentTime : 0;
    this.setAiSpeaking(false);
  }

  public stop(): void {
    this.flushPlayback();
    this.workletNode?.disconnect();
    this.sourceNode?.disconnect();
    this.mediaStream?.getTracks().forEach((track) => track.stop());
    this.audioContext?.close();
    this.audioContext = null;
    this.isSpeaking = false;
  }
}