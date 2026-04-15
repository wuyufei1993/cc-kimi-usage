import * as fs from 'node:fs';
import type { KimiUsageResponse, UsageData, CachedData } from './types.js';
import { loadConfig, getCachePath, type PluginConfig } from './config.js';

function getUsageEndpoint(baseUrl: string): string {
  return baseUrl.endsWith('/coding') ? '/v1/usages' : '/coding/v1/usages';
}

function parseStringNumber(value: string | undefined): number {
  if (!value) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatWindowLabel(duration: number, timeUnit: string): string {
  if (timeUnit === 'TIME_UNIT_MINUTE') {
    if (duration >= 60 && duration % 60 === 0) {
      const hours = duration / 60;
      return hours === 24 ? '1d' : `${hours}h`;
    }
    return `${duration}m`;
  }
  if (timeUnit === 'TIME_UNIT_HOUR') {
    return duration === 24 ? '1d' : `${duration}h`;
  }
  if (timeUnit === 'TIME_UNIT_DAY') {
    return `${duration}d`;
  }
  return `${duration}`;
}

function transformResponse(data: KimiUsageResponse): UsageData[] {
  const usages: UsageData[] = [];

  if (data.usage) {
    const limit = parseStringNumber(data.usage.limit);
    const remaining = parseStringNumber(data.usage.remaining);
    const used = Math.max(0, limit - remaining);
    usages.push({
      percent: limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0,
      remaining,
      limit,
      resetAt: data.usage.resetTime ? new Date(data.usage.resetTime) : null,
      windowLabel: 'Total',
    });
  }

  if (Array.isArray(data.limits)) {
    for (const item of data.limits) {
      const detail = item.detail;
      const limit = parseStringNumber(detail.limit);
      const remaining = parseStringNumber(detail.remaining);
      const used = Math.max(0, limit - remaining);
      usages.push({
        percent: limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0,
        remaining,
        limit,
        resetAt: detail.resetTime ? new Date(detail.resetTime) : null,
        windowLabel: formatWindowLabel(item.window.duration, item.window.timeUnit),
      });
    }
  }

  return usages;
}

function reviveCacheDates(data: CachedData): CachedData {
  for (const usage of data.usages) {
    if (usage.resetAt && typeof usage.resetAt === 'string') {
      usage.resetAt = new Date(usage.resetAt);
    }
  }
  return data;
}

function readCache(): CachedData | null {
  const cachePath = getCachePath();
  if (!fs.existsSync(cachePath)) return null;
  try {
    const raw = fs.readFileSync(cachePath, 'utf-8');
    const parsed = JSON.parse(raw) as CachedData;
    return reviveCacheDates(parsed);
  } catch {
    return null;
  }
}

function writeCache(usages: UsageData[], error?: string): void {
  const cachePath = getCachePath();
  const data: CachedData = {
    fetchedAt: Date.now(),
    usages,
    error,
  };
  try {
    fs.writeFileSync(cachePath, JSON.stringify(data), 'utf-8');
  } catch {
    // ignore write errors
  }
}

async function doFetch(config: PluginConfig): Promise<void> {
  try {
    const res = await fetch(`${config.baseUrl}${getUsageEndpoint(config.baseUrl)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const err = `Kimi API error ${res.status}: ${text || res.statusText}`;
      writeCache([], err);
      return;
    }

    const json = (await res.json()) as KimiUsageResponse;
    const usages = transformResponse(json);
    writeCache(usages);
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    writeCache([], err);
  }
}

export async function fetchKimiUsage(): Promise<CachedData> {
  const config = loadConfig();

  if (!config.apiKey) {
    const cached = readCache();
    if (cached) return cached;
    return { fetchedAt: 0, usages: [], error: 'Missing KIMI_API_KEY in Claude Code settings (~/.claude/settings.json)' };
  }

  const cached = readCache();
  const now = Date.now();
  const cacheExpired = !cached || now - cached.fetchedAt >= config.cacheTtlMs;

  // 1. 缓存有效（未过期且无错误）：直接返回
  if (cached && !cacheExpired && !cached.error) {
    return cached;
  }

  // 2. 缓存存在但已过期（或包含错误）：立即返回旧数据，后台非阻塞刷新
  if (cached) {
    if (cacheExpired) {
      doFetch(config); // 不 await，Node.js 会保持进程存活直到完成
    }
    return cached;
  }

  // 3. 没有缓存：阻塞获取，保证首次有数据
  await doFetch(config);
  const fresh = readCache();
  return fresh ?? { fetchedAt: 0, usages: [], error: 'Unknown error' };
}
