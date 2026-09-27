'use strict';

const Homey = require('homey');
const { discoverBox, sendLocal, refreshFeedback } = require('../../lib/daisy-local');
const { queueFor } = require('../../lib/queue');
const {
  findCommand, buildCommand, lightCommandForValue, isRgbLight, rgbCommand,
} = require('../../lib/devices');

const NETWORK_ERRORS = new Set([
  'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'EHOSTUNREACH', 'ENETUNREACH', 'EPIPE',
]);

function hsvToRgb(h, s, v) {
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  let r = 0;
  let g = 0;
  let b = 0;
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    default: r = v; g = p; b = q; break;
  }
  return [r * 255, g * 255, b * 255];
}

class LightDevice extends Homey.Device {
  async onInit() {
    this._instCode = this.getStoreValue('instCode');
    this._device = this.getStore();
    this._boxIp = this.getStoreValue('boxIp') || null;

    const hasLevel = (this._device.commands || []).some(
      (c) => (c.commandAction || '').toUpperCase() === 'LEVEL',
    );
    this._rgb = isRgbLight(this._device);

    if ((hasLevel || this._rgb) && !this.hasCapability('dim')) {
      await this.addCapability('dim').catch(this.error);
    }
    if (this._rgb) {
      if (!this.hasCapability('light_hue')) await this.addCapability('light_hue').catch(this.error);
      if (!this.hasCapability('light_saturation')) {
        await this.addCapability('light_saturation').catch(this.error);
      }
    }

    this.registerCapabilityListener('onoff', (value) => this._onOff(value));
    if (this.hasCapability('dim')) {
      this.registerCapabilityListener('dim', (value) => this._onDim(value));
    }
    if (this._rgb) {
      this.registerCapabilityListener('light_hue', () => this._sendColor());
      this.registerCapabilityListener('light_saturation', () => this._sendColor());
    }

    this.log(`Light "${this.getName()}" ready (rgb=${this._rgb}, box ${this._boxIp || 'not yet discovered'})`);
  }

  async _box() {
    if (this._boxIp) return this._boxIp;
    const found = await discoverBox(this._instCode);
    if (found) {
      this._boxIp = found.ip;
      await this.setStoreValue('boxIp', found.ip);
    }
    return this._boxIp;
  }

  async _withBox(fn) {
    let ip = await this._box();
    if (!ip) throw new Error('DaisyBox not found on the local network');
    try {
      return await fn(ip);
    } catch (err) {
      if (!err || !NETWORK_ERRORS.has(err.code)) throw err;
      this.log(`Box unreachable at ${ip} (${err.code}), rediscovering`);
      this._boxIp = null;
      await this.setStoreValue('boxIp', null).catch(this.error);
      ip = await this._box();
      if (!ip) throw err;
      return fn(ip);
    }
  }

  async _exec(command) {
    if (!command) throw new Error('Action not available on this device');
    const payload = buildCommand(this._device, command);
    return this._withBox(async (ip) => {
      const result = await queueFor(this._instCode).run(
        () => sendLocal(ip, this._instCode, payload),
      );
      if (result === 'deny') throw new Error('DaisyBox is busy, please retry');
      return result;
    });
  }

  async _refreshFeedback(command) {
    if (!this.getSetting('sync_feedback')) return;
    try {
      await this._withBox((ip) => refreshFeedback(ip, this._instCode, this._device));
    } catch (err) {
      this.log(`feedback sync failed: ${err.message}`);
    }
  }

  async _onOff(value) {
    const command = findCommand(this._device, 'POWER', value ? 'ON' : 'OFF');
    await this._exec(command);
    await this._refreshFeedback(command);
  }

  async _onDim(value) {
    if (value <= 0) {
      await this._onOff(false);
      return;
    }
    if (this._rgb) {
      await this._sendColor();
      return;
    }
    const command = lightCommandForValue(this._device, value);
    await this._exec(command);
    await this._refreshFeedback(command);
    if (!this.getCapabilityValue('onoff')) {
      await this.setCapabilityValue('onoff', true).catch(this.error);
    }
  }

  async _sendColor() {
    const brightness = Math.round((this.getCapabilityValue('dim') ?? 1) * 100);
    const hue = this.getCapabilityValue('light_hue') ?? 0;
    const saturation = this.getCapabilityValue('light_saturation') ?? 0;
    const rgb = hsvToRgb(hue, saturation, 1);
    const command = rgbCommand(this._device, brightness, rgb);
    await this._exec(command);
    await this._refreshFeedback(command);
    if (!this.getCapabilityValue('onoff')) {
      await this.setCapabilityValue('onoff', true).catch(this.error);
    }
  }
}

module.exports = LightDevice;
