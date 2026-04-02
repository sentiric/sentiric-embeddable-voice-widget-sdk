export declare class SentiricAudioManager {
    private onAudioData;
    private onInterrupt;
    private sampleRate;
    private audioContext;
    private mediaStream;
    private workletNode;
    private sourceNode;
    private nextStartTime;
    private activeSourceNodes;
    vadThreshold: number;
    vadPauseTime: number;
    private isSpeaking;
    private lastSpkTime;
    constructor(onAudioData: (data: Uint8Array) => void, onInterrupt: () => void, sampleRate?: number);
    /**
     * Mikrofonu başlatır ve VAD döngüsünü kurar.
     */
    startMicrophone(): Promise<void>;
    /**
     * VAD Mantığı (Sessizlikte ağa paket atılmaz, Söz kesmede Interrupt fırlatılır)
     */
    private handleVadAndEmit;
    /**
     * Mobile/WebView ortamları için dışarıdan PCM16 byte dizisi enjekte etme arayüzü.
     * Native katmanda mikrofon izni alınıp bu metod çağrılabilir.
     */
    injectExternalAudio(pcm16Data: Int16Array, rmsOverride?: number): void;
    /**
     * Gateway'den gelen ham ses (PCM) parçalarını hoparlörde çalar. (Jitter Buffer)
     */
    playChunk(pcmData: Uint8Array): void;
    /**
     * Zero-Latency Barge-in: Çalmakta olan ve sıradaki tüm AI ses tamponlarını boşaltır.
     */
    flushPlayback(): void;
    stop(): void;
}
