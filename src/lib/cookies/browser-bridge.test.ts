import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  listDetectedBrowsers,
  parseWindowsDefaultBrowserProgId,
  mapProgIdToBrowserId,
  parseMacDefaultBrowserBundleId,
  parseLinuxDefaultBrowserDesktop,
  detectSystemDefaultBrowser,
  resolveBrowserCookieArg,
  exportCookiesForPlatform,
} from './browser-bridge.js'

test('listDetectedBrowsers detects known browser profile paths including Helium', () => {
  const browsers = listDetectedBrowsers()
  assert.equal(Array.isArray(browsers), true)
  assert.equal(browsers.some(b => ['chrome', 'firefox', 'edge', 'brave', 'helium'].includes(b.id)), true)
  
  const helium = browsers.find(b => b.id === 'helium')
  assert.ok(helium, 'Helium candidate should be present in detected browsers list')
  assert.equal(helium.name, 'Helium')
  assert.ok(helium.profileDir.includes('Helium'))

  for (const b of browsers) {
    assert.equal(typeof b.id, 'string')
    assert.equal(typeof b.name, 'string')
    assert.equal(typeof b.profileDir, 'string')
    assert.equal(typeof b.available, 'boolean')
  }
})

test('parseWindowsDefaultBrowserProgId parses realistic Windows reg query outputs', () => {
  const chromeRaw = `
HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\Shell\\Associations\\UrlAssociations\\https\\UserChoice
    ProgId    REG_SZ    ChromeHTML
`
  assert.equal(parseWindowsDefaultBrowserProgId(chromeRaw), 'ChromeHTML')

  const heliumRaw = `
HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\Shell\\Associations\\UrlAssociations\\https\\UserChoice
    ProgId    REG_SZ    HeliumHTM
`
  assert.equal(parseWindowsDefaultBrowserProgId(heliumRaw), 'HeliumHTM')

  const firefoxRaw = `
HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\Shell\\Associations\\UrlAssociations\\https\\UserChoice
    ProgId    REG_SZ    FirefoxURL-308046B0AF4A39CB
`
  assert.equal(parseWindowsDefaultBrowserProgId(firefoxRaw), 'FirefoxURL-308046B0AF4A39CB')

  const edgeUwpRaw = `
HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\Shell\\Associations\\UrlAssociations\\https\\UserChoice
    ProgId    REG_SZ    AppXq0fevzme2pys62n3e0fbqsw5cj08ege9
`
  assert.equal(parseWindowsDefaultBrowserProgId(edgeUwpRaw), 'AppXq0fevzme2pys62n3e0fbqsw5cj08ege9')

  const errorRaw = 'ERROR: The system was unable to find the specified registry key or value.\r\n'
  assert.equal(parseWindowsDefaultBrowserProgId(errorRaw), null)
  assert.equal(parseWindowsDefaultBrowserProgId(''), null)
})

test('mapProgIdToBrowserId maps ProgIds correctly', () => {
  const chrome = mapProgIdToBrowserId('ChromeHTML')
  assert.equal(chrome.id, 'chrome')
  assert.equal(chrome.engine, 'chrome')
  assert.equal(chrome.name, 'Google Chrome')

  const edge = mapProgIdToBrowserId('MSEdgeHTM')
  assert.equal(edge.id, 'edge')
  assert.equal(edge.engine, 'edge')
  assert.equal(edge.name, 'Microsoft Edge')

  const edgeUwp = mapProgIdToBrowserId('AppXq0fevzme2pys62n3e0fbqsw5cj08ege9')
  assert.equal(edgeUwp.id, 'edge')
  assert.equal(edgeUwp.engine, 'edge')

  const brave = mapProgIdToBrowserId('BraveHTML')
  assert.equal(brave.id, 'brave')
  assert.equal(brave.engine, 'brave')
  assert.equal(brave.name, 'Brave Browser')

  const firefox = mapProgIdToBrowserId('FirefoxURL-308046B0AF4A39CB')
  assert.equal(firefox.id, 'firefox')
  assert.equal(firefox.engine, 'firefox')
  assert.equal(firefox.name, 'Mozilla Firefox')

  const helium = mapProgIdToBrowserId('HeliumHTM')
  assert.equal(helium.id, 'helium')
  assert.equal(helium.engine, 'chrome')
  assert.equal(helium.name, 'Helium')
  assert.ok(helium.profileDir && helium.profileDir.includes('Helium'))

  const opera = mapProgIdToBrowserId('OperaStable')
  assert.equal(opera.id, 'opera')
  assert.equal(opera.engine, 'opera')

  const vivaldi = mapProgIdToBrowserId('VivaldiHTM')
  assert.equal(vivaldi.id, 'vivaldi')
  assert.equal(vivaldi.engine, 'vivaldi')
})

test('mapProgIdToBrowserId supports command output fallback for Helium', () => {
  const heliumCmd = '"C:\\Program Files\\imput\\Helium\\Application\\chrome.exe" --single-argument %1'
  const fallbackResult = mapProgIdToBrowserId('CustomOrUnknownProgId', heliumCmd)
  assert.equal(fallbackResult.id, 'helium')
  assert.equal(fallbackResult.engine, 'chrome')
  assert.equal(fallbackResult.name, 'Helium')
  assert.ok(fallbackResult.profileDir && fallbackResult.profileDir.includes('Helium'))
})

test('parseMacDefaultBrowserBundleId and parseLinuxDefaultBrowserDesktop extract handlers', () => {
  const macOutput = `
(
    {
        LSHandlerRoleAll = "com.google.chrome";
        LSHandlerURLScheme = https;
    },
    {
        LSHandlerRoleAll = "org.mozilla.firefox";
        LSHandlerURLScheme = http;
    }
)
`
  assert.equal(parseMacDefaultBrowserBundleId(macOutput), 'com.google.chrome')

  const macHelium = `
(
    {
        LSHandlerRoleAll = "net.imput.Helium";
        LSHandlerURLScheme = https;
    }
)
`
  assert.equal(parseMacDefaultBrowserBundleId(macHelium), 'net.imput.Helium')
  assert.equal(parseMacDefaultBrowserBundleId(''), null)

  const linuxOutput = 'google-chrome.desktop\n'
  assert.equal(parseLinuxDefaultBrowserDesktop(linuxOutput), 'google-chrome.desktop')
  assert.equal(parseLinuxDefaultBrowserDesktop(''), null)
  assert.equal(parseLinuxDefaultBrowserDesktop('ERROR: not found'), null)
})

test('detectSystemDefaultBrowser detects Windows default browser via mock execFn', () => {
  const mockWinExec = (cmd: string): string => {
    if (cmd.includes('https\\UserChoice')) {
      return '    ProgId    REG_SZ    HeliumHTM\r\n'
    }
    if (cmd.includes('HKCR\\HeliumHTM\\shell\\open\\command')) {
      return '    (Default)    REG_SZ    "C:\\Program Files\\imput\\Helium\\Application\\chrome.exe" %1\r\n'
    }
    return ''
  }

  const detected = detectSystemDefaultBrowser(mockWinExec, 'win32')
  assert.ok(detected)
  assert.equal(detected.id, 'helium')
  assert.equal(detected.name, 'Helium')
  assert.ok(detected.profileDir.includes('Helium'))
})

test('detectSystemDefaultBrowser detects macOS default browser via mock execFn', () => {
  const mockMacExec = (cmd: string): string => {
    if (cmd.includes('LaunchServices')) {
      return `
(
    {
        LSHandlerRoleAll = "com.google.chrome";
        LSHandlerURLScheme = https;
    }
)
`
    }
    return ''
  }

  const detected = detectSystemDefaultBrowser(mockMacExec, 'darwin')
  assert.ok(detected)
  assert.equal(detected.id, 'chrome')
  assert.equal(detected.name, 'Google Chrome')
})

test('detectSystemDefaultBrowser detects Linux default browser via mock execFn', () => {
  const mockLinuxExec = (cmd: string): string => {
    if (cmd.includes('xdg-settings')) {
      return 'firefox.desktop\n'
    }
    return ''
  }

  const detected = detectSystemDefaultBrowser(mockLinuxExec, 'linux')
  assert.ok(detected)
  assert.equal(detected.id, 'firefox')
  assert.equal(detected.name, 'Mozilla Firefox')
})

test('detectSystemDefaultBrowser handles failures gracefully', () => {
  const failingExec = () => ''
  const fallback = detectSystemDefaultBrowser(failingExec, 'win32')
  // Should return first available browser or null without throwing
  if (fallback) {
    assert.equal(typeof fallback.id, 'string')
    assert.equal(fallback.available, true)
  } else {
    assert.equal(fallback, null)
  }
})

test('detectSystemDefaultBrowser executes without throwing on host OS', () => {
  const hostBrowser = detectSystemDefaultBrowser()
  // Host detection should return a DetectedBrowser or null
  if (hostBrowser) {
    assert.equal(typeof hostBrowser.id, 'string')
    assert.equal(typeof hostBrowser.name, 'string')
  }
})

test('resolveBrowserCookieArg resolves cookie arguments accurately', () => {
  // Helium returns chrome:<profileDir>
  const heliumBrowser = {
    id: 'helium',
    name: 'Helium',
    profileDir: 'C:\\Users\\mint\\AppData\\Local\\imput\\Helium\\User Data',
    available: true,
  }
  const resolvedHelium = resolveBrowserCookieArg(heliumBrowser)
  assert.equal(resolvedHelium, 'chrome:C:\\Users\\mint\\AppData\\Local\\imput\\Helium\\User Data')

  // Standard browsers return their id
  assert.equal(
    resolveBrowserCookieArg({ id: 'chrome', name: 'Google Chrome', profileDir: '', available: true }),
    'chrome',
  )
  assert.equal(
    resolveBrowserCookieArg({ id: 'firefox', name: 'Mozilla Firefox', profileDir: '', available: true }),
    'firefox',
  )
  assert.equal(
    resolveBrowserCookieArg({ id: 'edge', name: 'Microsoft Edge', profileDir: '', available: true }),
    'edge',
  )
  assert.equal(
    resolveBrowserCookieArg({ id: 'brave', name: 'Brave Browser', profileDir: '', available: true }),
    'brave',
  )

  // String arguments
  assert.equal(resolveBrowserCookieArg('firefox'), 'firefox')
  assert.equal(resolveBrowserCookieArg('chrome'), 'chrome')

  // Null, none, and empty values return null
  assert.equal(resolveBrowserCookieArg(null), null)
  assert.equal(resolveBrowserCookieArg(undefined), null)
  assert.equal(resolveBrowserCookieArg('none'), null)
  assert.equal(resolveBrowserCookieArg('NONE'), null)
  assert.equal(resolveBrowserCookieArg(''), null)
  assert.equal(
    resolveBrowserCookieArg({ id: 'none', name: 'None', profileDir: '', available: false }),
    null,
  )
})

test('exportCookiesForPlatform returns false for invalid or unavailable browser', async () => {
  const result = await exportCookiesForPlatform('nonexistent-browser', 'instagram', '/tmp/fake-cookie.txt')
  assert.equal(result, false)
})
