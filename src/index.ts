/**
 * Sentiric Embeddable Voice Widget SDK
 * Entry Point
 */

import './ui/voice-widget'; // Widget'ı otomatik kaydeder
export { SentiricStreamClient } from './core/stream-client';
export type { StreamClientOptions } from './core/stream-client';

console.log('🌊 Sentiric Voice SDK Initialized');