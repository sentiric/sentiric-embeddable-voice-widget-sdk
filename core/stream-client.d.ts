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
    /**
     * AI Asistanı Başlatır: Bağlantı kurar ve mikrofonu açar.
     */
    start(): Promise<void>;
    private initProtobuf;
    private connect;
    private sendSessionConfig;
    sendAudio(chunk: Uint8Array): void;
    private handleMessage;
    stop(): void;
}
