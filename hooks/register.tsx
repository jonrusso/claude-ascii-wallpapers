import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, ThemeSetArgs } from 'claude-code'

import type { WallpaperTab } from '../types'
import { makeColors } from './make-colors.js'
import { OFF, WALLPAPERS, sceneOf, thumbOf } from './scenes.js'

const DEFAULT = 'coffee-farm'
const BASE = '#0a0a0f'
const INITIAL_TAB: WallpaperTab = 'wallpapers'

const choice = atom({ plugin: 'ascii-wallpapers', key: 'choice' } as const, DEFAULT)
const tab = atom({ plugin: 'ascii-wallpapers', key: 'tab' } as const, INITIAL_TAB)
const offset = atom({ plugin: 'ascii-wallpapers', key: 'offset' } as const, 0)

// Near-black with a violet cast; purple leads, cyan, green and orange follow.
const { theme, problems } = makeColors({
  label: 'ASCII wallpapers',
  only: 'dark',
  roles: { accent: '#a07aed', danger: '#f0616d', success: '#22c55e', warning: '#ff9b4c', pro: '#06b6d4' },
  dark: {
    gray: {
      anchors: {
        'surface-0': BASE,
        'surface-1': '#101018',
        'surface-2': '#15151f',
        'surface-3': '#1a1a26',
        'text-primary': '#eceaf5',
        'text-secondary': '#c3c0d4',
        'text-muted': '#9a97ae',
      },
    },
  },
})

const PICKS = [...WALLPAPERS, OFF]
const isPick = (id: unknown): id is string => PICKS.some(one => one.id === id)

// Each wallpaper frosts the app's panels in its own mood, so the scene shows
// through the sidebar and the bars.
function lookOf(id: string): ThemeSetArgs {
  const wallpaper = WALLPAPERS.find(one => one.id === id)

  return {
    colors: theme,
    backdrop: wallpaper === undefined ? { color: BASE } : { scene: id, glass: wallpaper.glass },
  }
}

// Sets the look and keeps what the app answered. A terminal draws no look, and
// that is no fault to report: the picker and the command still work there.
async function show($: EngineInterface, id: string) {
  const set = await $.theme.set(lookOf(id))
  await $.store.set('lastSet', { id, isDrawn: set.isDrawn, reason: set.isDrawn ? '' : set.reason })
}

async function pick($: EngineInterface, id: string) {
  await update($, choice, () => id)
  await $.store.set('choice', id)
  await show($, id)
}

export const register: Register = on => {
  let isAskNoted = false

  on('session.start', async ($, e, next) => {
    const stored = await $.store.get('choice')
    const id = isPick(stored) ? stored : DEFAULT
    await update($, choice, () => id)
    await $.command.register({
      name: 'wallpaper',
      description: 'Switch the ASCII wallpaper behind the chat',
      argumentHint: '<name|off>',
    })

    const unpainted = problems.find(line => line.startsWith("Desktop won't paint"))

    if (unpainted !== undefined) {
      $.ui.toast(unpainted)
    }
    await show($, id)

    return next(e)
  })

  on('command.run', { command: 'wallpaper' }, async ($, e) => {
    const asked = e.args.trim().toLowerCase()
    const names = PICKS.map(one => `${one.id} (${one.name})`).join(', ')

    if (asked === '') {
      return { text: `Wallpapers: ${names}.` }
    }

    // A plain loud ground with no scene and no palette, to tell whether the app
    // shows any backdrop at all.
    if (asked === 'test') {
      const set = await $.theme.set({ backdrop: { color: '#ff00aa' } })

      return {
        text: set.isDrawn
          ? 'Test ground set: the whole window should be hot pink behind the panels. Pick a wallpaper to go back.'
          : `Test ground not drawn: ${set.reason}`,
      }
    }
    const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
    const key = squash(asked)
    const found =
      PICKS.find(one => one.id === asked || squash(one.name) === key || squash(one.label) === key) ??
      PICKS.find(one => squash(one.id).includes(key) || squash(one.name).includes(key))

    if (found === undefined) {
      return { text: `No wallpaper called "${asked}". Try: ${names}.` }
    }
    await pick($, found.id)

    return { text: found.id === OFF.id ? 'Wallpaper off.' : `Wallpaper: ${found.name}.` }
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    // Told by the scene's id, not the plugin's name: a mod loaded from a folder
    // may be named `ascii-wallpapers@inline` here.
    const wallpaper = e.props.plugin.startsWith('ascii-wallpapers')
      ? WALLPAPERS.find(one => one.id === e.props.scene)
      : undefined

    if (!isAskNoted) {
      isAskNoted = true
      void $.store
        .set('lastAsk', { scene: e.props.scene, plugin: e.props.plugin, surface: e.surface })
        .catch(() => undefined)
    }
    const source = wallpaper === undefined ? undefined : sceneOf(wallpaper.id)

    if (wallpaper === undefined || source === undefined || (e.surface !== 'desktop' && e.surface !== 'mobile')) {
      return next(e)
    }
    const { Svg } = $.ui.resolve(e)

    return <Svg source={source} alt={wallpaper.alt} isInteractive />
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) {
      return next(e)
    }
    const current = await read($, choice)
    const open = await read($, tab)
    const { Box, Button, Text } = $.ui.resolve(e)
    // Thumbnails where the surface draws pictures; names alone in a terminal.
    const Svg = e.surface === 'desktop' || e.surface === 'mobile' ? $.ui.resolve(e).Svg : undefined

    // One line that never wraps: as many thumbnails as the band has room for,
    // and two arrows that slide the line a step, round and round.
    const room = Math.floor(((e.props.bodyColumns ?? 60) - 8) / 11)
    const count = Math.max(2, Math.min(PICKS.length, room))
    const first = (((await read($, offset)) % PICKS.length) + PICKS.length) % PICKS.length
    const line = Array.from({ length: count }, (_, i) => PICKS[(first + i) % PICKS.length]).filter(
      one => one !== undefined,
    )
    const slide = (by: number) => update($, offset, at => (at + by + PICKS.length) % PICKS.length)

    return (
      <Box flexDirection="column" gap="xs">
        <Box flexDirection="row" gap="xs">
          <Button
            key="tab-themes"
            label="Chat themes"
            variant={open === 'themes' ? 'primary' : 'secondary'}
            dimColor={open !== 'themes'}
            onPress={() => update($, tab, () => 'themes' as const)}
          />
          <Button
            key="tab-wallpapers"
            label="ASCII wallpapers"
            variant={open === 'wallpapers' ? 'primary' : 'secondary'}
            dimColor={open !== 'wallpapers'}
            onPress={() => update($, tab, () => 'wallpapers' as const)}
          />
        </Box>
        {open === 'themes' && <Text dimColor>No chat themes yet.</Text>}
        {open === 'wallpapers' && (
          <Box flexDirection="row" flexWrap="nowrap" gap="sm" alignItems="center" overflow="hidden">
            {count < PICKS.length && <Button key="back" plain label={'‹'} onPress={() => slide(-1)} />}
            {line.map(one => (
              <Box flexDirection="column" alignItems="center" flexShrink={0}>
                {Svg !== undefined && (
                  <Svg source={thumbOf(one.id, one.id === current)} alt={one.name} width={64} height={36} />
                )}
                <Button
                  key={one.id}
                  plain
                  label={one.id === current ? `✓ ${one.label}` : one.label}
                  dimColor={one.id !== current}
                  onPress={() => pick($, one.id)}
                />
              </Box>
            ))}
            {count < PICKS.length && <Button key="forward" plain label={'›'} onPress={() => slide(1)} />}
          </Box>
        )}
      </Box>
    )
  })
}
