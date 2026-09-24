# Shell Autocompletion

Open Nami provides built-in autocompletion for `bash`, `zsh`, `fish`, and `PowerShell`.

Completions work across all four command aliases:
* `open-nami`
* `opennami`
* `nami`
* `on`

---

## Installation by Shell

### Bash

To load completions in your current session:
```bash
eval "$(open-nami --completion bash)"
```

To install persistently for future terminal sessions:
```bash
# User-level installation (recommended)
mkdir -p ~/.local/share/bash-completion/completions
open-nami --completion bash > ~/.local/share/bash-completion/completions/open-nami

# Or append to ~/.bashrc:
echo 'eval "$(open-nami --completion bash)"' >> ~/.bashrc
```

---

### Zsh

Add to your `~/.zshrc`:
```zsh
eval "$(open-nami --completion zsh)"
```

Or write to a directory in your `$fpath` (such as `~/.zfunc/`):
```zsh
mkdir -p ~/.zfunc
open-nami --completion zsh > ~/.zfunc/_open_nami
```
Make sure `fpath=(~/.zfunc $fpath)` and `autoload -Uz compinit && compinit` are in your `~/.zshrc`.

---

### Fish

To load in your current session:
```fish
open-nami --completion fish | source
```

To install persistently:
```fish
mkdir -p ~/.config/fish/completions
open-nami --completion fish > ~/.config/fish/completions/open-nami.fish
```

---

### PowerShell (Windows, macOS, Linux)

Add the following block to your PowerShell profile (edit with `notepad $PROFILE`):

```powershell
if (Get-Command open-nami -ErrorAction SilentlyContinue) {
    open-nami --completion powershell | Out-String | Invoke-Expression
}
```

---

## What Gets Completed?

* **Options**: `--photos`, `--videos`, `--stories`, `--highlights`, `--all`, `-o`, `--output`, `-U`, `--update`, `--update-ytdlp`, `--update-gallerydl`, `--theme`, `--completion`.
* **Themes**: `auto`, `light`, `dark`.
* **Shells**: `bash`, `zsh`, `fish`, `powershell`.
* **Directories**: Directory path completion when using `-o` or `--output`.
