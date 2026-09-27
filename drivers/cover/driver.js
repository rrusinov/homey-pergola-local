'use strict';

const Homey = require('homey');
const { coverPair } = require('../../lib/pairing');

class CoverDriver extends Homey.Driver {
  async onInit() {
    this.log('Cover driver initialised');
  }

  async onPair(session) {
    return coverPair(session);
  }
}

module.exports = CoverDriver;
