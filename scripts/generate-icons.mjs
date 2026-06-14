// Dependency-free PNG icon generator for the PWA.
// Draws a pop "clock" mark: coral rounded background + white face + hands.
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crc])
}

function encodePNG(size, pixels) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0 // filter
    for (let x = 0; x < size; x++) {
      const src = (y * size + x) * 4
      const dst = y * (size * 4 + 1) + 1 + x * 4
      raw[dst] = pixels[src]
      raw[dst + 1] = pixels[src + 1]
      raw[dst + 2] = pixels[src + 2]
      raw[dst + 3] = pixels[src + 3]
    }
  }
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const BG = [255, 243, 176] // baby yellow
const PINK = [255, 45, 149] // shocking pink
const PINK_DARK = [196, 20, 122]
const FACE = [255, 249, 230]
const WHITE = [255, 255, 255]

const mix = (a, b, t) => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
]
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

// Puffy, glossy 3D pink clock on a baby-yellow rounded background.
function draw(size, maskable) {
  const px = new Uint8Array(size * size * 4)
  const cx = size / 2
  const cy = size / 2
  const corner = size * 0.22
  const bodyR = size * (maskable ? 0.34 : 0.4)
  const faceR = bodyR * 0.62

  const set = (x, y, [r, g, b], a = 255) => {
    const i = (y * size + x) * 4
    px[i] = r
    px[i + 1] = g
    px[i + 2] = b
    px[i + 3] = a
  }

  const inRounded = (x, y) => {
    if (maskable) return true
    const dx = Math.min(x, size - 1 - x)
    const dy = Math.min(y, size - 1 - y)
    if (dx >= corner || dy >= corner) return true
    return (corner - dx) ** 2 + (corner - dy) ** 2 <= corner * corner
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!inRounded(x, y)) {
        set(x, y, [0, 0, 0], 0)
        continue
      }
      set(x, y, BG)
      const d = Math.hypot(x - cx, y - cy)
      if (d > bodyR) continue

      const nx = (x - cx) / bodyR
      const ny = (y - cy) / bodyR

      if (d > faceR) {
        // puffy pink body: top-left highlight, bottom-right rim shadow
        let col = PINK
        const light = clamp(-(nx + ny) * 0.5 + 0.12, 0, 1)
        col = mix(col, WHITE, light * 0.55)
        const edge = d / bodyR
        if (edge > 0.82) col = mix(col, PINK_DARK, ((edge - 0.82) / 0.18) * 0.8)
        // glossy specular spot (top-left)
        const hx = (x - (cx - 0.34 * bodyR)) / (bodyR * 0.3)
        const hy = (y - (cy - 0.44 * bodyR)) / (bodyR * 0.18)
        if (hx * hx + hy * hy < 1) col = mix(col, WHITE, 0.55)
        set(x, y, col)
      } else {
        // clock face with gentle top sheen
        set(x, y, mix(FACE, WHITE, clamp(-ny * 0.25, 0, 0.25)))
      }
    }
  }

  // hands
  const drawHand = (angleDeg, length, width, color) => {
    const rad = (angleDeg - 90) * (Math.PI / 180)
    const ex = cx + Math.cos(rad) * length
    const ey = cy + Math.sin(rad) * length
    const steps = Math.ceil(length * 2)
    for (let s = 0; s <= steps; s++) {
      const t = s / steps
      const x = cx + (ex - cx) * t
      const y = cy + (ey - cy) * t
      for (let oy = -width; oy <= width; oy++)
        for (let ox = -width; ox <= width; ox++) {
          const xx = Math.round(x + ox)
          const yy = Math.round(y + oy)
          if (xx >= 0 && yy >= 0 && xx < size && yy < size && inRounded(xx, yy)) set(xx, yy, color)
        }
    }
  }
  drawHand(300, faceR * 0.5, size * 0.02, PINK) // hour -> 10
  drawHand(60, faceR * 0.68, size * 0.017, PINK_DARK) // minute -> 2

  // center dot
  const dot = size * 0.03
  for (let y = -dot; y <= dot; y++)
    for (let x = -dot; x <= dot; x++)
      if (x * x + y * y <= dot * dot) set(Math.round(cx + x), Math.round(cy + y), PINK_DARK)

  return px
}

function out(path, buf) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, buf)
  console.log('wrote', path, buf.length, 'bytes')
}

const pub = new URL('../public/', import.meta.url).pathname

out(pub + 'icon-192.png', encodePNG(192, draw(192, false)))
out(pub + 'icon-512.png', encodePNG(512, draw(512, false)))
out(pub + 'icon-512-maskable.png', encodePNG(512, draw(512, true)))
out(pub + 'apple-touch-icon.png', encodePNG(180, draw(180, false)))

// favicon.svg (crisp at small sizes) — puffy pink clock on baby yellow
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <radialGradient id="p" cx="38%" cy="32%" r="70%">
      <stop offset="0%" stop-color="#FF9ED2"/>
      <stop offset="45%" stop-color="#FF2D95"/>
      <stop offset="100%" stop-color="#D4147A"/>
    </radialGradient>
  </defs>
  <rect width="64" height="64" rx="14" fill="#FFF3B0"/>
  <circle cx="32" cy="33" r="23" fill="url(#p)"/>
  <ellipse cx="24" cy="21" rx="10" ry="6" fill="#fff" opacity="0.45"/>
  <circle cx="32" cy="33" r="14.5" fill="#FFF9E6"/>
  <line x1="32" y1="33" x2="24.5" y2="26" stroke="#FF2D95" stroke-width="3" stroke-linecap="round"/>
  <line x1="32" y1="33" x2="40" y2="36" stroke="#D4147A" stroke-width="2.6" stroke-linecap="round"/>
  <circle cx="32" cy="33" r="2.4" fill="#D4147A"/>
</svg>`
out(pub + 'favicon.svg', Buffer.from(favicon))
