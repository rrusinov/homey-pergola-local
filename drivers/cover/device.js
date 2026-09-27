'use strict';

const Homey = require('homey');
const { discoverBox, sendLocal } = require('../../lib/daisy-local');
const { queueFor } = require('../../lib/queue');
const {
  findCommand, buildCommand, coverPresetForValue,
} = require('../../lib/devices');

function positionId(value) {
  return String(Math.round(value * 100));
}

class CoverDevice extends Homey.Device {
  async onInit() {
    this._instCode = this.getStoreValue('instCode');
    this._device = this.getStore();
    this._boxIp = this.getStoreValue('boxIp') || null;

    if (!this.hasCapability('daisy_position')) {
      await this.addCapability('daisy_position').catch(this.error);
    }

    this.registerCapabilityListener('windowcoverings_state', (value) => this._onState(value));
    this.registerCapabilityListener('windowcoverings_set', (value) => this._onSet(value));
    this.registerCapabilityListener('daisy_position', (value) => this._onPosition(value));

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

  async _syncPosition(value) {
    const id = positionId(value);
    const state = value >= 1 ? 'up' : value <= 0 ? 'down' : 'idle';
    await this.setCapabilityValue('daisy_position', id).catch(this.error);
    await this.setCapabilityValue('windowcoverings_set', value).catch(this.error);
    await this.setCapabilityValue('windowcoverings_state', state).catch(this.error);
  }

  async _onPosition(id) {
    const value = parseInt(id, 10) / 100;
    const preset = coverPresetForValue(this._device, value);
    await this._exec(preset && preset.command);
    if (preset) await this._syncPosition(preset.value);
  }

  async _onSet(value) {
    const preset = coverPresetForValue(this._device, value);
    await this._exec(preset && preset.command);
    if (preset) await this._syncPosition(preset.value);
  }

  async _onState(state) {
    let command = null;
    if (state === 'up') command = findCommand(this._device, 'OPEN_STOP_CLOSE', 'OPEN');
    else if (state === 'down') command = findCommand(this._device, 'OPEN_STOP_CLOSE', 'CLOSE');
    else command = findCommand(this._device, 'OPEN_STOP_CLOSE', 'STOP');

    await this._exec(command);

    if (state === 'up') await this._syncPosition(1);
    else if (state === 'down') await this._syncPosition(0);
    else await this.setCapabilityValue('windowcoverings_state', 'idle').catch(this.error);
  }
}

module.exports = CoverDevice;
