import type { ColorOverrides } from './types.js';
export interface PluginConfig {
    apiKey: string;
    baseUrl: string;
    cacheTtlMs: number;
    usageThreshold: number;
    colors: ColorOverrides;
}
export declare function getConfigPath(): string;
export declare function getCachePath(): string;
export declare function loadConfig(): PluginConfig;
