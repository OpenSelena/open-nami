import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import {
  expandWindowsEnv,
  isPathDriveAccessible,
  parseLinuxUserDirsOutput,
  parseWindowsRegistryOutput,
  resolveLinuxDownloadsDir,
  resolvePlatformDownloadsDir,
  resolveWindowsDownloadsDir,
} from './known-folders.js'

test('expandWindowsEnv expands case-insensitive windows environment variables', () => {
  const env = {
    USERPROFILE: 'C:\\Users\\Alice',
    SystemDrive: 'C:',
    PUBLIC: 'C:\\Users\\Public',
  }

  assert.equal(
    expandWindowsEnv('%USERPROFILE%\\Downloads', env),
    'C:\\Users\\Alice\\Downloads'
  )
  assert.equal(
    expandWindowsEnv('%userprofile%\\Documents', env),
    'C:\\Users\\Alice\\Documents'
  )
  assert.equal(
    expandWindowsEnv('%SystemDrive%\\Shared', env),
    'C:\\Shared'
  )
  assert.equal(
    expandWindowsEnv('%UNKNOWN_VAR%\\test', env),
    '%UNKNOWN_VAR%\\test'
  )
  // Uses homeDir fallback for userprofile
  assert.equal(
    expandWindowsEnv('%USERPROFILE%\\Downloads', {}, 'D:\\CustomHome'),
    'D:\\CustomHome\\Downloads'
  )
})

test('parseWindowsRegistryOutput extracts relocated path from reg query output', () => {
  const sampleRegOutput = `
HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\User Shell Folders
    Desktop    REG_EXPAND_SZ    %USERPROFILE%\\Desktop
    {374DE290-123F-4565-9164-39C4925E467B}    REG_EXPAND_SZ    D:\\RelocatedDownloads
    Personal   REG_EXPAND_SZ    %USERPROFILE%\\Documents
`
  assert.equal(
    parseWindowsRegistryOutput(sampleRegOutput, '{374DE290-123F-4565-9164-39C4925E467B}'),
    'D:\\RelocatedDownloads'
  )
})

test('parseWindowsRegistryOutput does not cross-match other keys', () => {
  const sampleRegOutput = `
HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\User Shell Folders
    Desktop    REG_EXPAND_SZ    %USERPROFILE%\\Desktop
`
  assert.equal(
    parseWindowsRegistryOutput(sampleRegOutput, '{374DE290-123F-4565-9164-39C4925E467B}'),
    undefined
  )
})

test('parseWindowsRegistryOutput extracts legacy Downloads key', () => {
  const sampleRegOutput = `
HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\User Shell Folders
    Downloads    REG_SZ    E:\\MyDownloads
`
  assert.equal(
    parseWindowsRegistryOutput(sampleRegOutput, 'Downloads'),
    'E:\\MyDownloads'
  )
})

test('parseWindowsRegistryOutput returns undefined on empty or mismatching output', () => {
  assert.equal(parseWindowsRegistryOutput('', 'Downloads'), undefined)
  assert.equal(parseWindowsRegistryOutput('ERROR: The system was unable to find the specified registry key or value.', 'Downloads'), undefined)
})

test('parseLinuxUserDirsOutput parses XDG_DOWNLOAD_DIR', () => {
  const sample = `
# This file is written by xdg-user-dirs-update
XDG_DESKTOP_DIR="$HOME/Desktop"
XDG_DOWNLOAD_DIR="$HOME/Downloads"
XDG_TEMPLATES_DIR="$HOME/Templates"
`
  assert.equal(parseLinuxUserDirsOutput(sample), '$HOME/Downloads')

  const customSample = `
XDG_DOWNLOAD_DIR="/mnt/data/my-downloads"
`
  assert.equal(parseLinuxUserDirsOutput(customSample), '/mnt/data/my-downloads')
})

test('resolveWindowsDownloadsDir resolves relocated drive when accessible', () => {
  const result = resolveWindowsDownloadsDir({
    homeDir: 'C:\\Users\\Alice',
    env: {USERPROFILE: 'C:\\Users\\Alice'},
    regQueryFn: () => `
HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\User Shell Folders
    {374DE290-123F-4565-9164-39C4925E467B}    REG_EXPAND_SZ    X:\\Downloads
`,
    driveAccessibleFn: p => p.startsWith('X:'),
  })

  assert.equal(result, 'X:\\Downloads')
})

test('resolveWindowsDownloadsDir expands %USERPROFILE% and returns resolved path', () => {
  const result = resolveWindowsDownloadsDir({
    homeDir: 'C:\\Users\\Alice',
    env: {USERPROFILE: 'C:\\Users\\Alice'},
    regQueryFn: () => `
HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\User Shell Folders
    {374DE290-123F-4565-9164-39C4925E467B}    REG_EXPAND_SZ    %USERPROFILE%\\Downloads
`,
    driveAccessibleFn: () => true,
  })

  assert.equal(result, 'C:\\Users\\Alice\\Downloads')
})

test('resolveWindowsDownloadsDir returns undefined if relocated drive is inaccessible', () => {
  const result = resolveWindowsDownloadsDir({
    homeDir: 'C:\\Users\\Alice',
    env: {USERPROFILE: 'C:\\Users\\Alice'},
    regQueryFn: () => `
HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\User Shell Folders
    {374DE290-123F-4565-9164-39C4925E467B}    REG_EXPAND_SZ    Z:\\OfflineDrive\\Downloads
`,
    driveAccessibleFn: () => false, // e.g. unplugged external USB
  })

  assert.equal(result, undefined)
})

test('resolveLinuxDownloadsDir resolves custom download directory with $HOME expansion', () => {
  const result = resolveLinuxDownloadsDir({
    homeDir: '/home/alice',
    readFileFn: () => 'XDG_DOWNLOAD_DIR="$HOME/Incoming"\n',
    driveAccessibleFn: () => true,
  })

  assert.equal(result, '/home/alice/Incoming')
})

test('resolvePlatformDownloadsDir falls back to ~/Downloads when platform query returns undefined', () => {
  const winFallback = resolvePlatformDownloadsDir({
    platform: 'win32',
    homeDir: 'C:\\Users\\Alice',
    regQueryFn: () => '', // failed query
  })
  assert.equal(winFallback, path.join('C:\\Users\\Alice', 'Downloads'))

  const linuxFallback = resolvePlatformDownloadsDir({
    platform: 'linux',
    homeDir: '/home/alice',
    readFileFn: () => '', // no user-dirs.dirs
  })
  assert.equal(linuxFallback, path.join('/home/alice', 'Downloads'))

  const darwinDefault = resolvePlatformDownloadsDir({
    platform: 'darwin',
    homeDir: '/Users/alice',
  })
  assert.equal(darwinDefault, path.join('/Users/alice', 'Downloads'))
})

test('isPathDriveAccessible checks drive root on Windows and mount points on POSIX', () => {
  // Direct file exists
  assert.equal(isPathDriveAccessible('/existing/path', () => true), true)

  // Windows drive root check
  assert.equal(
    isPathDriveAccessible('D:\\Downloads\\Stuff', p => p.toLowerCase() === 'd:\\', 'win32'),
    true
  )
  assert.equal(
    isPathDriveAccessible('Z:\\Downloads\\Stuff', p => p.toLowerCase() === 'd:\\', 'win32'),
    false
  )

  // POSIX /media/usb mount check
  assert.equal(
    isPathDriveAccessible('/media/user/usb-drive/Downloads', p => p === '/media/user/usb-drive', 'linux'),
    true
  )
  assert.equal(
    isPathDriveAccessible('/media/user/unmounted-usb/Downloads', p => p === '/media/user/other', 'linux'),
    false
  )
})

test('resolvePlatformDownloadsDir uses live windows registry on current machine if win32', () => {
  if (process.platform !== 'win32') return
  const dir = resolvePlatformDownloadsDir()
  assert.ok(typeof dir === 'string' && dir.length > 0)
})
