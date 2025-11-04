/**
 * @fileOverview 编码与解码相关的辅助函数。
 */

const DECODE_64_TABLE = {};
const DECODE_64_CHAR_SET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

for (let i = 0; i < 64; i++) {
  DECODE_64_TABLE[DECODE_64_CHAR_SET.charAt(i)] = i;
}

/**
 * 将base64编码的字符串 'inbytes' 解码为 'outbytes' (Uint8Array)。
 * @function decode64
 * @param {string} inbytes - base64编码的输入字符串。
 * @param {Uint8Array} outbytes - 用于存储解码后字节的输出数组。
 * @param {number} [record_size] - 每条记录的大小（字节）。如果指定，将用于跳点。
 * @param {number} [pointRatio] - 点的采样率，例如，2表示每隔一个点进行一次采样。
 * @returns {number} 解码的记录数。
 */
export function decode64(inbytes, outbytes, record_size, pointRatio) {
  let x, b = 0, l = 0, j = 0;
  const L = inbytes.length;
  const A = outbytes.length;
  record_size = record_size || A;
  pointRatio = pointRatio || 1;
  const bitskip = (pointRatio - 1) * record_size * 8;

  for (x = 0; x < L && j < A; x++) {
    b = (b << 6) + DECODE_64_TABLE[inbytes.charAt(x)];
    l += 6;
    if (l >= 8) {
      l -= 8;
      outbytes[j++] = (b >>> l) & 0xff;
      if ((j % record_size) === 0) {
        if (bitskip > 0) {
          x += Math.ceil((bitskip - l) / 6);
          l %= 8;
          if (l > 0) {
            b = DECODE_64_TABLE[inbytes.charAt(x)];
          }
        }
      }
    }
  }
  return Math.floor(j / record_size);
}
