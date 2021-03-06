var zlib = require('zlib')

var OP_RETURN_SIZE = 80

var MAGIC_NUMBER = new Buffer('1f', 'hex')
var VERSION = new Buffer('00', 'hex')

var dth = function (d) {
  var h = Number(d).toString(16)
  while (h.length < 2) {
    h = '0' + h
  }
  return h
}

var compress = function (decompressedBuffer, callback) {
  zlib.deflateRaw(decompressedBuffer, function (err, compressedBuffer) {
    callback(err, compressedBuffer)
  })
}

var decompress = function (compressedBuffer, callback) {
  zlib.inflateRaw(compressedBuffer, function (err, decompressedBuffer) {
    callback(err, decompressedBuffer)
  })
}

var parse = function (payload) {
  var length = payload.slice(2, 3)[0]
  var valid = payload.slice(0, 1)[0] === MAGIC_NUMBER[0] && payload.slice(1, 2)[0] === VERSION[0]
  return valid ? length : false
}

var create = function (options, callback) {
  var data = options.data
  var payloads = []
  var buffer = new Buffer(data)
  compress(buffer, function (err, compressedBuffer) {
    if (err) { } // TODO
    var dataLength = compressedBuffer.length
    if (dataLength > 1277) {
      callback('data payload > 1277', false)
      return
    }
    var count = OP_RETURN_SIZE - 3
    while (count < dataLength) {
      payload = compressedBuffer.slice(count, count + OP_RETURN_SIZE)
      count += OP_RETURN_SIZE
      payloads.push(payload)
    }
    var lengthByte = new Buffer(dth(payloads.length + 1), 'hex')
    var dataPayload = compressedBuffer.slice(0, OP_RETURN_SIZE - 3)
    var payload = Buffer.concat([MAGIC_NUMBER, VERSION, lengthByte, dataPayload])
    payloads.unshift(payload)
    callback(false, payloads)
  })
}

var decode = function (payloads, callback) {
  var firstPayload = payloads[0]
  var startHeader = firstPayload.slice(0, 3)
  var length = startHeader.slice(2, 3)[0]
  if (!length) {
    return callback('no start header', false)
  }
  if (payloads.length !== length) {
    return callback('length mismatch', false)
  }
  var compressedBuffer = new Buffer('')
  for (var i = 0; i < length; i++) {
    var payload = payloads[i]
    var dataPayload = i === 0 ? payload.slice(3, OP_RETURN_SIZE) : payload
    if (!dataPayload) {
      return callback('missing payload', false)
    }
    compressedBuffer = Buffer.concat([compressedBuffer, dataPayload])
  }
  decompress(compressedBuffer, function (err, data) {
    if (err) { } // TODO
    if (!data || !data.toString) {
      return callback(true, '')
    } else {
      return callback(false, data.toString())
    }
  })
}

module.exports = {
  create: create,
  decode: decode,
  parse: parse
}
