---
description: Configure cc-kimi-usage as your statusline
allowed-tools: Bash, Read, Edit, AskUserQuestion
---

**Note**: Placeholders like `{RUNTIME_PATH}`, `{SOURCE}`, and `{GENERATED_COMMAND}` should be substituted with actual detected values.

## Step 1: Detect Platform, Shell, and Runtime

**IMPORTANT**: Use the environment context values (`Platform:` and `Shell:`), not `uname -s` or ad-hoc checks. The Bash tool may report MINGW/MSYS on Windows, so branch only by the context values.

| Platform | Shell | Command Format |
|----------|-------|----------------|
| `darwin` | any | bash (macOS instructions) |
| `linux` | any | bash (Linux instructions) |
| `win32` | `bash` (Git Bash, MSYS2) | bash - use macOS/Linux instructions. Never use PowerShell commands with bash. |
| `win32` | `powershell`, `pwsh`, or `cmd` | PowerShell (use Windows + PowerShell instructions) |

---

**macOS/Linux** (Platform: `darwin` or `linux`):

1. Get plugin path (sorted by dotted numeric version, not modification time):
   ```bash
   ls -d "${CLAUDE_CONFIG_DIR:-$HOME/.claude}"/plugins/cache/cc-kimi-usage/cc-kimi-usage/*/ 2>/dev/null | awk -F/ '{ print $(NF-1) "\t" $(0) }' | sort -t. -k1,1n -k2,2n -k3,3n -k4,4n | tail -1 | cut -f2-
   ```
   If empty, the plugin is not installed. Ask the user to install via `/plugin install cc-kimi-usage` first.

2. Get runtime absolute path:
   - On `darwin` or `linux`:
     ```bash
     command -v node 2>/dev/null
     ```
   - On `win32` + `bash`:
     ```bash
     command -v node 2>/dev/null
     ```

   If empty, stop setup and explain that the current shell cannot find `node`.
   - On **Windows + Git Bash/MSYS2**, explicitly explain that the current Git Bash session could not find `node`, even if Claude Code itself is installed.
   - If `winget` is available, recommend:
     ```bash
     winget install OpenJS.NodeJS.LTS
     ```
   - Otherwise ask the user to install Node.js LTS from https://nodejs.org/.
   - After installation, ask the user to restart their shell and re-run `/cc-kimi-usage:setup`.

3. Verify the runtime exists:
   ```bash
   ls -la {RUNTIME_PATH}
   ```
   If it doesn't exist, re-detect or ask user to verify their installation.

4. Determine source file: `dist/index.js` (cc-kimi-usage is pre-compiled for Node.js).

5. Generate command (quotes around runtime path handle spaces):
   ```
   bash -c 'plugin_dir=$(ls -d "${CLAUDE_CONFIG_DIR:-$HOME/.claude}"/plugins/cache/cc-kimi-usage/cc-kimi-usage/*/ 2>/dev/null | awk -F/ '"'"'{ print $(NF-1) "\t" $(0) }'"'"' | sort -t. -k1,1n -k2,2n -k3,3n -k4,4n | tail -1 | cut -f2-); exec "{RUNTIME_PATH}" "${plugin_dir}{SOURCE}"'
   ```

**Windows + Git Bash** (Platform: `win32`, Shell: `bash`):

Use the macOS/Linux bash command format above. Do not use PowerShell commands when the shell is bash. Claude Code invokes statusLine commands through bash, which will interpret PowerShell variables like `$env` and `$p` before PowerShell ever sees them.

**Windows + PowerShell** (Platform: `win32`, Shell: `powershell`, `pwsh`, or `cmd`):

1. Get plugin path:
   ```powershell
   $claudeDir = if ($env:CLAUDE_CONFIG_DIR) { $env:CLAUDE_CONFIG_DIR } else { Join-Path $HOME ".claude" }
   (Get-ChildItem (Join-Path $claudeDir "plugins\cache\cc-kimi-usage\cc-kimi-usage") -Directory | Where-Object { $_.Name -match '^\d+(\.\d+)+$' } | Sort-Object { [version]$_.Name } -Descending | Select-Object -First 1).FullName
   ```
   If empty or errors, the plugin is not installed. Ask the user to install via marketplace first.

2. Get runtime absolute path:
   ```powershell
   if (Get-Command node -ErrorAction SilentlyContinue) { (Get-Command node).Source } else { Write-Error "node not found" }
   ```

   If not found, stop setup and explain that the current PowerShell session cannot find `node`.
   - If `winget` is available, recommend:
     ```powershell
     winget install OpenJS.NodeJS.LTS
     ```
   - Otherwise ask the user to install Node.js LTS, then restart PowerShell and re-run `/cc-kimi-usage:setup`.

3. Determine source file: `dist\index.js`.

4. Generate command (note: quotes around runtime path handle spaces in paths):
   ```
   powershell -Command "& {$claudeDir=if ($env:CLAUDE_CONFIG_DIR) { $env:CLAUDE_CONFIG_DIR } else { Join-Path $HOME '.claude' }; $p=(Get-ChildItem (Join-Path $claudeDir 'plugins\cache\cc-kimi-usage\cc-kimi-usage') -Directory | Where-Object { $_.Name -match '^\d+(\.\d+)+$' } | Sort-Object { [version]$_.Name } -Descending | Select-Object -First 1).FullName; & '{RUNTIME_PATH}' (Join-Path $p '{SOURCE}')}" 
   ```

## Step 2: Test Command

Run the generated command. It should produce output (the Kimi usage lines) within a few seconds.

- If it errors, do not proceed to Step 3.
- If it hangs for more than a few seconds, cancel and debug.

## Step 3: Apply Configuration

Read the settings file and merge in the statusLine config, preserving all existing settings:
- **Platform `darwin` or `linux`, or Platform `win32` + Shell `bash`**: `${CLAUDE_CONFIG_DIR:-$HOME/.claude}/settings.json`
- **Platform `win32` + Shell `powershell`, `pwsh`, or `cmd`**: `settings.json` inside `$env:CLAUDE_CONFIG_DIR` when set, otherwise `Join-Path $HOME ".claude"`

If the file doesn't exist, create it. If it contains invalid JSON, report the error and do not overwrite.
If a write fails with `File has been unexpectedly modified`, re-read the file and retry the merge once.

**Detect existing claude-hud configuration**:
- If `settings.json` already has `statusLine.command` and the command contains `claude-hud` but does NOT already contain `cc-kimi-usage`, prepend the existing command with ` && ` separator:
  ```
  {EXISTING_COMMAND} && {GENERATED_COMMAND}
  ```
- If `settings.json` already has `statusLine.command` and it already contains `cc-kimi-usage`, do not modify it (setup already ran).
- Otherwise, set `statusLine.command` to `{GENERATED_COMMAND}`.
- **Double quotation mark escape**

Backup config file `settings.json`, write the merged config:

```json
{
  "statusLine": {
    "type": "command",
    "command": "{FINAL_COMMAND}"
  }
}
```

**JSON safety**: Write `settings.json` with a real JSON serializer or editor API, not manual string concatenation.
If you must inspect the saved JSON manually, the embedded bash command must preserve escaped backslashes inside the awk fragment.
For example, the saved JSON should contain `\\$(NF-1)` and `\\$0`, not `\$(NF-1)` and `\$0`.

After successfully writing the config, tell the user:

> Config written. **Please restart Claude Code now** — quit and run `claude` again in your terminal.
> Once restarted, run `/cc-kimi-usage:setup` again to verify the statusline is working.

**Windows note**: Keep the restart guidance separate from runtime installation guidance.
- If the user just installed Node.js, they should restart their shell first so `node` is available in `PATH`.
- After `statusLine` is written successfully, they should fully quit Claude Code and launch a fresh session before judging whether the setup worked.

**Note**: The generated command dynamically finds and runs the latest installed plugin version. Updates are automatic - no need to re-run setup after plugin updates. If the statusline suddenly stops working, re-run `/cc-kimi-usage:setup` to verify the plugin is still installed.

## Step 4: Verify & Finish

**First, confirm the user has restarted Claude Code** since Step 3 wrote the config. If they haven't, ask them to restart before proceeding — the statusline cannot appear in the same session where setup was run.

Use AskUserQuestion:
- Question: "Setup complete! The Kimi usage display should appear below your input field. Is it working?"
- Options: "Yes, it's working" / "No, something's wrong"

**If yes**: Done.

**If no**: Debug systematically:

1. **Restart Claude Code** (most common cause on macOS):
    - The statusLine config requires a restart to take effect
    - Quit Claude Code completely and run `claude` again, then re-run `/cc-kimi-usage:setup` to verify
    - If you've already restarted, continue below

2. **Verify config was applied**:
   - Read settings file (`${CLAUDE_CONFIG_DIR:-$HOME/.claude}/settings.json` on bash, or `settings.json` inside `$env:CLAUDE_CONFIG_DIR` when set, otherwise `Join-Path $HOME ".claude"` on PowerShell)
   - Check `statusLine.command` exists and looks correct
   - If the command is stale, re-run setup

3. **Test the command manually** and capture error output:
   ```bash
   {GENERATED_COMMAND} 2>&1
   ```

4. **Common issues to check**:

   **"command not found" or empty output**:
   - Runtime path might be wrong: `ls -la {RUNTIME_PATH}`
   - On macOS with mise/nvm/asdf: the absolute path may have changed after a runtime update
   - Symlinks may be stale: `command -v node` often returns a symlink that can break after version updates
   - Solution: re-detect with `command -v node`, and verify with `realpath {RUNTIME_PATH}` (or `readlink -f {RUNTIME_PATH}`) to get the true absolute path

   **"No such file or directory" for plugin**:
   - Plugin might not be installed: `ls "${CLAUDE_CONFIG_DIR:-$HOME/.claude}/plugins/cache/cc-kimi-usage/"`
   - Solution: reinstall plugin via marketplace

   **Windows shell mismatch (for example, "bash not recognized")**:
   - Command format does not match `Platform:` + `Shell:`
   - Solution: re-run Step 1 branch logic and use the matching variant

   **Windows: PowerShell execution policy error**:
   - Run: `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`

   **Permission denied**:
   - Runtime not executable: `chmod +x {RUNTIME_PATH}`

5. **If still stuck**: Show the user the exact command that was generated and the error, so they can report it or debug further.
