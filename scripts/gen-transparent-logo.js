// 生成 1x1 透明 PNG（隐形 Logo）
var zlib = require('zlib')
var fs = require('fs')

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

function chunk(type, data) {
  var len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0)
  var tb = Buffer.from(type, 'ascii')
  var cb = Buffer.alloc(4); cb.writeUInt32BE(crc32(Buffer.concat([tb, data])), 0)
  return Buffer.concat([len, tb, data, cb])
}

var sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
var ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(1, 0); ihdr.writeUInt32BE(1, 4)
ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0

var raw = Buffer.alloc(5, 0) // filter byte + 4 RGBA bytes (all 0 = transparent)
var deflated = zlib.deflateSync(raw)

var out = Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflated), chunk('IEND', Buffer.alloc(0))])
fs.writeFileSync('src/common/logo_transparent.png', out)
console.log('✅ Transparent logo created: src/common/logo_transparent.png (' + out.length + ' bytes)')
