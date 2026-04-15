import type { UsageData, ColorOverrides } from './types.js';
export declare function quotaBar(percent: number, width?: number, colors?: Partial<ColorOverrides>): string;
export declare function renderUsageLine(data: UsageData, barWidth?: number, colors?: Partial<ColorOverrides>): string;
export declare function renderLines(usages: UsageData[], error?: string, colors?: Partial<ColorOverrides>): string[];
