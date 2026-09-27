'use strict';

const dgram = require('dgram');
const net = require('net');
const { encrypt, convertForDm } = require('./protocol');

const CMD_PORT = 400;
const BEACON_PORT = 55555;

function normalizeMac(mac) {
  return String(mac || '').replace(/:/g, '').toUpperCase();
}

function discoverBox(instCode, timeoutMs = 12000) {
  const want = instCode ? normalizeMac(instCode) : null;
  return new Promise((resolve) => {
    const sock = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    let settled = false;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { sock.close(); } catch (e) { /* ignore */ }
      resolve(result);
    };

    const timer = setTimeout(() => finish(null), timeoutMs);

    sock.on('message', (msg) => {
      const text = msg.toString('utf8');
      const macMatch = /"mac"\s*:\s*"([^"]+)"/.exec(text);
      const ipMatch = /"ip"\s*:\s*"([^"]+)"/.exec(text);
      if (!macMatch || !ipMatch) return;
      if (!want || normalizeMac(macMatch[1]) === want) {
        finish({ ip: ipMatch[1], mac: macMatch[1] });
      }
    });

    sock.on('error', () => finish(null));
    sock.bind(BEACON_PORT);
  });
}

function sendLocal(boxIp, instCode, cmd, timeoutMs = 6000) {
  return new Promise((resolve, reject) => {
    const payload = encrypt(convertForDm(instCode, cmd));
    const sock = net.connect({ port: CMD_PORT, host: boxIp });
    let buffer = '';
    let settled = false;

    const finish = (result, err) => {
      if (settled) return;
      settled = true;
      sock.destroy();
      if (err) reject(err);
      else resolve(result);
    };

    sock.setTimeout(timeoutMs);
    sock.on('connect', () => sock.write(payload));
    sock.on('data', (data) => {
      buffer += data.toString('ascii');
      if (buffer.includes('ACK')) finish('ack');
      else if (buffer.includes('DENY')) finish('deny');
    });
    sock.on('timeout', () => finish('noack'));
    sock.on('error', (err) => finish(null, err));
    sock.on('close', () => finish(buffer.includes('ACK') ? 'ack' : 'noack'));
  });
}

module.exports = { discoverBox, sendLocal, normalizeMac };
