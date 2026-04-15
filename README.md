# cc-kimi-usage

Claude Code 状态栏插件，用于显示 Kimi code 订阅套餐配额使用情况。

## 效果预览

```
██░░░░░░░░ 20% (5h) (resets in 3h)|████████░░ 80% (Total) (resets in 2h 30m)
```

达到 100% 时显示红色警告：
```
Kimi ⚠ Limit reached (resets in 45m)
```

## 安装

### 1. 编译插件

```bash
npm ci
npm run build
```

#### 2. 自定义颜色（不配置使用默认颜色）
创建配置文件 `~/.claude/kimi-usage-config.json`：

```json
{
  "cacheTtlMs": 60000,
  "usageThreshold": 0,
  "colors": {
    "usage": "brightBlue",
    "usageWarning": "brightMagenta",
    "critical": "red",
    "label": "dim"
  }
}
```

参数说明：
- `cacheTtlMs`：缓存时间，默认 60 秒（避免频繁调用 API）
- `usageThreshold`：使用率低于此值时不显示，默认 0
- `colors`：自定义颜色（可选）

`colors` 支持以下字段：

| 字段 | 说明 | 默认值 |
|---|---|---|
| `usage` | 正常使用率颜色（< 75%） | `brightBlue` |
| `usageWarning` | 高使用率颜色（75% - 89%） | `brightMagenta` |
| `critical` | 临界/限额用尽颜色（≥ 90% 和 100% 警告） | `red` |
| `label` | "Kimi" 标签颜色 | `dim` |

颜色值支持三种格式：

1. **预设名称**：`dim`, `red`, `green`, `yellow`, `magenta`, `cyan`, `brightBlue`, `brightMagenta`
2. **256 色索引**：`208`（0-255 的整数）
3. **十六进制色值**：`"#ff9d00"`

### 3. 配置 Claude Code settings.json

编辑 `~/.claude/settings.json`（Windows 路径为 `C:\Users\用户名\.claude\settings.json`），添加 `statusLine` 配置：

```json
{
  "statusLine": {
    "type": "command",
    "command": "node cc-kimi-usage/dist/index.js"
  }
}
```

**注意：**
- `type` 必须是 `"command"`
- `command` 是完整的可执行命令字符串
- 路径必须是**绝对路径**
- Windows 下 JSON 中反斜杠需要转义，建议直接用正斜杠：`"node \"D:/cc-kimi-usage/dist/index.js\""`

### 4. 手动测试命令

在终端中直接运行一次，确认插件有输出：

```bash
# Windows
node "D:/cc-kimi-usage/dist/index.js"

# 或模拟 stdin 管道（更接近 statusline 实际运行方式）
echo "" | node "D:/cc-kimi-usage/dist/index.js"
```

如果没有输出，检查 Node.js 版本是否 ≥ 18（需要内置 `fetch`）。

### 5. 重启 Claude Code

**必须完全退出并重新启动 Claude Code**，`statusLine` 配置修改后不会热生效。

---

## 常见排查

### 状态栏完全空白，没有任何 Kimi 相关输出

1. **检查 `settings.json` 格式**：最常见错误是用了 `"type": "node"` 或 `"path": ...`。正确格式是 `"type": "command"` + `"command": ...`。
2. **检查命令能否手动运行**：直接复制 `command` 里的内容到终端执行，看是否有输出。
3. **检查是否重启了 Claude Code**：`statusLine` 只在启动时读取配置。
4. **检查 usageThreshold**：如果当前使用率低于 `usageThreshold`（默认 0 不会隐藏），插件会主动不显示任何内容。
5. **Windows 路径问题**：确保 `command` 中的路径是绝对路径，且 JSON 转义正确。

### 有输出但显示 API 错误

1. 检查 `~/.claude/settings.json` 中的kimi Code订阅套餐秘钥是否配置正确
2. 检查网络能否访问 `https://api.kimi.com`
3. 查看缓存文件 `~/.claude/kimi-usage-cache.json` 是否包含旧错误

---

## 文件结构

```
cc-kimi-usage/
├── .claude-plugin/
│   └── plugin.json       # 插件清单
├── src/
│   ├── index.ts          # 入口
│   ├── api.ts            # 调用 Kimi API + 本地缓存
│   ├── render.ts         # ANSI 彩色进度条渲染
│   ├── config.ts         # 配置读取 + 颜色验证
│   └── types.ts          # 类型定义
├── dist/                 # 编译输出
├── package.json
├── tsconfig.json
└── README.md
```

## 开发

```bash
npm run dev    # tsc --watch
```

## License

MIT
