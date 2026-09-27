'use strict';

const Homey = require('homey');

class PergolaLocalApp extends Homey.App {
  async onInit() {
    const pickDevices = (driverId) => async (query) => {
      const driver = this.homey.drivers.getDriver(driverId);
      const devices = driver ? driver.getDevices() : [];
      const q = (query || '').toLowerCase();
      return devices
        .map((d) => ({ name: d.getName(), id: String(d.getData().id) }))
        .filter((r) => r.name.toLowerCase().includes(q));
    };

    const resolveDevice = (driverId, id) => {
      const driver = this.homey.drivers.getDriver(driverId);
      if (!driver) return null;
      return driver.getDevices().find((d) => String(d.getData().id) === String(id)) || null;
    };

    const coverAutocomplete = pickDevices('cover');
    const lightAutocomplete = pickDevices('light');

    const bind = (cardId, driverId, autocomplete, handler) => {
      const card = this.homey.flow.getActionCard(cardId);
      card.registerArgumentAutocompleteListener('device', autocomplete);
      card.registerRunListener(async (args) => {
        const device = resolveDevice(driverId, args.device && args.device.id);
        if (!device) throw new Error('Device not found');
        return handler(device, args);
      });
    };

    bind('cover_set_position', 'cover', coverAutocomplete, (d, a) => d.setPositionById(a.position));
    bind('cover_open', 'cover', coverAutocomplete, (d) => d.setState('up'));
    bind('cover_close', 'cover', coverAutocomplete, (d) => d.setState('down'));
    bind('cover_stop', 'cover', coverAutocomplete, (d) => d.setState('idle'));
    bind('cover_reapply', 'cover', coverAutocomplete, (d) => d.reapplyPosition());

    bind('light_set_level', 'light', lightAutocomplete, (d, a) => d.setLevel(Number(a.level)));
    bind('light_set_color', 'light', lightAutocomplete, (d, a) => d.setColor({
      hue: Number(a.hue),
      saturation: Number(a.saturation),
    }));
    bind('light_reapply', 'light', lightAutocomplete, (d) => d.reapplyState());

    const positionIs = this.homey.flow.getConditionCard('cover_position_is');
    positionIs.registerArgumentAutocompleteListener('device', coverAutocomplete);
    positionIs.registerRunListener(async (args) => {
      const device = resolveDevice('cover', args.device && args.device.id);
      if (!device) return false;
      return String(device.getCapabilityValue('daisy_position')) === String(args.position);
    });

    this.log('Pergola Local is running');
  }
}

module.exports = PergolaLocalApp;
