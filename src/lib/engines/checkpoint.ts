import fsPromises from 'node:fs/promises'
import path from 'node:path'

export const CHECKPOINT_FILENAME = '.open-nami-checkpoint.json'

export interface ExtractorCheckpoint {
  version: number
  platform: string
  username: string
  updatedAt: string
  cursors: Record<string, string>
  completed: boolean
}

/**
 * Loads the saved pagination checkpoint from the destination directory, if one exists.
 */
export async function loadCheckpoint(destDir: string): Promise<ExtractorCheckpoint | null> {
  const filePath = path.join(destDir, CHECKPOINT_FILENAME)
  try {
    const raw = await fsPromises.readFile(filePath, 'utf-8')
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && parsed.cursors) {
      return parsed as ExtractorCheckpoint
    }
  } catch {}
  return null
}

/**
 * Atomically writes the checkpoint to .open-nami-checkpoint.json in the destination directory.
 */
export async function saveCheckpoint(
  destDir: string,
  checkpoint: ExtractorCheckpoint,
): Promise<void> {
  const filePath = path.join(destDir, CHECKPOINT_FILENAME)
  const tmpPath = `${filePath}.tmp`
  try {
    await fsPromises.mkdir(destDir, {recursive: true})
    await fsPromises.writeFile(tmpPath, JSON.stringify(checkpoint, null, 2), 'utf-8')
    await fsPromises.rename(tmpPath, filePath)
  } catch {}
}

/**
 * Removes or marks completed the checkpoint file once a profile walk is fully completed.
 */
export async function clearCheckpoint(destDir: string): Promise<void> {
  const filePath = path.join(destDir, CHECKPOINT_FILENAME)
  try {
    await fsPromises.unlink(filePath)
  } catch {}
}
