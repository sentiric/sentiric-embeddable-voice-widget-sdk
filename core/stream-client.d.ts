export interface StreamClientOptions {
    gatewayUrl: string;
    tenantId: string;
    token?: string;
    language?: string;
    sampleRate?: number;
    edgeMode?: boolean;
    onAudioReceived?: (chunk: Uint8Array) => void;
    onError?: (error: any) => void;
    onClose?: () => void;
}
export declare class SentiricStreamClient {
    private ws;
    private options;
    private isReady;
    private audioManager;
    private RequestType;
    private ResponseType;
    constructor(options: StreamClientOptions);
    start(): Promise<void>;
    /**
     * Dışarıdan ses basmak (Mobil WebView / React Native / Flutter Bridge için)
     */
    injectExternalAudio(pcm16Data: Int16Array, rmsOverride?: number): void;
    private initProtobuf;
    private connect;
    private sendSessionConfig;
    /**
     * Sunucuya donanımsal söz kesme (Barge-in) sinyali atar.
     */
    private sendInterruptSignal;
    private sendAudio;
    private handleMessage;
    stop(): void;
}
