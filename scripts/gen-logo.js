/**
 * 喝水提醒 Logo — 透明背景水杯（APP列表好看 + 表盘不突兀）
 */
var zlib = require('zlib'), fs = require('fs'), path = require('path')
var W = 128, H = 128, CX = 64, CY = 62
var P = Buffer.alloc(W * H * 4, 0)

function B(x, y, r, g, b, a) {
  if (x < 0 || x >= W || y < 0 || y >= H || a === 0) return
  var i = (y * W + x) * 4, sa = a / 255, da = P[i + 3] / 255, oa = sa + da * (1 - sa)
  if (oa === 0) return
  P[i] = Math.round((r * sa + P[i] * da * (1 - sa)) / oa)
  P[i + 1] = Math.round((g * sa + P[i + 1] * da * (1 - sa)) / oa)
  P[i + 2] = Math.round((b * sa + P[i + 2] * da * (1 - sa)) / oa)
  P[i + 3] = Math.round(oa * 255)
}
function D(x1, y1, x2, y2) { var dx = x1 - x2, dy = y1 - y2; return Math.sqrt(dx * dx + dy * dy) }
function L(a, b, t) { return a + (b - a) * t }
function C(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v }

// ===== 杯身 =====
var cl = 30, cr = 98, ct = 32, cb = 94, crn = 12
function inCup(x, y) {
  if (x < cl || x > cr || y < ct || y > cb) return false
  if (y < ct + crn) {
    if (x < cl + crn && D(x, y, cl + crn, ct + crn) > crn) return false
    if (x > cr - crn && D(x, y, cr - crn, ct + crn) > crn) return false
  }
  if (y > cb - crn) {
    if (x < cl + crn && D(x, y, cl + crn, cb - crn) > crn) return false
    if (x > cr - crn && D(x, y, cr - crn, cb - crn) > crn) return false
  }
  return true
}
for (var y = ct; y <= cb; y++)
  for (var x = cl; x <= cr; x++)
    if (inCup(x, y)) B(x, y, 240, 245, 250, 255)

// ===== 水面 =====
var wt = 62
for (y = wt; y <= cb - crn; y++)
  for (var x = cl + crn - 2; x <= cr - crn + 2; x++)
    if (inCup(x, y)) {
      var wt2 = (y - wt) / (cb - crn - wt), wt2 = C(wt2, 0, 1)
      B(x, y, Math.round(L(100, 28, wt2)), Math.round(L(200, 140, wt2)), Math.round(L(252, 222, wt2)), 220)
    }
// 波纹
for (y = wt - 3; y <= wt + 3; y++)
  for (var x = cl + 6; x <= cr - 6; x++)
    if (inCup(x, y)) {
      var ph = (x - cl) / (cr - cl) * Math.PI * 2.5, wy = wt + Math.sin(ph) * 3
      if (Math.abs(y - wy) < 2.5) B(x, y, 130, 210, 250, Math.round((1 - Math.abs(y - wy) / 3) * 110))
    }

// ===== 高光 =====
for (y = ct + crn + 2; y <= cb - crn - 2; y++)
  for (var dx = 0; dx < 5; dx++) {
    var hx = cl + crn + dx
    if (hx < cr && inCup(hx, y)) B(hx, y, 200, 220, 240, Math.round((1 - dx / 5) * 50))
  }

// ===== 杯口描边 =====
for (y = ct - 1; y <= ct + 1; y++)
  for (var x = cl + crn - 1; x <= cr - crn + 1; x++)
    if (inCup(x, y)) B(x, y, 180, 200, 220, 180)

// ===== 把手 =====
var hcx = cr + 8, hcy = CY + 6
for (y = 0; y < H; y++)
  for (var x = 0; x < W; x++) {
    var hd = D(x, y, hcx, hcy)
    if (hd >= 8 && hd <= 17 && x >= hcx - 2 && y > ct + 10 && y < cb - 10)
      B(x, y, 200, 215, 232, Math.round((1 - Math.abs(hd - 12.5) / 4.5) * 210))
  }

// ===== 顶部水滴 =====
var dx2 = CX, dy2 = 17, dr = 8
function inDrop(x, y) {
  var dx3 = x - dx2, dy3 = y - dy2
  if (dy3 <= 2) return dx3 * dx3 + (dy3 - 2) * (dy3 - 2) <= dr * dr
  var tip = dy2 + 15; if (dy3 > tip - dy2) return false
  var p = (dy3 - 2) / (tip - dy2 - 2), r = dr * (1 - p * p * 0.9)
  return Math.abs(dx3) <= r
}
for (y = 0; y < H; y++)
  for (var x = 0; x < W; x++)
    if (inDrop(x, y)) {
      var dt = (y - dy2 + dr) / (dr * 2 + 12); dt = C(dt, 0, 1)
      B(x, y, Math.round(L(130, 50, dt)), Math.round(L(220, 160, dt)), Math.round(L(252, 230, dt)), 230)
    }
// 水滴高光
for (y = dy2 - 4; y <= dy2; y++)
  for (var x = dx2 - 3; x <= dx2 + 1; x++) {
    var hld = D(x, y, dx2 - 1, dy2 - 2)
    if (hld < 4 && inDrop(x, y)) B(x, y, 200, 240, 255, Math.round((1 - hld / 4) * 120))
  }

// ===== 阴影底衬（微弱，增加立体感） =====
for (y = cb - 2; y <= cb + 8; y++)
  for (var x = cl - 6; x <= cr + 20; x++) {
    var sd = Math.abs(x - CX) / 45 + Math.abs(y - cb - 3) / 10
    if (sd < 1 && y > cb - 2 && !inCup(x, y)) B(x, y, 0, 0, 0, Math.round((1 - sd) * 30))
  }

// ===== PNG 输出 =====
function CRC(b) {
  var t = []
  for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c }
  var crc = 0xFFFFFFFF; for (var i = 0; i < b.length; i++) crc = t[(crc ^ b[i]) & 0xFF] ^ (crc >>> 8)
  return (crc ^ 0xFFFFFFFF) >>> 0
}
function CH(t, d) {
  var l = Buffer.alloc(4); l.writeUInt32BE(d.length, 0)
  var tb = Buffer.from(t, 'ascii'), cb = Buffer.alloc(4); cb.writeUInt32BE(CRC(Buffer.concat([tb, d])), 0)
  return Buffer.concat([l, tb, d, cb])
}
var rows = []
for (y = 0; y < H; y++) { var row = Buffer.alloc(1 + W * 4); row[0] = 0; P.copy(row, 1, y * W * 4, (y + 1) * W * 4); rows.push(row) }
var S = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
var IH = Buffer.alloc(13); IH.writeUInt32BE(W, 0); IH.writeUInt32BE(H, 4); IH[8] = 8; IH[9] = 6; IH[10] = 0; IH[11] = 0; IH[12] = 0
var OUT = Buffer.concat([S, CH('IHDR', IH), CH('IDAT', zlib.deflateSync(Buffer.concat(rows))), CH('IEND', Buffer.alloc(0))])
var op = path.join(__dirname, '..', 'src', 'common', 'logo.png')
fs.writeFileSync(op, OUT)
fs.writeFileSync(path.join(__dirname, '..', 'src', 'common', 'logo_visible.png'), OUT)
console.log('✅ Cup logo (transparent bg): ' + op + ' (' + OUT.length + ' bytes)')
