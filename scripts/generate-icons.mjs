// Dependency-free PNG icon generator for the PWA.
// Minimal, flat "Instagram-style" icon: squircle with a diagonal pink->yellow
// gradient and a thin white outline clock. Rendered at 4x and downsampled (AA).
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
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}

const PINK = [255, 45, 149] // #FF2D95
const YELLOW = [255, 210, 63] // #FFD23F
const WHITE = [255, 255, 255]

const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

// distance from point (px,py) to segment (x1,y1)-(x2,y2)
function segDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1
  const dy = y2 - y1
  const len2 = dx * dx + dy * dy
  let t = len2 ? ((px - x1) * dx + (py - y1) * dy) / len2 : 0
  t = clamp(t, 0, 1)
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy))
}

function draw(size, maskable) {
  const SS = 4 // supersampling factor
  const W = size * SS
  const big = new Uint8Array(W * W * 4)
  const cx = W / 2
  const cy = W / 2

  // squircle (superellipse) shape; maskable fills the whole square
  const R = (W / 2) * 0.995
  const N = 4.5
  const inSquircle = (x, y) =>
    maskable ? true : Math.pow(Math.abs((x - cx) / R), N) + Math.pow(Math.abs((y - cy) / R), N) <= 1

  // thin outline clock geometry
  const faceR = W * (maskable ? 0.2 : 0.225)
  const stroke = W * 0.011 // half-width of the thin line
  const hourAng = (300 - 90) * (Math.PI / 180)
  const minAng = (60 - 90) * (Math.PI / 180)
  const hx = cx + Math.cos(hourAng) * faceR * 0.5
  const hy = cy + Math.sin(hourAng) * faceR * 0.5
  const mx = cx + Math.cos(minAng) * faceR * 0.72
  const my = cy + Math.sin(minAng) * faceR * 0.72

  const set = (x, y, [r, g, b], a) => {
    const i = (y * W + x) * 4
    big[i] = Math.round(r)
    big[i + 1] = Math.round(g)
    big[i + 2] = Math.round(b)
    big[i + 3] = a
  }

  for (let y = 0; y < W; y++) {
    for (let x = 0; x < W; x++) {
      if (!inSquircle(x, y)) {
        set(x, y, [0, 0, 0], 0)
        continue
      }
      // diagonal gradient: top-left pink -> bottom-right yellow
      const t = clamp((x / W + y / W) / 2, 0, 1)
      let col = mix(PINK, YELLOW, t)

      const d = Math.hypot(x - cx, y - cy)
      const onRing = Math.abs(d - faceR) <= stroke
      const onHour = segDist(x, y, cx, cy, hx, hy) <= stroke * 0.9
      const onMin = segDist(x, y, cx, cy, mx, my) <= stroke * 0.85
      const onDot = d <= stroke * 1.5
      if (onRing || onHour || onMin || onDot) col = WHITE

      set(x, y, col, 255)
    }
  }

  // downsample with premultiplied alpha to avoid dark fringes
  const out = new Uint8Array(size * size * 4)
  for (let oy = 0; oy < size; oy++) {
    for (let ox = 0; ox < size; ox++) {
      let r = 0,
        g = 0,
        b = 0,
        a = 0
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const i = ((oy * SS + sy) * W + (ox * SS + sx)) * 4
          const al = big[i + 3] / 255
          r += big[i] * al
          g += big[i + 1] * al
          b += big[i + 2] * al
          a += al
        }
      }
      const o = (oy * size + ox) * 4
      if (a > 0) {
        out[o] = Math.round(r / a)
        out[o + 1] = Math.round(g / a)
        out[o + 2] = Math.round(b / a)
      }
      out[o + 3] = Math.round((a / (SS * SS)) * 255)
    }
  }
  return out
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

// favicon.svg — same minimal flat design
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FF2D95"/>
      <stop offset="1" stop-color="#FFD23F"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="16" fill="url(#g)"/>
  <g fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round">
    <circle cx="32" cy="32" r="14.5"/>
    <line x1="32" y1="32" x2="25.5" y2="28.5"/>
    <line x1="32" y1="32" x2="41" y2="27"/>
  </g>
  <circle cx="32" cy="32" r="1.8" fill="#fff"/>
</svg>`
out(pub + 'favicon.svg', Buffer.from(favicon))
