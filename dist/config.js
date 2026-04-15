import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
const DEFAULT_CONFIG = {
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
const KNOWN_COLOR_NAMES = new Set([
    'dim', 'red', 'green', 'yellow', 'magenta', 'cyan', 'brightBlue', 'brightMagenta',
]);
const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
function isColorName(value) {
    return typeof value === 'string' && KNOWN_COLOR_NAMES.has(value);
}
function validateColorValue(value) {
    if (isColorName(value))
        return value;
    if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 255)
        return value;
    if (typeof value === 'string' && HEX_COLOR_PATTERN.test(value))
        return value;
    return undefined;
}
function getConfigDir() {
    const home = os.homedir();
    return path.join(home, '.claude');
}
export function getConfigPath() {
    return path.join(getConfigDir(), 'kimi-usage-config.json');
}
export function getCachePath() {
    return path.join(getConfigDir(), 'kimi-usage-cache.json');
}
function readClaudeSettingsEnv() {
    const settingsPath = path.join(getConfigDir(), 'settings.json');
    if (!fs.existsSync(settingsPath)) {
        return {};
    }
    try {
        const raw = fs.readFileSync(settingsPath, 'utf-8');
        const parsed = JSON.parse(raw);
        const baseUrl = parsed.env?.ANTHROPIC_BASE_URL;
        const token = parsed.env?.ANTHROPIC_AUTH_TOKEN;
        const result = {};
        if (baseUrl === 'https://api.kimi.com/coding') {
            result.baseUrl = baseUrl;
            if (typeof token === 'string' && token.length > 0) {
                result.apiKey = token;
            }
        }
        return result;
    }
    catch {
        // ignore read/parse errors
    }
    return {};
}
export function loadConfig() {
    const configPath = getConfigPath();
    let userConfig = {};
    if (fs.existsSync(configPath)) {
        try {
            const raw = fs.readFileSync(configPath, 'utf-8');
            userConfig = JSON.parse(raw);
        }
        catch {
            // ignore parse errors, fall back to defaults
        }
    }
    const colors = {
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
//# sourceMappingURL=config.js.map