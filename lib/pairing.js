'use strict';

const Cloud = require('./teleco-cloud');
const { discoverBox } = require('./daisy-local');
const { normalizeDevice, isCover, isLight } = require('./devices');

function makePairHandler(predicate) {
  return async function onPair(session) {
    let credentials = null;

    session.setHandler('login', async (data) => {
      const email = data && (data.username || data.email);
      const password = data && data.password;
      if (!email || !password) throw new Error('Email and password are required');
      const cloud = new Cloud(email, password);
      await cloud.login();
      credentials = { email, password };
      return true;
    });

    session.setHandler('list_devices', async () => {
      if (!credentials) throw new Error('Please log in first');
      const cloud = new Cloud(credentials.email, credentials.password);
      await cloud.login();

      const result = [];
      const installations = await cloud.installations();
      for (const installation of installations) {
        let boxIp = null;
        try {
          const found = await discoverBox(installation.instCode, 12000);
          boxIp = found ? found.ip : null;
        } catch (err) {
          boxIp = null;
        }

        const rooms = await cloud.roomConfig(installation.idInstallation);
        for (const room of rooms) {
          for (const device of room.deviceList) {
            const normalized = normalizeDevice(installation, room, device);
            if (!predicate(normalized)) continue;
            result.push({
              name: normalized.label,
              data: { id: String(normalized.idInstallationDevice) },
              store: Object.assign({}, normalized, { boxIp }),
            });
          }
        }
      }
      return result;
    });
  };
}

module.exports = {
  coverPair: makePairHandler(isCover),
  lightPair: makePairHandler(isLight),
};
