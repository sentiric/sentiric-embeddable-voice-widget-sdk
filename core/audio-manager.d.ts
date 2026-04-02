export declare class SentiricAudioManager {
    private onAudioData;
    private sampleRate;
    private audioContext;
    private mediaStream;
    private workletNode;
    private sourceNode;
    private nextStartTime;
    constructor(onAudioData: (data: Uint8Array) => void, sampleRate?: number);
    /**
     * Mikrofonu başlatır.
     */
    startMicrophone(): Promise<void>;
    /**
     * Gateway'den gelen ham ses (PCM) parçalarını hoparlörde çalar.
     */
    playChunk(pcmData: Uint8Array): void;
    stop(): void;
}
