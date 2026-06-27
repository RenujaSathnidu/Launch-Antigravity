// codex.js — Codec translation between ASCII and arbitrary base-N encodings

/**
 * Convert an ASCII integer value to a string in the given base.
 * Uses digits 0-9 then A-Z for values ≥ 10.
 * @param {number} asciiValue  — integer (e.g. 72 for 'H')
 * @param {number} base        — target base (2–36)
 * @returns {string} the value represented in the target base
 */
function asciiToBase(asciiValue, base) {
  if (asciiValue === 0) return '0';

  const digits = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  let value = asciiValue;

  while (value > 0) {
    result = digits[value % base] + result;
    value = Math.floor(value / base);
  }

  return result;
}

/**
 * Convert a base-N string back to an integer ASCII value.
 * @param {string} baseStr — e.g. "110" in base-5
 * @param {number} base
 * @returns {number} the original ASCII code
 */
function baseToAscii(baseStr, base) {
  const digits = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let value = 0;

  for (let i = 0; i < baseStr.length; i++) {
    value = value * base + digits.indexOf(baseStr[i].toUpperCase());
  }

  return value;
}

/**
 * Encode a text string into an array of base-N representations (one per character).
 * @param {string} text
 * @param {number} base
 * @returns {string[]}
 */
function encodePayload(text, base) {
  return Array.from(text).map(ch => asciiToBase(ch.charCodeAt(0), base));
}

/**
 * Decode an array of base-N strings back into the original text.
 * @param {string[]} encodedArray
 * @param {number} base
 * @returns {string}
 */
function decodePayload(encodedArray, base) {
  return encodedArray.map(s => String.fromCharCode(baseToAscii(s, base))).join('');
}

module.exports = { asciiToBase, baseToAscii, encodePayload, decodePayload };
