'use strict';

const Homey = require('homey');
const { lightPair } = require('../../lib/pairing');

class LightDriver extends Homey.Driver {
  async onInit() {
    this.log('Light driver initialised');
  }

  async onPair(session) {
    return lightPair(session);
  }
}

module.exports = LightDriver;
