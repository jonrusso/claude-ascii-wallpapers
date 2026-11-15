// ASCII wallpapers in the block look: a deep gradient, a faint character grid,
// and a few big subjects built from block characters, two cells to the pixel.
// Each one is a self-contained SVG animated with CSS alone (a backdrop runs no
// script). Motion is stepped, so nothing repaints faster than about 12 times a
// second, and all of it stops under prefers-reduced-motion.

const W = 1600
const H = 1000
const CW = 9.6 // one JetBrains Mono cell at 16px
const LH = 20

const BASE = '#0a0a0f'
const ACCENT = '#a07aed'
const FONT = "'JetBrains Mono','JetBrainsMono Nerd Font','Cascadia Mono',Consolas,Menlo,monospace"

const FULL = '█'
const INKS = [FULL + FULL, FULL + FULL, '▓' + FULL, FULL + '▓', '▓▓']

// Body and highlight, one pair per subject.
const LAVENDER = ['#a98bf0', '#d9ccff']
const PINK = ['#ee7fb4', '#ffc2de']
const CORAL = ['#f5876a', '#ffc4a8']
const AMBER = ['#f2b23e', '#ffe2a0']
const MINT = ['#57c98a', '#b9f2cf']
const SKY = ['#49c6e0', '#b5f0fb']

// The same picture every time: a small seeded generator.
function rng(seed) {
  let a = seed >>> 0

  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const n1 = v => Math.round(v * 10) / 10

// One <text> per row, stretched to the cell grid so a fallback font still lines up.
function rows(lines, cls, cw, lh, x0, y0) {
  let out = ''

  lines.forEach((line, r) => {
    const s = line.replace(/\s+$/, '')
    const lead = s.length - s.trimStart().length

    if (s.length === lead) {
      return
    }
    const body = s.slice(lead)
    out += `<text class="${cls}" x="${n1(x0 + lead * cw)}" y="${n1(y0 + (r + 1) * lh - lh / 4)}" textLength="${n1(body.length * cw)}">${esc(body)}</text>`
  })

  return out
}

// A page of any size: gradient ground, a glow, graph paper at 5%.
// The root fills whatever box it is given: with no size of its own a surface may lay it out at nothing.
function page({ w, h, top, bottom, glow, style, body, grid = true, box = 'width="100%" height="100%"' }) {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" ${box} viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice" xml:space="preserve">` +
    `<defs><linearGradient id="bg" x1="0" y1="0" x2="0.25" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>` +
    `<radialGradient id="gw" cx="0.22" cy="0.1" r="0.8"><stop offset="0" stop-color="${glow}" stop-opacity=".55"/><stop offset="1" stop-color="${glow}" stop-opacity="0"/></radialGradient>` +
    (grid
      ? `<pattern id="gp" width="${CW * 4}" height="${LH * 2}" patternUnits="userSpaceOnUse"><text class="gpt" x="0" y="15">+···</text><text class="gpt" x="0" y="35">·</text></pattern>`
      : '') +
    `</defs><style>text{font-family:${FONT};font-size:16px;white-space:pre}.gpt{fill:#fff}${style}` +
    `@media (prefers-reduced-motion:reduce){*{animation:none!important}}</style>` +
    `<rect width="${w}" height="${h}" fill="url(#bg)"/><rect width="${w}" height="${h}" fill="url(#gw)"/>` +
    (grid ? `<rect width="${w}" height="${h}" fill="url(#gp)" opacity=".05"/>` : '') +
    `${body}</svg>`
  )
}

// One subject. `frames` are pixel maps: `a` body, `b` highlight, anything else
// empty. It bobs, sways, swaps frames to pulse, and its characters shimmer.
// `inward` is how far it steps toward the middle in a squarish and in a tall
// window, where the sides of the scene are cropped away. `lite` draws one
// still frame that only bobs, for the picker.
function subject(rand, n, spec) {
  const { frames, tone, x, y, size, bob = 10, drift = 56, pulse = 3.6, sway = 28, inward = [0, 0], lite = false } = spec
  const cw = CW * size
  const lh = LH * size
  const ink = line => [...line].map(px => (px === 'a' ? INKS[Math.floor(rand() * INKS.length)] : '  ')).join('')
  const shine = line => [...line].map(px => (px === 'b' ? FULL + FULL : '  ')).join('')
  const draw = (lines, cls) => rows(lines, `${cls} k${n}`, cw, lh, x, y)
  const [first, second = first] = frames
  const frame = (map, cls) =>
    `<g class="${cls}"><g class="sa">${draw(map.map(ink), `bd${n}`)}</g>` +
    (lite ? '' : `<g class="sb">${draw(map.map(ink), `bd${n}`)}</g>`) +
    `${draw(map.map(shine), `hl${n}`)}</g>`
  const base =
    `.k${n}{font-size:${n1(16 * size)}px}.bd${n}{fill:${tone[0]}}.hl${n}{fill:${tone[1]}}` +
    `.o${n}{animation:bob ${bob}s steps(${Math.round(bob * 4)}) -${n * 3}s infinite alternate}`

  if (lite) {
    return { css: base, body: `<g class="o${n}">${frame(first, 'fa')}</g>`, narrow: ['', ''] }
  }
  const shimmer = n1(1.7 + n * 0.3)

  return {
    css:
      base +
      `.v${n}{--w:${sway}px;animation:swy ${drift}s steps(${Math.round(drift * 1.5)}) -${n * 11}s infinite alternate}` +
      `.o${n} .fa{animation:fa ${pulse}s step-end infinite}.o${n} .fb{animation:fb ${pulse}s step-end infinite}` +
      `.o${n} .sa{animation:fa ${shimmer}s step-end infinite}.o${n} .sb{animation:fb ${shimmer}s step-end infinite}`,
    body: `<g class="p${n}"><g class="o${n}"><g class="v${n}">${frame(first, 'fa')}${frame(second, 'fb')}</g></g></g>`,
    narrow: [`.p${n}{transform:translateX(${inward[0]}px)}`, `.p${n}{transform:translateX(${inward[1]}px)}`],
  }
}

// Shared by every scene.
const BLOCK_CSS =
  `.fb,.sb{opacity:0}` +
  `@keyframes fa{0%{opacity:1}55%{opacity:0}}@keyframes fb{0%{opacity:0}55%{opacity:1}}` +
  `@keyframes bob{from{transform:translateY(-16px)}to{transform:translateY(16px)}}` +
  `@keyframes swy{from{transform:translateX(calc(var(--w)*-1))}to{transform:translateX(var(--w))}}` +
  `.du{fill-opacity:.24;animation:tw 9s step-end infinite}` +
  `@keyframes tw{0%{opacity:1}40%{opacity:.5}50%{opacity:.15}62%{opacity:.6}75%{opacity:1}}`

// A few single dim characters, some of them winking.
function dust(rand, count, color) {
  let css = `.du{fill:${color}}`
  let body = ''

  for (let i = 0; i < count; i += 1) {
    css += `.du${i}{animation-duration:${6 + Math.floor(rand() * 9)}s;animation-delay:-${Math.floor(rand() * 9)}s}`
    body += `<text class="du du${i}" x="${Math.round(rand() * W)}" y="${Math.round(rand() * H)}">${['.', '+', '*', '·', 'o'][i % 5]}</text>`
  }

  return { css, body }
}

// ---- Sprites ----

const JELLY = [
  [
    '...aaaaa...',
    '..abbaaaa..',
    '.abbaaaaaa.',
    '.abaaaaaaa.',
    'aaaaaaaaaaa',
    'aaaaaaaaaaa',
    '.a.aa.aa.a.',
    '.a..a..a.a.',
    '..a.a..a...',
    '..a..a.a...',
    '.a...a..a..',
    '.....a..a..',
  ],
  [
    '....aaa....',
    '..aabbaaa..',
    '..abbaaaa..',
    '.aabaaaaaa.',
    '.aaaaaaaaa.',
    '.aaaaaaaaa.',
    '..aaaaaaa..',
    '..a.a.a.a..',
    '..a.a.a.a..',
    '..a.a.a.a..',
    '...a.a.a...',
    '...a...a...',
  ],
]

const MOON = [
  [
    '...aaaa...',
    '..aaaaaa..',
    '.aabbaaaa.',
    'aabbaaaaaa',
    'aabaaaaaaa',
    'aaaaaaaaaa',
    'aaaaaaaaaa',
    '.aaaaaaaa.',
    '..aaaaaa..',
    '...aaaa...',
  ],
]

const TREE = [
  [
    '....aaa....',
    '..aabaaaa..',
    '.aabbaaaaa.',
    '.aaaaaaaba.',
    'aaabaaaaaaa',
    'aaaaaaabaaa',
    '.aaaaaaaaa.',
    '..aaaaaaa..',
    '.....a.....',
    '.....a.....',
    '....aaa....',
  ],
  [
    '....aaa....',
    '..aaaabaa..',
    '.aaaaabbaa.',
    '.abaaaaaaa.',
    'aaaaaaabaaa',
    'aaabaaaaaaa',
    '.aaaaaaaaa.',
    '..aaaaaaa..',
    '.....a.....',
    '.....a.....',
    '....aaa....',
  ],
]

const CHERRIES = [
  [
    '....aa.....',
    '...a..a....',
    '..a....a...',
    '.aaa...aaa.',
    'aabaa.aabaa',
    'aaaaa.aaaaa',
    'aaaaa.aaaaa',
    '.aaa...aaa.',
  ],
]

const RACK = [
  [
    'aaaaaaaaa',
    'abaaaaaba',
    'aaaaaaaaa',
    '.........',
    'aaaaaaaaa',
    'abbaaaaaa',
    'aaaaaaaaa',
    '.........',
    'aaaaaaaaa',
    'abaaabbaa',
    'aaaaaaaaa',
  ],
  [
    'aaaaaaaaa',
    'aabaaaaba',
    'aaaaaaaaa',
    '.........',
    'aaaaaaaaa',
    'abaaaabaa',
    'aaaaaaaaa',
    '.........',
    'aaaaaaaaa',
    'abbaaaaba',
    'aaaaaaaaa',
  ],
]

const MONITOR = [
  [
    'aaaaaaaaaaa',
    'abbbbbbbbba',
    'abbbbbbbbba',
    'aaaaaaaaaaa',
    'aaaaaaaaaaa',
    'aaaaaaaaaaa',
    '....aaa....',
    '...aaaaa...',
  ],
  [
    'aaaaaaaaaaa',
    'abbbbbbbbba',
    'abbbbbbbbba',
    'abbbbbbbbba',
    'abbbbbbbbba',
    'aaaaaaaaaaa',
    '....aaa....',
    '...aaaaa...',
  ],
]

const BAR = [
  ['aaaaaaaaaaaa', 'abbbbaaaaaaa', 'aaaaaaaaaaaa'],
  ['aaaaaaaaaaaa', 'abbbbbbbbbaa', 'aaaaaaaaaaaa'],
]

const DIAMOND = [
  [
    '....a....',
    '...aba...',
    '..abbaa..',
    '.abaaaaa.',
    'aaaaaaaaa',
    '.aaaaaaa.',
    '..aaaaa..',
    '...aaa...',
    '....a....',
  ],
]

const CURVE = [
  [
    '.........abb',
    '.......aaabb',
    '......aa....',
    '.....aa.....',
    '....aa......',
    'bb.aa.......',
    'bbaa........',
  ],
]

const SPARK = [
  [
    '....a....',
    '....a....',
    '...aba...',
    '..abbba..',
    'aabbbbbaa',
    '..abbba..',
    '...aba...',
    '....a....',
    '....a....',
  ],
  [
    '.........',
    '....a....',
    '....a....',
    '...aba...',
    '.aabbbaa.',
    '...aba...',
    '....a....',
    '....a....',
    '.........',
  ],
]

const TOWER = [
  [
    '..aaaa..',
    '..aaaa..',
    'aaaaaaaa',
    'abaabaaa',
    'aaaaaaaa',
    'aabaabaa',
    'aaaaaaaa',
    'abaaaaba',
    'aaaaaaaa',
    'aaabaaaa',
    'aaaaaaaa',
    'abaabaaa',
    'aaaaaaaa',
  ],
  [
    '..aaaa..',
    '..aaaa..',
    'aaaaaaaa',
    'abaaaaba',
    'aaaaaaaa',
    'aaaaabaa',
    'aaaaaaaa',
    'abaabaaa',
    'aaaaaaaa',
    'aabaaaba',
    'aaaaaaaa',
    'aaaabaaa',
    'aaaaaaaa',
  ],
]

const UMBRELLA = [
  [
    '...aaaaa...',
    '.aaabaaaaa.',
    'aaabaaaaaaa',
    'aaaaaaaaaaa',
    'a..a.a.a..a',
    '.....a.....',
    '.....a.....',
    '.....a.....',
    '...a.a.....',
    '...aaa.....',
  ],
]

const DROP = [
  ['..aa..', '..aa..', '.aaaa.', '.abaa.', 'aabaaa', 'aaaaaa', 'aaaaaa', '.aaaa.'],
]

const PLANET = [
  [
    '....aaaaa....',
    '...abbaaaa...',
    '..abbaaaaaa..',
    'bbbaaaaaaabbb',
    '..aaaaaaaaa..',
    '...aaaaaaa...',
    '....aaaaa....',
  ],
]

const CRESCENT = [
  ['..aaaa..', '.aab....', 'aab.....', 'aa......', 'aa......', 'aab.....', '.aab....', '..aaaa..'],
]

const COMET = [
  [
    '.........aaa',
    '.......aabba',
    '....aaaabbba',
    '..aaa..aaaa.',
    'a..a....a...',
  ],
]

const CURSOR = [Array(7).fill('aaaa'), Array(7).fill('....')]

const FONT5 = {
  J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  u: ['.....', '.....', '#...#', '#...#', '#...#', '#..##', '.##.#'],
  s: ['.....', '.....', '.####', '#....', '.###.', '....#', '####.'],
  t: ['.#...', '.#...', '####.', '.#...', '.#...', '.#..#', '..##.'],
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  r: ['.....', '.....', '#.##.', '##..#', '#....', '#....', '#....'],
  e: ['.....', '.....', '.###.', '#...#', '#####', '#....', '.###.'],
  a: ['.....', '.....', '.###.', '....#', '.####', '#...#', '.####'],
  '.': ['..', '..', '..', '..', '..', '##', '##'],
  ' ': ['...', '...', '...', '...', '...', '...', '...'],
}

// The words as one sprite, whole and then half fallen apart.
function words(text) {
  const rand = rng(88)
  const whole = Array.from({ length: 7 }, (_, r) =>
    [...text].map(ch => FONT5[ch][r].replace(/#/g, ch === '.' ? 'b' : 'a')).join('.'),
  )
  const loose = whole.map(line => [...line].map(px => (px !== '.' && rand() < 0.4 ? '.' : px)).join(''))

  return [whole, loose]
}

// ---- The eight scenes ----

const SCENES = [
  {
    id: 'coffee-farm',
    name: 'Coffee Farm Night',
    label: 'Farm',
    alt: 'A moon, a coffee tree and coffee cherries built from block characters over a warm brown dusk',
    mood: { top: '#3d2216', bottom: '#26140d', glow: '#8a4a22' },
    dust: '#ffd27a',
    cast: [
      { frames: MOON, tone: AMBER, x: 1380, y: -60, size: 1.4, bob: 14, inward: [-260, -470] },
      { frames: TREE, tone: MINT, x: -90, y: 610, size: 1.6, bob: 12, pulse: 5, inward: [300, 540] },
      { frames: CHERRIES, tone: CORAL, x: 1180, y: 710, size: 0.8, bob: 8, inward: [-170, -330] },
    ],
  },
  {
    id: 'render-farm',
    name: 'Render Farm',
    label: 'Render',
    alt: 'A server rack, a rendering monitor and a progress bar built from block characters on midnight blue',
    mood: { top: '#12204a', bottom: '#0a1233', glow: '#2848a0' },
    dust: '#b5c8ff',
    cast: [
      { frames: RACK, tone: LAVENDER, x: -60, y: 120, size: 1.5, bob: 13, pulse: 2.4, inward: [290, 520] },
      { frames: MONITOR, tone: PINK, x: 1300, y: 640, size: 1.1, bob: 10, pulse: 5, inward: [-230, -420] },
      { frames: BAR, tone: AMBER, x: 1250, y: 90, size: 0.9, bob: 9, pulse: 6, inward: [-200, -380] },
    ],
  },
  {
    id: 'keyframes',
    name: 'Keyframes',
    label: 'Keys',
    alt: 'Two keyframe diamonds and an easing curve built from block characters on deep plum',
    mood: { top: '#2c1744', bottom: '#1a0d30', glow: '#6230a0' },
    dust: '#e0c8ff',
    cast: [
      { frames: DIAMOND, tone: AMBER, x: 1390, y: 420, size: 1.5, bob: 11, sway: 60, drift: 40, inward: [-260, -470] },
      { frames: CURVE, tone: LAVENDER, x: -50, y: 60, size: 1.3, bob: 13, inward: [280, 500] },
      { frames: DIAMOND, tone: PINK, x: 150, y: 760, size: 0.8, bob: 8, sway: 70, drift: 34, inward: [150, 330] },
    ],
  },
  {
    id: 'particle-drift',
    name: 'Particle Drift',
    label: 'Drift',
    alt: 'Four sparks built from block characters, pulsing and drifting over deep indigo',
    mood: { top: '#1d1650', bottom: '#110a36', glow: '#4034b0' },
    dust: '#c9c2ff',
    cast: [
      { frames: SPARK, tone: LAVENDER, x: -80, y: 140, size: 1.5, bob: 12, pulse: 4.4, sway: 50, inward: [300, 520] },
      { frames: SPARK, tone: SKY, x: 1340, y: 560, size: 1, bob: 9, pulse: 3.2, sway: 60, inward: [-230, -430] },
      { frames: SPARK, tone: PINK, x: 1120, y: 60, size: 0.7, bob: 7, pulse: 2.6, sway: 40, inward: [-140, -300] },
      { frames: SPARK, tone: AMBER, x: 260, y: 800, size: 0.6, bob: 8, pulse: 3.8, sway: 40, inward: [120, 300] },
    ],
  },
  {
    id: 'deep-sea',
    name: 'Deep Sea',
    label: 'Sea',
    alt: 'Three jellyfish built from block characters, pulsing at the edges of dark teal water',
    mood: { top: '#07303b', bottom: '#06202b', glow: '#0f5a66' },
    dust: '#bff3ff',
    cast: [
      { frames: JELLY, tone: LAVENDER, x: -70, y: 500, size: 1.5, bob: 11, pulse: 4.2, inward: [300, 520] },
      { frames: JELLY, tone: PINK, x: 1310, y: -70, size: 1.2, bob: 9, pulse: 3.4, inward: [-240, -430] },
      { frames: JELLY, tone: CORAL, x: 1190, y: 690, size: 0.8, bob: 8, pulse: 3, inward: [-170, -330] },
    ],
  },
  {
    id: 'rain-on-glass',
    name: 'Rain on Glass',
    label: 'Rain',
    alt: 'A lit tower, an umbrella and a raindrop built from block characters on a wet blue night',
    mood: { top: '#172a45', bottom: '#0c1524', glow: '#2f558a' },
    dust: '#a8dcff',
    cast: [
      { frames: TOWER, tone: LAVENDER, x: -40, y: 640, size: 1.5, bob: 16, pulse: 6, sway: 10, inward: [280, 500] },
      { frames: UMBRELLA, tone: CORAL, x: 1280, y: 120, size: 1.1, bob: 10, sway: 40, inward: [-230, -420] },
      { frames: DROP, tone: SKY, x: 1150, y: 720, size: 0.9, bob: 6, inward: [-150, -310] },
    ],
  },
  {
    id: 'starfield',
    name: 'Starfield',
    label: 'Stars',
    alt: 'A ringed planet, a crescent moon and a comet built from block characters on midnight',
    mood: { top: '#0c1236', bottom: '#070a22', glow: '#22348a' },
    dust: '#ffffff',
    dustCount: 30,
    cast: [
      { frames: PLANET, tone: AMBER, x: 1370, y: 80, size: 1.3, bob: 14, inward: [-280, -520] },
      { frames: CRESCENT, tone: LAVENDER, x: 30, y: 640, size: 1.2, bob: 11, inward: [280, 500] },
      { frames: COMET, tone: PINK, x: 1100, y: 760, size: 0.8, bob: 7, sway: 80, drift: 30, inward: [-140, -300] },
    ],
  },
  {
    id: 'just-create',
    name: 'Just Create.',
    label: 'Create',
    alt: 'The words Just Create. built from block characters, coming together and falling apart, with a spark and a cursor',
    mood: { top: '#2d1538', bottom: '#1c0d28', glow: '#80306e' },
    dust: '#ffc2de',
    miniCast: [1, 2],
    cast: [
      { frames: words('Just Create.'), tone: [LAVENDER[0], AMBER[0]], x: 60, y: 90, size: 0.6, bob: 12, pulse: 7, sway: 14, inward: [240, 470] },
      { frames: SPARK, tone: PINK, x: 1350, y: 600, size: 1, bob: 9, pulse: 3.2, inward: [-240, -430] },
      { frames: CURSOR, tone: AMBER, x: 1180, y: 120, size: 1, bob: 8, pulse: 1.4, inward: [-150, -300] },
    ],
  },
]

function build(scene, seed) {
  const rand = rng(seed)
  const cast = scene.cast.map((one, n) => subject(rand, n, one))
  const motes = dust(rand, scene.dustCount ?? 16, scene.dust)

  return page({
    w: W,
    h: H,
    ...scene.mood,
    style:
      BLOCK_CSS +
      motes.css +
      cast.map(one => one.css).join('') +
      `@media (max-aspect-ratio:6/5){${cast.map(one => one.narrow[0]).join('')}}` +
      `@media (max-aspect-ratio:7/10){${cast.map(one => one.narrow[1]).join('')}}`,
    body: motes.body + cast.map(one => one.body).join(''),
  })
}

// A live miniature for the picker: the same ground with two of its subjects, bobbing.
function miniature(scene) {
  const rand = rng(31)
  const w = 384
  const h = 224
  const [big, small] = (scene.miniCast ?? [0, 1]).map(i => scene.cast[i])
  const fit = (spec, wide, tall) => {
    const map = spec.frames[0]
    const size = Math.min(wide / (map[0].length * 2 * CW), tall / (map.length * LH))

    return { size, width: map[0].length * 2 * CW * size, height: map.length * LH * size }
  }
  const a = fit(big, 150, 170)
  const b = fit(small, 84, 90)
  const cast = [
    subject(rand, 0, { ...big, size: a.size, x: w - a.width - 34, y: (h - a.height) / 2 - 8, bob: 6, lite: true }),
    subject(rand, 1, { ...small, size: b.size, x: 30, y: h - b.height - 22, bob: 5, lite: true }),
  ]

  return page({
    w,
    h,
    ...scene.mood,
    grid: false,
    box: 'x="1" y="1" width="62" height="34"',
    style: `@keyframes bob{from{transform:translateY(-8px)}to{transform:translateY(8px)}}` + cast.map(one => one.css).join(''),
    body: cast.map(one => one.body).join(''),
  })
}

/** The wallpapers, in picker order. */
export const WALLPAPERS = SCENES.map((scene, i) => ({
  id: scene.id,
  name: scene.name,
  label: scene.label,
  alt: scene.alt,
  glass: { blur: 6, tint: scene.mood.bottom, opacity: 0.25 },
  build: () => build(scene, 1000 + i * 77),
  mini: () => miniature(scene),
}))

export const OFF = { id: 'off', name: 'Off', label: 'Off' }

const built = new Map()

function once(key, make) {
  if (!built.has(key)) {
    built.set(key, make())
  }

  return built.get(key)
}

/** The scene's SVG, built once. */
export function sceneOf(id) {
  const wallpaper = WALLPAPERS.find(one => one.id === id)

  return wallpaper === undefined ? undefined : once(`scene:${id}`, wallpaper.build)
}

/** A small moving picture of a wallpaper for the picker, with a check badge when it is the one chosen. */
export function thumbOf(id, isSelected) {
  return once(`thumb:${id}:${isSelected}`, () => {
    const wallpaper = WALLPAPERS.find(one => one.id === id)
    const inside =
      wallpaper === undefined
        ? `<rect x="1" y="1" width="62" height="34" rx="5" fill="${BASE}"/><path d="M22 26L42 10" stroke="#6b6880" stroke-width="2" stroke-linecap="round"/>`
        : `<clipPath id="tc"><rect x="1" y="1" width="62" height="34" rx="5"/></clipPath><g clip-path="url(#tc)">${wallpaper.mini()}</g>`
    const badge = isSelected
      ? `<circle cx="54" cy="10" r="6" fill="${ACCENT}"/><path d="M51 10l2.2 2.2L57 8" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`
      : ''

    return (
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 36" width="64" height="36">${inside}` +
      `<rect x="1" y="1" width="62" height="34" rx="5" fill="none" stroke="${isSelected ? ACCENT : '#2a2836'}" stroke-width="${isSelected ? 1.5 : 1}"/>${badge}</svg>`
    )
  })
}
