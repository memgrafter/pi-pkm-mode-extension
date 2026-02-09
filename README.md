# pi-pkm-mode

Personal knowledge management mode for **pi**.

## Features

- `/pkm` toggle
- `/pkm on|off|status`
- `/pkm <text>` enables PKM mode and immediately sends `<text>`
- Optional startup flags:
  - `--pkm`
  - `--pkm-prompt-path <path>`
- Tries to load a PKM prompt from local Python prompt files, then falls back to built-in prompt text

## Prompt source defaults

By default it checks:

- `~/code/aiderx/aider/extensions/handlers/pkm_handler.py`
- `~/code/aiderx/aider/coders/pkm_prompts.py`
- `~/code/aiderx/aider/coders/pkm_coder.py`

Override with:

```bash
--pkm-prompt-path /absolute/or/tilde/path/to/prompt_file.py
```

## Local usage

From this folder:

```bash
pi -e ./extensions/pi-pkm-mode.ts
```

Then in pi:

```text
/pkm
```

## Install as a package

```bash
pi install git:github.com/memgrafter/pi-pkm-mode
# pinned
pi install git:github.com/memgrafter/pi-pkm-mode@v0.1.0
```

Project-local install:

```bash
pi install -l git:github.com/memgrafter/pi-pkm-mode
```
