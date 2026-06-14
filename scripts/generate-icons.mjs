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

const CORAL = [255, 107, 107]
const WHITE = [255, 255, 255]
const INK = [26, 26, 26]

function draw(size, maskable) {
  const px = new Uint8Array(size * size * 4)
  const cx = size / 2
  const cy = size / 2
  const corner = size * 0.22
  const faceR = size * (maskable ? 0.3 : 0.34)
  const ringInner = faceR * 0.82

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
    const ddx = corner - dx
    const ddy = corner - dy
    return ddx * ddx + ddy * ddy <= corner * corner
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!inRounded(x, y)) {
        set(x, y, [0, 0, 0], 0)
        continue
      }
      set(x, y, CORAL)
      const d = Math.hypot(x - cx, y - cy)
      if (d <= faceR) set(x, y, WHITE)
      if (d <= faceR && d >= ringInner) set(x, y, CORAL) // ring
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
          if (xx >= 0 && yy >= 0 && xx < size && yy < size && inRounded(xx, yy))
            set(xx, yy, color)
        }
    }
  }
  drawHand(300, faceR * 0.45, size * 0.018, INK) // hour -> 10
  drawHand(60, faceR * 0.6, size * 0.016, CORAL) // minute -> 2

  // center dot
  for (let y = -size * 0.03; y <= size * 0.03; y++)
    for (let x = -size * 0.03; x <= size * 0.03; x++)
      if (x * x + y * y <= (size * 0.03) ** 2)
        set(Math.round(cx + x), Math.round(cy + y), INK)

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

// favicon.svg (crisp at small sizes)
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#FF6B6B"/>
  <circle cx="32" cy="32" r="19" fill="#fff"/>
  <circle cx="32" cy="32" r="15.5" fill="#FF6B6B"/>
  <line x1="32" y1="32" x2="24" y2="24" stroke="#1A1A1A" stroke-width="3" stroke-linecap="round"/>
  <line x1="32" y1="32" x2="41" y2="38" stroke="#FF6B6B" stroke-width="2.5" stroke-linecap="round"/>
  <circle cx="32" cy="32" r="2.5" fill="#1A1A1A"/>
</svg>`
out(pub + 'favicon.svg', Buffer.from(favicon))
