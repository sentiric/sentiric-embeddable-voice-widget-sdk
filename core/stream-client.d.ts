export interface StreamClientOptions {
    gatewayUrl: string;
    tenantId: string;
    traceId?: string;
    sessionId?: string;
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
    private isIntentionallyStopped;
    private retryCount;
    private readonly maxRetries;
    readonly traceId: string;
    readonly sessionId: string;
    constructor(options: StreamClientOptions);
    start(): Promise<void>;
    injectExternalAudio(pcm16Data: Int16Array, rmsOverride?: number): void;
    private initProtobuf;
    /**
     * Exponential Backoff ile ağ bağlantısını kurar ve korur.
     */
    private connect;
    private sendSessionConfig;
    private sendInterruptSignal;
    private sendAudio;
    private handleMessage;
    stop(): void;
}
