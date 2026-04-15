import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import type { ColorOverrides, ColorName, ColorValue } from './types.js';

export interface PluginConfig {
  apiKey: string;
  baseUrl: string;
  cacheTtlMs: number;
  usageThreshold: number;
  colors: ColorOverrides;
}

const DEFAULT_CONFIG: PluginConfig = {
  apiKey: '',
  baseUrl: 'https://api.kimi.com',
  cacheTtlMs: 60_000, // 1 minute
  usageThreshold: 0,
  colors: {
    usage: 'brightBlue',
    usageWarning: 'brightMagenta',
    critical: 'red',
    label: 'dim',
  },
};

const KNOWN_COLOR_NAMES: Set<ColorName> = new Set([
  'dim', 'red', 'green', 'yellow', 'magenta', 'cyan', 'brightBlue', 'brightMagenta',
]);

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

function isColorName(value: unknown): value is ColorName {
  return typeof value === 'string' && KNOWN_COLOR_NAMES.has(value as ColorName);
}

function validateColorValue(value: unknown): ColorValue | undefined {
  if (isColorName(value)) return value;
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 255) return value;
  if (typeof value === 'string' && HEX_COLOR_PATTERN.test(value)) return value;
  return undefined;
}

function getConfigDir(): string {
  const home = os.homedir();
  return path.join(home, '.claude');
}

export function getConfigPath(): string {
  return path.join(getConfigDir(), 'kimi-usage-config.json');
}

export function getCachePath(): string {
  return path.join(getConfigDir(), 'kimi-usage-cache.json');
}

function readClaudeSettingsEnv(): { apiKey?: string; baseUrl?: string } {
  const settingsPath = path.join(getConfigDir(), 'settings.json');
  if (!fs.existsSync(settingsPath)) {
    return {};
  }
  try {
    const raw = fs.readFileSync(settingsPath, 'utf-8');
    const parsed = JSON.parse(raw) as {
      env?: Record<string, string>;
    };

    const baseUrl = parsed.env?.ANTHROPIC_BASE_URL;
    const token = parsed.env?.ANTHROPIC_AUTH_TOKEN;

    const result: { apiKey?: string; baseUrl?: string } = {};
    if (baseUrl === 'https://api.kimi.com/coding') {
      result.baseUrl = baseUrl;
      if (typeof token === 'string' && token.length > 0) {
        result.apiKey = token;
      }
    }
    return result;
  } catch {
    // ignore read/parse errors
  }
  return {};
}

export function loadConfig(): PluginConfig {
  const configPath = getConfigPath();

  let userConfig: Partial<PluginConfig> = {};
  if (fs.existsSync(configPath)) {
    try {
      const raw = fs.readFileSync(configPath, 'utf-8');
      userConfig = JSON.parse(raw) as Partial<PluginConfig>;
    } catch {
      // ignore parse errors, fall back to defaults
    }
  }

  const colors: ColorOverrides = {
    usage: validateColorValue(userConfig.colors?.usage) ?? DEFAULT_CONFIG.colors.usage,
    usageWarning: validateColorValue(userConfig.colors?.usageWarning) ?? DEFAULT_CONFIG.colors.usageWarning,
    critical: validateColorValue(userConfig.colors?.critical) ?? DEFAULT_CONFIG.colors.critical,
    label: validateColorValue(userConfig.colors?.label) ?? DEFAULT_CONFIG.colors.label,
  };

  const inferred = readClaudeSettingsEnv();
  const apiKey = inferred.apiKey ?? DEFAULT_CONFIG.apiKey;
  const baseUrl = inferred.baseUrl ?? DEFAULT_CONFIG.baseUrl;

  return {
    apiKey,
    baseUrl,
    cacheTtlMs: typeof userConfig.cacheTtlMs === 'number' ? userConfig.cacheTtlMs : DEFAULT_CONFIG.cacheTtlMs,
    usageThreshold: typeof userConfig.usageThreshold === 'number' ? userConfig.usageThreshold : DEFAULT_CONFIG.usageThreshold,
    colors,
  };
}
