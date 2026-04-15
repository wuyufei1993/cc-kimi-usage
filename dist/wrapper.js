import { spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
function getConfigDir() {
    return path.join(os.homedir(), '.claude');
}
function loadWrapperConfig() {
    const configPath = path.join(getConfigDir(), 'statusline-wrapper.json');
    if (!fs.existsSync(configPath)) {
        return { plugins: [] };
    }
    try {
        const raw = fs.readFileSync(configPath, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
            plugins: Array.isArray(parsed.plugins) ? parsed.plugins : [],
        };
    }
    catch {
        return { plugins: [] };
    }
}
async function readStdin() {
    return new Promise((resolve) => {
        if (process.stdin.isTTY) {
            resolve('');
            return;
        }
        let data = '';
        process.stdin.setEncoding('utf8');
        process.stdin.on('data', (chunk) => {
            data += chunk;
        });
        process.stdin.on('end', () => resolve(data));
        process.stdin.on('error', () => resolve(data));
        setTimeout(() => resolve(data), 300);
    });
}
async function runPlugin(pluginPath, stdinData) {
    return new Promise((resolve) => {
        const isNode = pluginPath.endsWith('.js') || pluginPath.endsWith('.ts');
        const cmd = isNode ? process.execPath : pluginPath;
        const args = isNode ? [pluginPath] : [];
        const child = spawn(cmd, args, {
            stdio: ['pipe', 'pipe', 'pipe'],
            windowsHide: true,
        });
        let stdout = '';
        let stderr = '';
        child.stdout.on('data', (chunk) => {
            stdout += chunk;
        });
        child.stderr.on('data', (chunk) => {
            stderr += chunk;
        });
        child.on('close', () => {
            const lines = stdout
                .split('\n')
                .map((l) => l.trimEnd())
                .filter((l) => l.length > 0);
            resolve(lines);
        });
        child.on('error', () => {
            resolve([]);
        });
        if (stdinData) {
            child.stdin.write(stdinData);
        }
        child.stdin.end();
    });
}
async function main() {
    const [stdinData] = await Promise.all([
        readStdin(),
    ]);
    const config = loadWrapperConfig();
    if (config.plugins.length === 0) {
        // Fallback: if no wrapper config, try to run only known plugins silently
        process.exit(0);
    }
    const results = await Promise.all(config.plugins.map((pluginPath) => runPlugin(pluginPath, stdinData)));
    for (const lines of results) {
        for (const line of lines) {
            console.log(line);
        }
    }
}
main().catch(() => {
    process.exit(0);
});
//# sourceMappingURL=wrapper.js.map