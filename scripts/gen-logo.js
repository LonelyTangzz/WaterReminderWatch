/**
 * 喝水提醒 Logo 生成器（零依赖，Node 原生）。
 *
 * 生成 128×128 RGBA PNG：简约水杯图标
 *   - 深色圆形底
 *   - 白色简约水杯（圆角杯身 + 把手）
 *   - 蓝色水面 + 波纹
 *   - 顶部水滴装饰
 *
 * 用法：node scripts/gen-logo.js
 * 输出：src/common/logo.png
 */
var zlib = require('zlib')
var fs = require('fs')
var path = require('path')

var W = 128
var H = 128
var CX = 64
var CY = 64

var pixels = Buffer.alloc(W * H * 4, 0)

function setPixel(x, y, r, g, b, a) {
  if (x < 0 || x >= W || y < 0 || y >= H) return
  var i = (y * W + x) * 4
  pixels[i] = r; pixels[i + 1] = g; pixels[i + 2] = b; pixels[i + 3] = a
}

function blendPixel(x, y, r, g, b, a) {
  if (x < 0 || x >= W || y < 0 || y >= H || a === 0) return
  var i = (y * W + x) * 4
  var sa = a / 255
  var da = pixels[i + 3] / 255
  var oa = sa + da * (1 - sa)
  if (oa === 0) return
  pixels[i] = Math.round((r * sa + pixels[i] * da * (1 - sa)) / oa)
  pixels[i + 1] = Math.round((g * sa + pixels[i + 1] * da * (1 - sa)) / oa)
  pixels[i + 2] = Math.round((b * sa + pixels[i + 2] * da * (1 - sa)) / oa)
  pixels[i + 3] = Math.round(oa * 255)
}

function lerp(a, b, t) { return a + (b - a) * t }
function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v }
function dist(x1, y1, x2, y2) {
  var dx = x1 - x2; var dy = y1 - y2
  return Math.sqrt(dx * dx + dy * dy)
}

// ========================================
// 圆形深色背景
// ========================================
for (var y = 0; y < H; y++) {
  for (var x = 0; x < W; x++) {
    var d = dist(x, y, CX, CY)
    if (d <= 59) {
      var t = d / 59
      setPixel(x, y,
        Math.round(lerp(8, 22, t)),
        Math.round(lerp(18, 32, t)),
        Math.round(lerp(40, 52, t)),
        255
      )
    }
  }
}

// ========================================
// 水杯杯身（白色圆角矩形）
// ========================================
var cupL = 32
var cupR = 96
var cupT = 28
var cupB = 90
var cupRnd = 10

function insideCupBody(x, y) {
  if (x < cupL || x > cupR || y < cupT || y > cupB) return false
  if (y < cupT + cupRnd) {
    if (x < cupL + cupRnd && dist(x, y, cupL + cupRnd, cupT + cupRnd) > cupRnd) return false
    if (x > cupR - cupRnd && dist(x, y, cupR - cupRnd, cupT + cupRnd) > cupRnd) return false
  }
  if (y > cupB - cupRnd) {
    if (x < cupL + cupRnd && dist(x, y, cupL + cupRnd, cupB - cupRnd) > cupRnd) return false
    if (x > cupR - cupRnd && dist(x, y, cupR - cupRnd, cupB - cupRnd) > cupRnd) return false
  }
  return true
}

// 杯身填充
for (y = cupT; y <= cupB; y++) {
  for (var x = cupL; x <= cupR; x++) {
    if (insideCupBody(x, y)) {
      blendPixel(x, y, 235, 242, 248, 255)
    }
  }
}

// ========================================
// 水面（蓝色渐变，约55%高度）
// ========================================
var waterTop = 58

for (y = waterTop; y <= cupB - cupRnd; y++) {
  for (var x = cupL + cupRnd - 2; x <= cupR - cupRnd + 2; x++) {
    if (!insideCupBody(x, y)) continue
    var wt = (y - waterTop) / (cupB - cupRnd - waterTop)
    wt = clamp(wt, 0, 1)
    var wr = Math.round(lerp(100, 28, wt))
    var wg = Math.round(lerp(200, 140, wt))
    var wb = Math.round(lerp(252, 222, wt))
    blendPixel(x, y, wr, wg, wb, 220)
  }
}

// 水面波纹
for (y = waterTop - 3; y <= waterTop + 3; y++) {
  for (var x = cupL + 6; x <= cupR - 6; x++) {
    if (!insideCupBody(x, y)) continue
    var phase = (x - cupL) / (cupR - cupL) * Math.PI * 2.5
    var waveY = waterTop + Math.sin(phase) * 3
    if (Math.abs(y - waveY) < 2.5) {
      var alpha = Math.round((1 - Math.abs(y - waveY) / 3) * 120)
      blendPixel(x, y, 150, 225, 255, alpha)
    }
  }
}

// ========================================
// 杯身左边缘高光
// ========================================
for (y = cupT + cupRnd + 2; y <= cupB - cupRnd - 2; y++) {
  for (var dx = 0; dx < 4; dx++) {
    var hx = cupL + cupRnd + dx
    if (hx < cupR && insideCupBody(hx, y)) {
      blendPixel(hx, y, 200, 220, 240, Math.round((1 - dx / 4) * 55))
    }
  }
}

// ========================================
// 杯口描边
// ========================================
for (y = cupT - 1; y <= cupT + 1; y++) {
  for (var x = cupL + cupRnd - 1; x <= cupR - cupRnd + 1; x++) {
    if (insideCupBody(x, y)) {
      blendPixel(x, y, 175, 195, 218, 180)
    }
  }
}

// ========================================
// 把手（右侧弧形）
// ========================================
var handleCX = cupR + 8
var handleCY = CY + 4
var handleOuterR = 16
var handleInnerR = 8

for (y = 0; y < H; y++) {
  for (var x = 0; x < W; x++) {
    var hd = dist(x, y, handleCX, handleCY)
    if (hd >= handleInnerR && hd <= handleOuterR) {
      if (x >= handleCX - 2 && y > cupT + 10 && y < cupB - 10) {
        var ha = Math.round((1 - Math.abs(hd - 12) / 4) * 210)
        blendPixel(x, y, 195, 212, 228, clamp(ha, 0, 255))
      }
    }
  }
}

// ========================================
// 顶部小水滴装饰
// ========================================
var dropCX = 60
var dropCY = 15
var dropR = 7

function insideDrop(x, y) {
  var dx = x - dropCX
  var dy = y - dropCY
  if (dy <= 2) return dx * dx + (dy - 2) * (dy - 2) <= dropR * dropR
  var tipY = dropCY + 14
  if (dy > tipY - dropCY) return false
  var prog = (dy - 2) / (tipY - dropCY - 2)
  var r = dropR * (1 - prog * prog * 0.9)
  return Math.abs(dx) <= r
}

for (y = 0; y < H; y++) {
  for (var x = 0; x < W; x++) {
    if (insideDrop(x, y)) {
      var dt = (y - dropCY + dropR) / (dropR * 2 + 12)
      dt = clamp(dt, 0, 1)
      var dr = Math.round(lerp(130, 50, dt))
      var dg = Math.round(lerp(220, 160, dt))
      var db = Math.round(lerp(252, 230, dt))
      blendPixel(x, y, dr, dg, db, 230)
    }
  }
}

// 水滴高光
for (y = dropCY - 4; y <= dropCY; y++) {
  for (var x = dropCX - 3; x <= dropCX + 1; x++) {
    var hld = dist(x, y, dropCX - 1, dropCY - 2)
    if (hld < 4 && insideDrop(x, y)) {
      blendPixel(x, y, 200, 240, 255, Math.round((1 - hld / 4) * 120))
    }
  }
}

// ========================================
// 外圈圆环描边
// ========================================
for (y = 0; y < H; y++) {
  for (var x = 0; x < W; x++) {
    var d2 = dist(x, y, CX, CY)
    if (d2 > 56 && d2 < 61) {
      var aa = Math.round((1 - Math.abs(d2 - 58.5) / 2.5) * 155)
      blendPixel(x, y, 80, 160, 220, aa)
    }
  }
}

// ========================================
// PNG 输出
// ========================================
function crc32(buf) {
  var table = []
  for (var n = 0; n < 256; n++) {
    var c = n
    for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
    table[n] = c
  }
  var crc = 0xFFFFFFFF
  for (var i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8)
  return (crc ^ 0xFFFFFFFF) >>> 0
}

function pngChunk(type, data) {
  var len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0)
  var tb = Buffer.from(type, 'ascii')
  var cb = Buffer.alloc(4); cb.writeUInt32BE(crc32(Buffer.concat([tb, data])), 0)
  return Buffer.concat([len, tb, data, cb])
}

var rows = []
for (y = 0; y < H; y++) {
  var row = Buffer.alloc(1 + W * 4)
  row[0] = 0
  pixels.copy(row, 1, y * W * 4, (y + 1) * W * 4)
  rows.push(row)
}

var sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
var ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4)
ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0

var out = Buffer.concat([
  sig,
  pngChunk('IHDR', ihdr),
  pngChunk('IDAT', zlib.deflateSync(Buffer.concat(rows))),
  pngChunk('IEND', Buffer.alloc(0))
])

var outPath = path.join(__dirname, '..', 'src', 'common', 'logo.png')
fs.writeFileSync(outPath, out)
console.log('✅ Logo generated: ' + outPath)
console.log('   Size: ' + out.length + ' bytes')
