export const SUPPORTED_SHELLS = ['bash', 'zsh', 'fish', 'powershell'] as const

export type CompletionTarget = (typeof SUPPORTED_SHELLS)[number]
export type SupportedShell = CompletionTarget

export function normalizeShell(shell: string): CompletionTarget | undefined {
  const normalized = shell.toLowerCase().trim()
  if (normalized === 'pwsh') return 'powershell'
  if ((SUPPORTED_SHELLS as readonly string[]).includes(normalized)) {
    return normalized as CompletionTarget
  }
  return undefined
}

export function isSupportedShell(shell: string): shell is CompletionTarget | 'pwsh' {
  return normalizeShell(shell) !== undefined
}

export function generateBashCompletion(): string {
  return `# bash completion for open-nami
# To load completions in current shell session:
#   eval "$(open-nami --completion bash)"
# Or install persistently:
#   open-nami --completion bash > ~/.local/share/bash-completion/completions/open-nami

_open_nami_completions() {
    local cur prev
    cur="\${COMP_WORDS[COMP_CWORD]}"
    prev="\${COMP_WORDS[COMP_CWORD-1]}"

    local options="--help -h --version -v --update -U --update-ytdlp --update-gallerydl --photos --videos --stories --highlights --all --output -o --theme --completion"

    case "$prev" in
        --theme)
            COMPREPLY=($(compgen -W "auto light dark" -- "$cur"))
            return 0
            ;;
        --completion)
            COMPREPLY=($(compgen -W "bash zsh fish powershell" -- "$cur"))
            return 0
            ;;
        -o|--output)
            COMPREPLY=($(compgen -d -- "$cur"))
            return 0
            ;;
    esac

    if [[ "$cur" == -* ]]; then
        COMPREPLY=($(compgen -W "$options" -- "$cur"))
        return 0
    fi
}

complete -F _open_nami_completions open-nami
complete -F _open_nami_completions opennami
complete -F _open_nami_completions nami
complete -F _open_nami_completions on
`
}

export function generateZshCompletion(): string {
  return `#compdef open-nami opennami nami on
# zsh completion for open-nami
# To load completions in current session:
#   eval "$(open-nami --completion zsh)"

_open_nami() {
    _arguments -s -S \\
        '(-h --help)'{-h,--help}'[Show help message]' \\
        '(-v --version)'{-v,--version}'[Show version number]' \\
        '(-U --update)'{-U,--update}'[Update bundled engines]' \\
        '--update-ytdlp[Update only bundled yt-dlp binary]' \\
        '--update-gallerydl[Update only bundled gallery-dl binary]' \\
        '--photos[Download photos only]' \\
        '--videos[Download videos and reels only]' \\
        '--stories[Download stories only (Instagram)]' \\
        '--highlights[Download highlights only (Instagram)]' \\
        '--all[Download all available media]' \\
        '(-o --output)'{-o,--output}'[Destination download directory]:output directory:_files -/' \\
        '--theme[Set color theme]:theme:(auto light dark)' \\
        '--completion[Generate shell autocompletion script]:shell:(bash zsh fish powershell)'
}

if [[ -n "$ZSH_VERSION" ]]; then
    compdef _open_nami open-nami
    compdef _open_nami opennami
    compdef _open_nami nami
    compdef _open_nami on
fi
`
}

export function generateFishCompletion(): string {
  return `# fish completion for open-nami
# To load completions in current session:
#   open-nami --completion fish | source

complete -c open-nami -f

complete -c open-nami -s h -l help -d "Show help message"
complete -c open-nami -s v -l version -d "Show version number"
complete -c open-nami -s U -l update -d "Update bundled engines"
complete -c open-nami -l update-ytdlp -d "Update only bundled yt-dlp binary"
complete -c open-nami -l update-gallerydl -d "Update only bundled gallery-dl binary"
complete -c open-nami -l photos -d "Download photos only"
complete -c open-nami -l videos -d "Download videos and reels only"
complete -c open-nami -l stories -d "Download stories only (Instagram)"
complete -c open-nami -l highlights -d "Download highlights only (Instagram)"
complete -c open-nami -l all -d "Download all available media"
complete -c open-nami -s o -l output -r -a "(__fish_complete_directories)" -d "Destination directory"
complete -c open-nami -l theme -x -a "auto light dark" -d "Set color theme"
complete -c open-nami -l completion -x -a "bash zsh fish powershell" -d "Generate shell autocompletion script"

for cmd in opennami nami on
    complete -c $cmd -w open-nami
end
`
}

export function generatePowerShellCompletion(): string {
  return `# PowerShell completion for open-nami
# To load completions in current session:
#   open-nami --completion powershell | Out-String | Invoke-Expression

$completer = {
    param($wordToComplete, $commandAst, $cursorPosition)

    $elements = $commandAst.CommandElements
    $lastWord = if ($elements.Count -gt 0) { $elements[-1].Extent.Text } else { '' }
    $secondLastWord = if ($elements.Count -gt 1) { $elements[-2].Extent.Text } else { '' }
    $prev = if ([string]::IsNullOrEmpty($wordToComplete)) { $lastWord } else { $secondLastWord }

    if ($prev -eq '--theme') {
        $themes = @('auto', 'light', 'dark')
        $themes | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {
            [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', "Theme: $_")
        }
        return
    }

    if ($prev -eq '--completion') {
        $shells = @('bash', 'zsh', 'fish', 'powershell')
        $shells | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {
            [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', "Shell: $_")
        }
        return
    }

    if ($wordToComplete -like '-*') {
        $options = @(
            [PSCustomObject]@{ Option = '--help'; Short = '-h'; Tooltip = 'Show help message' },
            [PSCustomObject]@{ Option = '--version'; Short = '-v'; Tooltip = 'Show version number' },
            [PSCustomObject]@{ Option = '--update'; Short = '-U'; Tooltip = 'Update bundled engines' },
            [PSCustomObject]@{ Option = '--update-ytdlp'; Short = $null; Tooltip = 'Update only bundled yt-dlp binary' },
            [PSCustomObject]@{ Option = '--update-gallerydl'; Short = $null; Tooltip = 'Update only bundled gallery-dl binary' },
            [PSCustomObject]@{ Option = '--photos'; Short = $null; Tooltip = 'Download photos only' },
            [PSCustomObject]@{ Option = '--videos'; Short = $null; Tooltip = 'Download videos and reels only' },
            [PSCustomObject]@{ Option = '--stories'; Short = $null; Tooltip = 'Download stories only (Instagram)' },
            [PSCustomObject]@{ Option = '--highlights'; Short = $null; Tooltip = 'Download highlights only (Instagram)' },
            [PSCustomObject]@{ Option = '--all'; Short = $null; Tooltip = 'Download all available media' },
            [PSCustomObject]@{ Option = '--output'; Short = '-o'; Tooltip = 'Destination directory' },
            [PSCustomObject]@{ Option = '--theme'; Short = $null; Tooltip = 'Set color theme (auto, light, dark)' },
            [PSCustomObject]@{ Option = '--completion'; Short = $null; Tooltip = 'Generate shell completion script' }
        )

        foreach ($opt in $options) {
            if ($opt.Option -like "$wordToComplete*") {
                [System.Management.Automation.CompletionResult]::new($opt.Option, $opt.Option, 'ParameterName', $opt.Tooltip)
            }
            if ($opt.Short -and $opt.Short -like "$wordToComplete*") {
                [System.Management.Automation.CompletionResult]::new($opt.Short, $opt.Short, 'ParameterName', $opt.Tooltip)
            }
        }
        return
    }
}

'open-nami', 'opennami', 'nami', 'on' | ForEach-Object {
    Register-ArgumentCompleter -Native -CommandName $_ -ScriptBlock $completer
}
`
}

export function generateCompletion(shell: string): string {
  const target = normalizeShell(shell)
  if (!target) {
    throw new Error(
      `Unsupported shell "${shell}". Supported shells: ${SUPPORTED_SHELLS.join(', ')} (or "pwsh" for powershell).`,
    )
  }

  switch (target) {
    case 'bash':
      return generateBashCompletion()
    case 'zsh':
      return generateZshCompletion()
    case 'fish':
      return generateFishCompletion()
    case 'powershell':
      return generatePowerShellCompletion()
  }
}
