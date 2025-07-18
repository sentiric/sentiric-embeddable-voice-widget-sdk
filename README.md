# Sentiric Embeddable Voice Widget SDK

**Description:** A JavaScript widget/SDK designed for easy integration into websites or mobile applications, providing Sentiric's voice interaction capabilities directly to end-users.

**Core Responsibilities:**
*   Enabling microphone and speaker access from the browser/app (using WebRTC).
*   Sending audio to `sentiric-stt-service` and playing back audio from `sentiric-tts-service`.
*   Providing a basic user interface (e.g., record/stop button, status indicator).
*   Exposing a developer-friendly API for easy integration into host applications.

**Technologies:**
*   JavaScript/TypeScript
*   WebRTC (for real-time audio streaming)
*   Bundling tools (e.g., Webpack, Rollup) for SDK distribution.

**API Interactions (As an API Client):**
*   Consumes APIs provided by `sentiric-api-gateway-service` (for STT/TTS and Agent Service APIs).
*   Communicates with `sentiric-sip-server` via `sentiric-sip-client-sdk` for WebRTC-based SIP/voice streams.

**Local Development:**
1.  Clone this repository: `git clone https://github.com/sentiric/sentiric-embeddable-voice-widget-sdk.git`
2.  Navigate into the directory: `cd sentiric-embeddable-voice-widget-sdk`
3.  Install dependencies: `npm install`
4.  Create a `.env` file from `.env.example` to configure the API Gateway URL.
5.  Run the build process: `npm run build` (or `npm run dev` for development).

**Configuration:**
Refer to `config/` or `src/` directories and `.env.example` for SDK-specific configurations, including API endpoint URLs.

**Deployment:**
This SDK is typically built as a JavaScript bundle and served via a CDN or hosted directly within client applications.

**Contributing:**
We welcome contributions! Please refer to the [Sentiric Governance](https://github.com/sentiric/sentiric-governance) repository for coding standards and contribution guidelines.

**License:**
This project is licensed under the [License](LICENSE).
