'use strict';

const Homey = require('homey');
const { discoverBox, sendLocal } = require('../../lib/daisy-local');
const { queueFor } = require('../../lib/queue');
const { findCommand, buildCommand, lightCommandForValue } = require('../../lib/devices');

const NETWORK_ERRORS = new Set([
  'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'EHOSTUNREACH', 'ENETUNREACH', 'EPIPE',
]);

class LightDevice extends Homey.Device {
  async onInit() {
    this._instCode = this.getStoreValue('instCode');
    this._device = this.getStore();
    this._boxIp = this.getStoreValue('boxIp') || null;

    const hasLevel = (this._device.commands || []).some(
      (c) => (c.commandAction || '').toUpperCase() === 'LEVEL',
    );
    if (hasLevel && !this.hasCapability('dim')) {
      await this.addCapability('dim').catch(this.error);
    }

    this.registerCapabilityListener('onoff', (value) => this._onOff(value));
    if (hasLevel) {
      this.registerCapabilityListener('dim', (value) => this._onDim(value));
    }

    this.log(`Light "${this.getName()}" ready (box ${this._boxIp || 'not yet discovered'})`);
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

  async _onOff(value) {
    const command = findCommand(this._device, 'POWER', value ? 'ON' : 'OFF');
    await this._exec(command);
  }

  async _onDim(value) {
    if (value <= 0) {
      await this._onOff(false);
      return;
    }
    const command = lightCommandForValue(this._device, value);
    await this._exec(command);
    if (!this.getCapabilityValue('onoff')) {
      await this.setCapabilityValue('onoff', true).catch(this.error);
    }
  }
}

module.exports = LightDevice;
