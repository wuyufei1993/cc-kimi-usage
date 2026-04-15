export type ColorName = 'dim' | 'red' | 'green' | 'yellow' | 'magenta' | 'cyan' | 'brightBlue' | 'brightMagenta';
/** A color value: named preset, 256-color index (0-255), or hex string (#rrggbb). */
export type ColorValue = ColorName | number | string;
export interface ColorOverrides {
    usage: ColorValue;
    usageWarning: ColorValue;
    critical: ColorValue;
    label: ColorValue;
}
export interface KimiUsageDetail {
    limit: string;
    remaining: string;
    resetTime?: string;
}
export interface KimiWindowLimit {
    window: {
        duration: number;
        timeUnit: string;
    };
    detail: KimiUsageDetail;
}
export interface KimiUsageResponse {
    usage?: KimiUsageDetail;
    limits?: KimiWindowLimit[];
}
export interface UsageData {
    percent: number;
    remaining: number;
    limit: number;
    resetAt: Date | null;
    windowLabel: string;
}
export interface CachedData {
    fetchedAt: number;
    usages: UsageData[];
    error?: string;
}
