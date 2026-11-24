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

    local options="--help -h --version -v --doctor --output -o --watch -w --batch -b --update -U --update-ytdlp --update-gallerydl --theme --photos --videos --stories --highlights --all --since --until --limit -l --resume --write-metadata --no-track --platform -p --completion"
    local subcommands="pull sync list track untrack"

    case "$prev" in
        --theme)
            COMPREPLY=($(compgen -W "auto light dark" -- "$cur"))
            return 0
            ;;
        --completion)
            COMPREPLY=($(compgen -W "bash zsh fish powershell" -- "$cur"))
            return 0
            ;;
        -p|--platform)
            COMPREPLY=($(compgen -W "instagram tiktok facebook x" -- "$cur"))
            return 0
            ;;
        -o|--output)
            COMPREPLY=($(compgen -d -- "$cur"))
            return 0
            ;;
        -b|--batch)
            COMPREPLY=($(compgen -f -- "$cur"))
            return 0
            ;;
        --since|--until|-l|--limit)
            return 0
            ;;
    esac

    if [[ "$cur" == -* ]]; then
        COMPREPLY=($(compgen -W "$options" -- "$cur"))
        return 0
    elif [[ "$COMP_CWORD" -eq 1 ]]; then
        COMPREPLY=($(compgen -W "$subcommands" -- "$cur"))
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
        '--doctor[Run environment and dependency diagnostics]' \\
        '(-o --output)'{-o,--output}'[Set custom output directory]:output directory:_files -/' \\
        '(-w --watch)'{-w,--watch}'[Watch clipboard for profile links and auto-download]' \\
        '(-b --batch)'{-b,--batch}'[Download multiple profiles from a batch file]:batch file:_files' \\
        '(-U --update)'{-U,--update}'[Update bundled engines]' \\
        '--update-ytdlp[Update only bundled yt-dlp binary]' \\
        '--update-gallerydl[Update only bundled gallery-dl binary]' \\
        '--theme[Set color theme]:theme:(auto light dark)' \\
        '--photos[Download photos only]' \\
        '--videos[Download videos and reels only]' \\
        '--stories[Download stories only (Instagram)]' \\
        '--highlights[Download highlights only (Instagram)]' \\
        '--all[Download all available media]' \\
        '--since[Filter posts on or after date]:date:' \\
        '--until[Filter posts on or before date]:date:' \\
        '(-l --limit)'{-l,--limit}'[Limit maximum items to download]:limit:' \\
        '--resume[Resume download from saved pagination checkpoint]' \\
        '--write-metadata[Save post metadata and captions to sidecar .json files]' \\
        '--no-track[Do not add downloaded profile to tracked history registry]' \\
        '(-p --platform)'{-p,--platform}'[Specify platform]:platform:(instagram tiktok facebook x)' \\
        '--completion[Generate shell completion script]:shell:(bash zsh fish powershell)' \\
        '1:subcommand:(pull sync list track untrack)'
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
complete -c open-nami -l doctor -d "Run environment and dependency diagnostics"
complete -c open-nami -s o -l output -r -a "(__fish_complete_directories)" -d "Set custom output directory"
complete -c open-nami -s w -l watch -d "Watch clipboard for profile links and auto-download"
complete -c open-nami -s b -l batch -r -F -d "Download multiple profiles from a batch file"
complete -c open-nami -s U -l update -d "Update bundled engines"
complete -c open-nami -l update-ytdlp -d "Update only bundled yt-dlp binary"
complete -c open-nami -l update-gallerydl -d "Update only bundled gallery-dl binary"
complete -c open-nami -l theme -x -a "auto light dark" -d "Set color theme"
complete -c open-nami -l photos -d "Download photos only"
complete -c open-nami -l videos -d "Download videos and reels only"
complete -c open-nami -l stories -d "Download stories only (Instagram)"
complete -c open-nami -l highlights -d "Download highlights only (Instagram)"
complete -c open-nami -l all -d "Download all available media"
complete -c open-nami -l since -x -d "Filter posts on or after date"
complete -c open-nami -l until -x -d "Filter posts on or before date"
complete -c open-nami -s l -l limit -x -d "Limit maximum items to download"
complete -c open-nami -l resume -d "Resume download from saved pagination checkpoint"
complete -c open-nami -l write-metadata -d "Save post metadata and captions to sidecar .json files"
complete -c open-nami -l no-track -d "Do not add downloaded profile to tracked history registry"
complete -c open-nami -s p -l platform -x -a "instagram tiktok facebook x" -d "Specify platform"
complete -c open-nami -l completion -x -a "bash zsh fish powershell" -d "Generate shell completion script"
complete -c open-nami -n "__fish_use_subcommand" -a "pull sync list track untrack" -d "Subcommand"

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

    if ($prev -eq '-p' -or $prev -eq '--platform') {
        $platforms = @('instagram', 'tiktok', 'facebook', 'x')
        $platforms | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {
            [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', "Platform: $_")
        }
        return
    }

    if ($prev -in @('-o', '--output', '-b', '--batch', '--since', '--until', '-l', '--limit')) {
        return
    }

    if ($wordToComplete -like '-*') {
        $options = @(
            [PSCustomObject]@{ Option = '--help'; Short = '-h'; Tooltip = 'Show help message' },
            [PSCustomObject]@{ Option = '--version'; Short = '-v'; Tooltip = 'Show version number' },
            [PSCustomObject]@{ Option = '--doctor'; Short = $null; Tooltip = 'Run environment and dependency diagnostics' },
            [PSCustomObject]@{ Option = '--output'; Short = '-o'; Tooltip = 'Set custom output directory' },
            [PSCustomObject]@{ Option = '--watch'; Short = '-w'; Tooltip = 'Watch clipboard for profile links and auto-download' },
            [PSCustomObject]@{ Option = '--batch'; Short = '-b'; Tooltip = 'Download multiple profiles from a batch file' },
            [PSCustomObject]@{ Option = '--update'; Short = '-U'; Tooltip = 'Update bundled engines' },
            [PSCustomObject]@{ Option = '--update-ytdlp'; Short = $null; Tooltip = 'Update only bundled yt-dlp binary' },
            [PSCustomObject]@{ Option = '--update-gallerydl'; Short = $null; Tooltip = 'Update only bundled gallery-dl binary' },
            [PSCustomObject]@{ Option = '--theme'; Short = $null; Tooltip = 'Set color theme (auto, light, dark)' },
            [PSCustomObject]@{ Option = '--photos'; Short = $null; Tooltip = 'Download photos only' },
            [PSCustomObject]@{ Option = '--videos'; Short = $null; Tooltip = 'Download videos and reels only' },
            [PSCustomObject]@{ Option = '--stories'; Short = $null; Tooltip = 'Download stories only (Instagram)' },
            [PSCustomObject]@{ Option = '--highlights'; Short = $null; Tooltip = 'Download highlights only (Instagram)' },
            [PSCustomObject]@{ Option = '--all'; Short = $null; Tooltip = 'Download all available media' },
            [PSCustomObject]@{ Option = '--since'; Short = $null; Tooltip = 'Filter posts on or after date' },
            [PSCustomObject]@{ Option = '--until'; Short = $null; Tooltip = 'Filter posts on or before date' },
            [PSCustomObject]@{ Option = '--limit'; Short = '-l'; Tooltip = 'Limit maximum items to download' },
            [PSCustomObject]@{ Option = '--resume'; Short = $null; Tooltip = 'Resume download from saved pagination checkpoint' },
            [PSCustomObject]@{ Option = '--write-metadata'; Short = $null; Tooltip = 'Save post metadata and captions to sidecar .json files' },
            [PSCustomObject]@{ Option = '--no-track'; Short = $null; Tooltip = 'Do not track profile in history' },
            [PSCustomObject]@{ Option = '--platform'; Short = '-p'; Tooltip = 'Specify platform' },
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

    if ($elements.Count -eq 1 -or ($elements.Count -eq 2 -and -not [string]::IsNullOrEmpty($wordToComplete))) {
        $subcommands = @('pull', 'sync', 'list', 'track', 'untrack')
        $subcommands | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {
            [System.Management.Automation.CompletionResult]::new($_, $_, 'Command', "Subcommand: $_")
        }
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
