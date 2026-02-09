# pi-pkm-mode-extension

Personal knowledge management mode for **pi**.

## Features

- `/pkm` toggle
- `/pkm on|off|status`
- `/pkm <text>` enables pkm mode and immediately sends `<text>`
- Optional startup flag:
  - `--pkm`
- If `pkm_path` (or `pkmPath`) is set in pi settings, pkm mode adds
  `My pkm is stored in <path>` to the pkm system prompt

## PKM path setting (optional)

Set either key in settings:

- Project: `.pi/settings.json`
- Global: `~/.pi/agent/settings.json`

```json
{
  "pkm_path": "~/code/pkm"
}
```

`pkm_path` takes precedence over `pkmPath` if both exist.
Project settings take precedence over global settings.

## Local usage

From this folder:

```bash
cd /Users/user/code/pi-pkm-mode-extension
pi -e ./extensions/pi-pkm-mode.ts
```

Or by absolute extension path:

```bash
pi -e /Users/user/code/pi-pkm-mode-extension/extensions/pi-pkm-mode.ts
```

Then in pi:

```text
/pkm
```

## Install as a package

```bash
pi install git:github.com/memgrafter/pi-pkm-mode-extension
# pinned
pi install git:github.com/memgrafter/pi-pkm-mode-extension@v0.1.0
```

Project-local install:

```bash
pi install -l git:github.com/memgrafter/pi-pkm-mode-extension
```
