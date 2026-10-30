import React from 'react'
import {Box, Text} from 'ink'
import {FramedInput} from '../framed-input.js'
import {TextInput} from '../text-input.js'
import {terminalLink} from '../../lib/format.js'
import {BRAND_COLOR, type Theme} from '../../theme.js'
import type {Announcement} from '../../lib/announcements.js'

export type InputViewProps = {
  urlInput: string
  setUrlInput: (val: string) => void
  onSubmit: (val: string) => void
  boxWidth: number
  history?: string[]
  clipboardOffered: boolean
  clipboardAccepted: boolean
  clipboardUrl?: string
  warning?: string
  version?: string
  latestVersion?: string
  releaseUrl: string
  theme: Theme
  buttonText: string
  gapComponent: React.ComponentType<{lines?: number}>
  announcement?: Announcement | null
}

export function InputView({
  urlInput,
  setUrlInput,
  onSubmit,
  boxWidth,
  history = [],
  clipboardOffered,
  clipboardAccepted,
  clipboardUrl,
  warning,
  version = '1.0.0',
  latestVersion,
  releaseUrl,
  theme,
  buttonText,
  gapComponent: Gap,
  announcement,
}: InputViewProps) {
  return (
    <Box flexDirection="column" alignItems="center">
      <FramedInput title="Paste a profile link" width={boxWidth} button={buttonText}>
        <TextInput
          value={urlInput}
          onChange={setUrlInput}
          onSubmit={onSubmit}
          placeholder="https://instagram.com/profile or @profile…"
          width={boxWidth - 6}
          history={history}
          onTab={() => {
            if (clipboardOffered && clipboardUrl) setUrlInput(clipboardUrl)
          }}
        />
      </FramedInput>
      {warning ? (
        <Text color={theme.gray} dimColor={theme.dimSecondary}>✗ {warning}</Text>
      ) : clipboardOffered ? (
        <Text color={theme.gray} dimColor={theme.dimSecondary}>link in your clipboard: Tab to paste it</Text>
      ) : clipboardAccepted ? (
        <Text color={theme.gray} dimColor={theme.dimSecondary}>from your clipboard: ↵ to download it</Text>
      ) : null}
      {announcement && (
        <Box marginTop={1} flexDirection="row" alignItems="center">
          <Text
            color={
              announcement.level === 'warning' || announcement.level === 'alert'
                ? 'yellow'
                : 'cyan'
            }
          >
            {announcement.level === 'warning' || announcement.level === 'alert' ? '⚠ ' : '📢 '}
            <Text bold>{announcement.title}: </Text>
            {announcement.url ? (
              <Text underline>
                {terminalLink(announcement.message, announcement.url)}
              </Text>
            ) : (
              announcement.message
            )}
          </Text>
        </Box>
      )}
      <Gap />
      <Text color={theme.gray} dimColor={theme.dimSecondary}>
        <Text color={BRAND_COLOR} underline>
          {terminalLink(`v${version}`, releaseUrl)}
        </Text>
        {latestVersion && latestVersion !== version && (
          <Text color="yellow">
            {' · update: '}
            <Text color={BRAND_COLOR} underline>
              {terminalLink(`v${latestVersion}`, `https://github.com/OpenSelena/open-nami/releases/tag/v${latestVersion}`)}
            </Text>
          </Text>
        )}
        {' · by '}
        <Text color={BRAND_COLOR} underline>
          {terminalLink('OpenSelena', 'https://github.com/OpenSelena')}
        </Text>
      </Text>
    </Box>
  )
}
