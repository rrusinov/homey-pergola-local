'use strict';

const XOR_KEY = 'd3Cr1pTam1St0CaZzOSe61nGrad0';
const IDX = 'abcdefghijklmnopqrstuvwxyz0123456789';

function encrypt(plaintext, n = 7) {
  const rot = XOR_KEY.slice(n) + XOR_KEY.slice(0, n);
  const v = String(Math.floor(Date.now() / 1000));
  let s = String.fromCharCode(parseInt(v.slice(0, 2), 10));
  for (let i = 0; i < plaintext.length; i += 1) {
    if (i === 50) s += String.fromCharCode(parseInt(v.slice(2, 4), 10));
    else if (i === 70) s += String.fromCharCode(parseInt(v.slice(4, 6), 10));
    else if (i === 90) s += String.fromCharCode(parseInt(v.slice(6, 8), 10));
    s += plaintext[i];
  }
  s += String.fromCharCode(parseInt(v.slice(8, 10), 10));

  const buf = Buffer.alloc(s.length);
  for (let i = 0; i < s.length; i += 1) {
    buf[i] = (s.charCodeAt(i) ^ rot.charCodeAt(i % XOR_KEY.length)) & 0xFF;
  }
  return Buffer.from(`M${IDX[n]}${buf.toString('base64')}`, 'ascii');
}

function commandAction(commandParam) {
  const p = (commandParam || '').toUpperCase();
  if (p === 'ON' || p === 'OFF') return 'POWER';
  if (p === 'OPEN' || p === 'STOP' || p === 'CLOSE') return 'OPEN_STOP_CLOSE';
  return 'LEVEL';
}

function convertForDm(instCode, cmd) {
  const coac = cmd.commandAction || commandAction(cmd.commandParam);
  return JSON.stringify({
    idIn: instCode,
    idSc: 0,
    isSc: false,
    cL: [{
      idInDe: parseInt(cmd.idInstallationDevice, 10),
      deCo: String(cmd.deviceCode),
      cmId: parseInt(cmd.commandId, 10),
      coAc: coac,
      coPa: cmd.commandParam || '',
      low: cmd.lowlevelCommand || '',
      coSta: 0,
    }],
  });
}

module.exports = { encrypt, convertForDm, commandAction };
