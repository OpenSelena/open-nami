import fs from 'node:fs'
import path from 'node:path'
import {getOpenNamiBinDir} from './fetcher.js'

export interface ResolvedEngineCommand {
  command: string
  baseArgs: string[]
}

export function findExecutable(binName: string, pathEnv: string = process.env.PATH || ''): string | null {
  if (!pathEnv) return null
  const delimiter = path.delimiter
  const dirs = pathEnv.split(delimiter).filter(Boolean)
  const isWin = process.platform === 'win32'
  const extensions = isWin ? ['.exe', '.cmd', '.bat', ''] : ['']

  for (const dir of dirs) {
    for (const ext of extensions) {
      const fullPath = path.join(dir, `${binName}${ext}`)
      try {
        if (fs.existsSync(fullPath)) {
          const stat = fs.statSync(fullPath)
          if (stat.isFile()) {
            return fullPath
          }
        }
      } catch {}
    }
  }
  return null
}

export function resolveEngineCommand(
  engine: 'gallery-dl' | 'yt-dlp',
  options: {
    findExe?: (name: string) => string | null
    env?: NodeJS.ProcessEnv
  } = {},
): ResolvedEngineCommand {
  const env = options.env ?? process.env
  const finder = options.findExe ?? (name => findExecutable(name, env.PATH))

  // 1. Check custom environment variable override
  const customOverride =
    engine === 'gallery-dl'
      ? env.GALLERY_DL_PATH || env.GALLERY_DL_BINARY
      : env.YT_DLP_PATH || env.YT_DLP_BINARY

  if (customOverride && customOverride.trim()) {
    return {
      command: customOverride.trim(),
      baseArgs: [],
    }
  }

  // 2. Check standalone executable in PATH (e.g. installed via Scoop, Winget, Homebrew)
  const standalone = finder(engine)
  if (standalone) {
    return {
      command: standalone,
      baseArgs: [],
    }
  }

  // 3. Check standalone binary in ~/.open-nami/bin/
  const binDir = getOpenNamiBinDir(env)
  const isWin = process.platform === 'win32'
  const localBin = path.join(binDir, `${engine}${isWin ? '.exe' : ''}`)
  try {
    if (fs.existsSync(localBin)) {
      const stat = fs.statSync(localBin)
      if (stat.isFile()) {
        return {
          command: localBin,
          baseArgs: [],
        }
      }
    }
  } catch {}

  const moduleName = engine === 'gallery-dl' ? 'gallery_dl' : 'yt_dlp'

  // 4. Check python in PATH
  const pythonExe = finder('python')
  if (pythonExe) {
    return {
      command: pythonExe,
      baseArgs: ['-m', moduleName],
    }
  }

  // 4. Check python3 in PATH (macOS / Linux)
  const python3Exe = finder('python3')
  if (python3Exe) {
    return {
      command: python3Exe,
      baseArgs: ['-m', moduleName],
    }
  }

  // 5. Default fallback to python invocation
  return {
    command: 'python',
    baseArgs: ['-m', moduleName],
  }
}
