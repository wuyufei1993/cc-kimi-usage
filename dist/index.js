import { fetchKimiUsage } from './api.js';
import { renderLines } from './render.js';
import { loadConfig } from './config.js';
async function main() {
    // Drain stdin so Claude Code doesn't block the pipe.
    // We don't need the stdin JSON for this plugin.
    await new Promise((resolve) => {
        if (process.stdin.isTTY) {
            resolve();
            return;
        }
        process.stdin.on('data', () => { });
        process.stdin.on('end', resolve);
        process.stdin.on('error', resolve);
        // Timeout fallback in case stdin hangs
        setTimeout(resolve, 200);
    });
    const config = loadConfig();
    const cached = await fetchKimiUsage();
    const lines = renderLines(cached.usages, cached.error, config.colors);
    for (const line of lines) {
        console.log(line);
    }
}
main().catch((err) => {
    if (process.env.DEBUG?.includes('kimi-usage') || process.env.DEBUG === '*') {
        console.error('[kimi-usage] Error:', err instanceof Error ? err.message : String(err));
    }
    process.exit(0);
});
//# sourceMappingURL=index.js.map