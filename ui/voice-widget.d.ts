export declare class SentiricVoiceWidget extends HTMLElement {
    private client;
    private isActive;
    private shadow;
    constructor();
    static get observedAttributes(): string[];
    connectedCallback(): void;
    private toggleConversation;
    private start;
    private stop;
    private updateUI;
    private render;
}
