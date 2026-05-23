/**
 * 喝水提醒 Logo 生成器（零依赖，Node 原生）。
 *
 * 生成一个 128×128 的 RGBA PNG，包含：
 *   - 深色圆形背景
 *   - 渐变水滴造型（青→蓝）
 *   - 高光反射
 *   - 小铃铛提醒标记
 *
 * 用法：node scripts/gen-logo.js
 * 输出：src/common/logo.png
 */
var zlib = require('zlib')
var fs = require('fs')
var path = require('path')

var W = 128
var H = 128
var CENTER_X = 64
var CENTER_Y = 64

// ── 像素缓冲区 RGBA ──
var pixels = Buffer.alloc(W * H * 4, 0) // 全透明黑

function setPixel(x, y, r, g, b, a) {
  if (x < 0 || x >= W || y < 0 || y >= H) return
  var idx = (y * W + x) * 4
  pixels[idx] = r
  pixels[idx + 1] = g
  pixels[idx + 2] = b
  pixels[idx + 3] = a
}

function blendPixel(x, y, r, g, b, a) {
  if (x < 0 || x >= W || y < 0 || y >= H) return
  var idx = (y * W + x) * 4
  var srcA = a / 255
  var dstA = pixels[idx + 3] / 255
  var outA = srcA + dstA * (1 - srcA)
  if (outA === 0) return
  pixels[idx] = Math.round((r * srcA + pixels[idx] * dstA * (1 - srcA)) / outA)
  pixels[idx + 1] = Math.round((g * srcA + pixels[idx + 1] * dstA * (1 - srcA)) / outA)
  pixels[idx + 2] = Math.round((b * srcA + pixels[idx + 2] * dstA * (1 - srcA)) / outA)
  pixels[idx + 3] = Math.round(outA * 255)
}

// ── 辅助 ──
function lerp(a, b, t) { return a + (b - a) * t }
function dist(x1, y1, x2, y2) {
  var dx = x1 - x2; var dy = y1 - y2
  return Math.sqrt(dx * dx + dy * dy)
}
function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v }

// ── 圆形背景 ──
for (var y = 0; y < H; y++) {
  for (var x = 0; x < W; x++) {
    var d = dist(x, y, CENTER_X, CENTER_Y)
    if (d <= 60) {
      // 深色背景渐变
      var t = d / 60
      var rr = Math.round(lerp(10, 25, t))
      var gg = Math.round(lerp(15, 30, t))
      var bb = Math.round(lerp(30, 45, t))
      setPixel(x, y, rr, gg, bb, 255)
    }
  }
}

// ── 水滴造型 ──
// 水滴由上半圆 + 下半尖角组成
function isInsideDrop(x, y) {
  var dx = x - CENTER_X
  var dy = y - CENTER_Y

  // 水滴中心上移一点
  var cy = CENTER_Y - 6

  var dy2 = y - cy
  var dx2 = x - CENTER_X

  // 上半部分：圆形
  if (dy2 <= 6) {
    return dx2 * dx2 + (dy2 - 6) * (dy2 - 6) <= 24 * 24
  }

  // 下半部分：逐渐收窄的三角形
  var tipY = cy + 38 // 尖端
  if (dy2 > tipY - cy) return false

  var progress = (dy2 - 6) / (tipY - cy - 6) // 0 at circle bottom, 1 at tip
  var radius = 24 * (1 - progress * progress * 0.95) // 逐渐收窄
  return Math.abs(dx2) <= radius
}

// ── 水滴渐变填充 ──
for (y = 0; y < H; y++) {
  for (var x = 0; x < W; x++) {
    if (isInsideDrop(x, y)) {
      var dx3 = x - CENTER_X
      var dy3 = y - (CENTER_Y - 6)

      // 从上到下：亮青 → 中蓝 → 深蓝
      var t = (dy3 + 28) / 56 // 0(顶部) → 1(底部)
      t = clamp(t, 0, 1)

      var rr = Math.round(lerp(30, 1, t))
      var gg = Math.round(lerp(180, 90, t))
      var bb = Math.round(lerp(240, 160, t))

      // 左到右微变
      var hT = (dx3 + 24) / 48
      hT = clamp(hT, 0, 1)
      rr = Math.round(lerp(rr, rr + 15, hT * 0.3))
      gg = Math.round(lerp(gg, gg + 10, hT * 0.3))

      blendPixel(x, y, clamp(rr, 0, 255), clamp(gg, 0, 255), clamp(bb, 0, 255), 240)
    }
  }
}

// ── 高光反射（左上白色椭圆光斑） ──
for (y = 30; y < 60; y++) {
  for (var x = 44; x < 70; x++) {
    var hdx = x - 55
    var hdy = y - 44
    var hd = Math.sqrt(hdx * hdx / 1.5 + hdy * hdy / 1.2)
    if (hd < 10 && isInsideDrop(x, y)) {
      var alpha = Math.round((1 - hd / 10) * 140)
      blendPixel(x, y, 200, 240, 255, alpha)
    }
  }
}

// ── 小铃铛提醒标记（右上角） ──
var bellX = 82
var bellY = 30
var bellR = 11

// 铃铛圆顶
for (y = bellY - bellR; y < bellY + 6; y++) {
  for (var x = bellX - bellR; x < bellX + bellR; x++) {
    var bdx = x - bellX
    var bdy = y - bellY
    var bd = Math.sqrt(bdx * bdx + bdy * bdy)
    if (bd < bellR && bdy < 4) {
      var alpha = Math.round((1 - bd / bellR) * 200)
      blendPixel(x, y, 255, 200, 80, alpha)
    }
  }
}

// 铃铛底部横条
for (y = bellY + 2; y < bellY + 7; y++) {
  for (var x = bellX - 8; x < bellX + 9; x++) {
    var bdx2 = x - bellX
    var bdy2 = y - (bellY + 4)
    var bd2 = Math.sqrt(bdx2 * bdx2 / 1.5 + bdy2 * bdy2)
    if (bd2 < 7) {
      blendPixel(x, y, 255, 180, 60, 200)
    }
  }
}

// 铃铛小圆球
for (y = bellY + 6; y < bellY + 11; y++) {
  for (var x = bellX - 2; x < bellX + 3; x++) {
    var bd3 = dist(x, y, bellX, bellY + 8)
    if (bd3 < 3) {
      blendPixel(x, y, 255, 200, 80, 220)
    }
  }
}

// ── 外圈描边 ──
for (y = 0; y < H; y++) {
  for (var x = 0; x < W; x++) {
    var d2 = dist(x, y, CENTER_X, CENTER_Y)
    if (d2 > 58 && d2 < 62) {
      blendPixel(x, y, 60, 140, 200, Math.round((1 - Math.abs(d2 - 60) / 2) * 180))
    }
  }
}

// ── 输出 PNG ──
function crc32(buf) {
  var table = []
  for (var n = 0; n < 256; n++) {
    var c = n
    for (var k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
    }
    table[n] = c
  }
  var crc = 0xFFFFFFFF
  for (var i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8)
  }
  return (crc ^ 0xFFFFFFFF) >>> 0
}

function pngChunk(type, data) {
  var len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  var typeB = Buffer.from(type, 'ascii')
  var crcIn = Buffer.concat([typeB, data])
  var crcB = Buffer.alloc(4)
  crcB.writeUInt32BE(crc32(crcIn), 0)
  return Buffer.concat([len, typeB, data, crcB])
}

// 原始像素数据（每行加 filter byte 0）
var rawRows = []
for (y = 0; y < H; y++) {
  var row = Buffer.alloc(1 + W * 4)
  row[0] = 0 // filter: none
  pixels.copy(row, 1, y * W * 4, (y + 1) * W * 4)
  rawRows.push(row)
}
var rawData = Buffer.concat(rawRows)
var deflated = zlib.deflateSync(rawData)

var signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
var ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(W, 0)
ihdr.writeUInt32BE(H, 4)
ihdr[8] = 8  // bit depth
ihdr[9] = 6  // color type: RGBA
ihdr[10] = 0 // compression
ihdr[11] = 0 // filter
ihdr[12] = 0 // interlace

var out = Buffer.concat([
  signature,
  pngChunk('IHDR', ihdr),
  pngChunk('IDAT', deflated),
  pngChunk('IEND', Buffer.alloc(0))
])

var outPath = path.join(__dirname, '..', 'src', 'common', 'logo.png')
fs.writeFileSync(outPath, out)
console.log('✅ Logo generated: ' + outPath)
console.log('   Size: ' + out.length + ' bytes')
