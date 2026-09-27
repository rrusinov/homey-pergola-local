'use strict';

const Homey = require('homey');

class TelecoDaisyApp extends Homey.App {
  async onInit() {
    this.log('Teleco Daisy (Local) is running');
  }
}

module.exports = TelecoDaisyApp;
