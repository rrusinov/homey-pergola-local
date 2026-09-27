'use strict';

const Homey = require('homey');
const { discoverBox, sendLocal } = require('../../lib/daisy-local');
const { queueFor } = require('../../lib/queue');
const { findCommand, buildCommand, coverCommandForValue } = require('../../lib/devices');

class CoverDevice extends Homey.Device {
  async onInit() {
    this._instCode = this.getStoreValue('instCode');
    this._device = this.getStore();
    this._boxIp = this.getStoreValue('boxIp') || null;

    this.registerCapabilityListener('windowcoverings_state', (value) => this._onState(value));
    this.registerCapabilityListener('windowcoverings_set', (value) => this._onSet(value));

    this.log(`Cover "${this.getName()}" ready (box ${this._boxIp || 'not yet discovered'})`);
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

  async _exec(command) {
    if (!command) throw new Error('Action not available on this device');
    const ip = await this._box();
    if (!ip) throw new Error('DaisyBox not found on the local network');
    const payload = buildCommand(this._device, command);
    const result = await queueFor(this._instCode).run(() => sendLocal(ip, this._instCode, payload));
    if (result === 'deny') throw new Error('DaisyBox is busy, please retry');
    return result;
  }

  async _onState(state) {
    let command = null;
    if (state === 'up') command = findCommand(this._device, 'OPEN_STOP_CLOSE', 'OPEN');
    else if (state === 'down') command = findCommand(this._device, 'OPEN_STOP_CLOSE', 'CLOSE');
    else command = findCommand(this._device, 'OPEN_STOP_CLOSE', 'STOP');

    await this._exec(command);

    if (state === 'up') await this.setCapabilityValue('windowcoverings_set', 1).catch(() => {});
    else if (state === 'down') await this.setCapabilityValue('windowcoverings_set', 0).catch(() => {});
  }

  async _onSet(value) {
    const command = coverCommandForValue(this._device, value);
    await this._exec(command);
  }
}

module.exports = CoverDevice;
