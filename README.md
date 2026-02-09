# pi-pkm-mode

Personal knowledge management mode for **pi**.

## Features

- `/pkm` toggle
- `/pkm on|off|status`
- `/pkm <text>` enables PKM mode and immediately sends `<text>`
- Optional startup flag:
  - `--pkm`

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
