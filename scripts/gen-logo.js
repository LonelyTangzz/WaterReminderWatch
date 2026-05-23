/**
 * 喝水提醒 Logo 生成器（零依赖，Node 原生）。
 * 输出 128×128 极简铃铛图标，透明背景贴合表盘。
 * 用法：node scripts/gen-logo.js
 */
var zlib = require('zlib')
var fs = require('fs')
var path = require('path')

var W = 128, H = 128, CX = 64, CY = 64
var pixels = Buffer.alloc(W * H * 4, 0)

function blend(x, y, r, g, b, a) {
  if (x < 0 || x >= W || y < 0 || y >= H || a === 0) return
  var i = (y * W + x) * 4
  var sa = a / 255, da = pixels[i + 3] / 255
  var oa = sa + da * (1 - sa)
  if (oa === 0) return
  pixels[i] = Math.round((r * sa + pixels[i] * da * (1 - sa)) / oa)
  pixels[i + 1] = Math.round((g * sa + pixels[i + 1] * da * (1 - sa)) / oa)
  pixels[i + 2] = Math.round((b * sa + pixels[i + 2] * da * (1 - sa)) / oa)
  pixels[i + 3] = Math.round(oa * 255)
}
function dist(x1, y1, x2, y2) {
  var dx = x1 - x2, dy = y1 - y2
  return Math.sqrt(dx * dx + dy * dy)
}

// ========== 铃铛图标（透明背景，柔和蓝灰） ==========
var bx = CX, by = CY - 4, br = 28

// 铃铛圆顶
for (var y = 0; y < H; y++) {
  for (var x = 0; x < W; x++) {
    var dx = x - bx, dy = y - by
    if (dy <= 6) {
      var d = Math.sqrt(dx * dx + (dy - 6) * (dy - 6)) / br
      if (d < 1) blend(x, y, 140, 160, 180, Math.round((1 - d * d) * 180))
    }
  }
}

// 铃铛下半部梯形
for (y = 0; y < H; y++) {
  for (var x = 0; x < W; x++) {
    var dx2 = x - bx, dy2 = y - by
    if (dy2 > 6 && dy2 < 26) {
      var prog = (dy2 - 6) / 20
      var halfW = br * (1 - prog * 0.55)
      if (Math.abs(dx2) < halfW) {
        var edgeDist = Math.abs(dx2) / halfW
        blend(x, y, 130, 150, 175, Math.round((1 - edgeDist * edgeDist * 0.5) * 160))
      }
    }
  }
}

// 底部横条
for (y = by + 22; y <= by + 30; y++) {
  for (var x = bx - br * 0.45; x <= bx + br * 0.45; x++) {
    var bdy = Math.abs(y - by - 26) / 4
    if (bdy < 1) blend(x, y, 150, 170, 195, Math.round((1 - bdy) * 170))
  }
}

// 内部镂空竖线
for (y = by + 18; y <= by + 24; y++) {
  for (var x = bx - 4; x <= bx + 4; x++) {
    blend(x, y, 0, 0, 0, 60)
  }
}

// 顶部圆钮
for (y = by - br - 6; y <= by - br + 2; y++) {
  for (var x = bx - 5; x <= bx + 5; x++) {
    var td = dist(x, y, bx, by - br - 1)
    if (td < 4.5) blend(x, y, 160, 180, 200, Math.round((1 - td / 4.5) * 180))
  }
}

// 高光
for (y = by - br + 2; y <= by + 4; y++) {
  for (var x = bx - br + 6; x <= bx - 4; x++) {
    var hd = dist(x, y, bx - 10, by - 6)
    if (hd < 14 && x > bx - br + 2 && y < by + 8) {
      blend(x, y, 200, 215, 230, Math.round((1 - hd / 14) * 50))
    }
  }
}

// 铃舌小球
for (y = by + 27; y <= by + 33; y++) {
  for (var x = bx - 3; x <= bx + 3; x++) {
    var bd = dist(x, y, bx, by + 30)
    if (bd < 3.5) blend(x, y, 140, 160, 185, Math.round((1 - bd / 3.5) * 170))
  }
}

// ========== PNG 输出 ==========
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
  var row = Buffer.alloc(1 + W * 4); row[0] = 0
  pixels.copy(row, 1, y * W * 4, (y + 1) * W * 4)
  rows.push(row)
}
var sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
var ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4)
ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0

var out = Buffer.concat([sig, pngChunk('IHDR', ihdr), pngChunk('IDAT', zlib.deflateSync(Buffer.concat(rows))), pngChunk('IEND', Buffer.alloc(0))])
var outPath = path.join(__dirname, '..', 'src', 'common', 'logo.png')
fs.writeFileSync(outPath, out)
fs.writeFileSync(path.join(__dirname, '..', 'src', 'common', 'logo_visible.png'), out)
console.log('✅ Bell logo: ' + outPath + ' (' + out.length + ' bytes)')
