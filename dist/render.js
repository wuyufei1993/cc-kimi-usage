const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const MAGENTA = '\x1b[35m';
const CYAN = '\x1b[36m';
const BRIGHT_BLUE = '\x1b[94m';
const BRIGHT_MAGENTA = '\x1b[95m';
const ANSI_BY_NAME = {
    dim: DIM,
    red: RED,
    green: GREEN,
    yellow: YELLOW,
    magenta: MAGENTA,
    cyan: CYAN,
    brightBlue: BRIGHT_BLUE,
    brightMagenta: BRIGHT_MAGENTA,
};
function hexToAnsi(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `\x1b[38;2;${r};${g};${b}m`;
}
function resolveAnsi(value, fallback) {
    if (value === undefined || value === null) {
        return fallback;
    }
    if (typeof value === 'number') {
        return `\x1b[38;5;${value}m`;
    }
    if (typeof value === 'string' && value.startsWith('#') && value.length === 7) {
        return hexToAnsi(value);
    }
    return ANSI_BY_NAME[value] ?? fallback;
}
function withOverride(text, value, fallback) {
    return `${resolveAnsi(value, fallback)}${text}${RESET}`;
}
function getQuotaColor(percent, colors) {
    if (percent >= 90)
        return resolveAnsi(colors?.critical, RED);
    if (percent >= 75)
        return resolveAnsi(colors?.usageWarning, BRIGHT_MAGENTA);
    return resolveAnsi(colors?.usage, BRIGHT_BLUE);
}
export function quotaBar(percent, width = 10, colors) {
    const safeWidth = Number.isFinite(width) ? Math.max(0, Math.round(width)) : 0;
    const safePercent = Number.isFinite(percent) ? Math.min(100, Math.max(0, percent)) : 0;
    const filled = Math.round((safePercent / 100) * safeWidth);
    const empty = safeWidth - filled;
    const color = getQuotaColor(safePercent, colors);
    return `${color}${'█'.repeat(filled)}${DIM}${'░'.repeat(empty)}${RESET}`;
}
function label(text, colors) {
    return withOverride(text, colors?.label, DIM);
}
function critical(text, colors) {
    return withOverride(text, colors?.critical, RED);
}
function formatResetTime(resetAt) {
    if (!resetAt)
        return '';
    const now = new Date();
    const diffMs = resetAt.getTime() - now.getTime();
    if (diffMs <= 0)
        return '';
    const diffMins = Math.ceil(diffMs / 60000);
    if (diffMins < 60)
        return `${diffMins}m`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    if (hours >= 24) {
        const days = Math.floor(hours / 24);
        const remHours = hours % 24;
        if (remHours > 0)
            return `${days}d ${remHours}h`;
        return `${days}d`;
    }
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}
export function renderUsageLine(data, barWidth = 10, colors) {
    const bar = quotaBar(data.percent, barWidth, colors);
    const color = getQuotaColor(data.percent, colors);
    const reset = formatResetTime(data.resetAt);
    const resetText = reset ? ` (resets in ${reset})` : '';
    if (data.percent >= 100) {
        return `${critical(`⚠ Limit reached${resetText}`, colors)}`;
    }
    const usageDisplay = `${color}${data.percent}%${RESET}`;
    const body = reset
        ? `${bar} ${usageDisplay} (${data.windowLabel})${resetText}`
        : `${bar} ${usageDisplay} (${data.windowLabel})`;
    return body;
}
export function renderLines(usages, error, colors) {
    if (error) {
        return [`${critical(`⚠ ${error}`, colors)}`];
    }
    if (usages.length === 0) {
        return [];
    }
    const threshold = 0; // could be read from config later
    const filtered = usages.filter((u) => u.percent >= threshold);
    if (filtered.length === 0) {
        return [];
    }
    // Sort: put time-window limits first, "Total" last so shorter windows appear first
    filtered.sort((a, b) => {
        if (a.windowLabel === 'Total')
            return 1;
        if (b.windowLabel === 'Total')
            return -1;
        return 0;
    });
    const parts = filtered.map((u) => renderUsageLine(u, 10, colors));
    return [parts.join(' │ ')];
}
//# sourceMappingURL=render.js.map