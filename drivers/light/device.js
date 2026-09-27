'use strict';

const Homey = require('homey');
const { discoverBox, sendLocal } = require('../../lib/daisy-local');
const { queueFor } = require('../../lib/queue');
const {
  findCommand, buildCommand, lightCommandForValue, isRgbLight, rgbCommand,
} = require('../../lib/devices');

const DISCOVER_MS = 4000;
const WARM_MS = 12000;
const WARM_RETRY_MS = 15000;
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

    await this._restoreState();

    if (!this._boxIp) this._warmBox();

    this.log(`Light "${this.getName()}" ready (rgb=${this._rgb}, box ${this._boxIp || 'warming up'})`);
  }

  async onDeleted() {
    if (this._warmTimer) clearTimeout(this._warmTimer);
  }

  async _restoreState() {
    const store = this.getStore();
    for (const cap of ['onoff', 'dim', 'light_hue', 'light_saturation']) {
      const saved = store[cap];
      if (saved !== undefined && saved !== null && this.hasCapability(cap)) {
        await this.setCapabilityValue(cap, saved).catch(this.error);
      }
    }
  }

  async _persist() {
    for (const cap of ['onoff', 'dim', 'light_hue', 'light_saturation']) {
      if (this.hasCapability(cap)) {
        const value = this.getCapabilityValue(cap);
        if (value !== null && value !== undefined) {
          await this.setStoreValue(cap, value).catch(this.error);
        }
      }
    }
  }

  async _warmBox() {
    if (this._boxIp || this._warming) return;
    this._warming = true;
    try {
      const found = await discoverBox(this._instCode, WARM_MS);
      if (found) {
        this._boxIp = found.ip;
        await this.setStoreValue('boxIp', found.ip).catch(this.error);
      }
    } catch (err) {
      this.log(`box discovery failed: ${err.message}`);
    }
    this._warming = false;
    if (!this._boxIp) {
      this._warmTimer = setTimeout(() => {
        this._warmTimer = null;
        this._warmBox();
      }, WARM_RETRY_MS);
      if (this._warmTimer.unref) this._warmTimer.unref();
    }
  }

  async _box() {
    if (this._boxIp) return this._boxIp;
    const found = await discoverBox(this._instCode, DISCOVER_MS);
    if (found) {
      this._boxIp = found.ip;
      await this.setStoreValue('boxIp', found.ip).catch(this.error);
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

  async _onOff(value) {
    const command = findCommand(this._device, 'POWER', value ? 'ON' : 'OFF');
    await this._exec(command);
    await this.setCapabilityValue('onoff', value).catch(this.error);
    await this._persist();
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
    await this.setCapabilityValue('dim', value).catch(this.error);
    if (!this.getCapabilityValue('onoff')) {
      await this.setCapabilityValue('onoff', true).catch(this.error);
    }
    await this._persist();
  }

  async _sendColor() {
    const brightness = Math.round((this.getCapabilityValue('dim') ?? 1) * 100);
    const hue = this.getCapabilityValue('light_hue') ?? 0;
    const saturation = this.getCapabilityValue('light_saturation') ?? 0;
    const rgb = hsvToRgb(hue, saturation, 1);
    const command = rgbCommand(this._device, brightness, rgb);
    await this._exec(command);
    if (!this.getCapabilityValue('onoff')) {
      await this.setCapabilityValue('onoff', true).catch(this.error);
    }
    await this._persist();
  }
}

module.exports = LightDevice;
