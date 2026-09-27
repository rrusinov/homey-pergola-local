'use strict';

const https = require('https');

const BASE = 'tmate.telecoautomation.com';
const BASIC_AUTH = `Basic ${Buffer.from('teleco:tmate20').toString('base64')}`;

function request(path, payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const req = https.request({
      hostname: BASE,
      path: `/${path}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        Authorization: BASIC_AUTH,
      },
      timeout: 15000,
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('error', reject);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(new Error(`Invalid response from ${path}: ${data.slice(0, 200)}`));
        }
      });
    });
    req.on('timeout', () => req.destroy(new Error('request timeout')));
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

class Cloud {
  constructor(email, password) {
    this.email = email;
    this.password = password;
    this.idSession = null;
    this.idAccount = null;
  }

  async _post(path, payload) {
    const body = await request(path, payload);
    if (body.codEsito !== 'S') {
      throw new Error(`Daisy cloud error for ${path}: ${JSON.stringify(body)}`);
    }
    return body.valRisultato;
  }

  async _authPost(path, extra) {
    return this._post(path, Object.assign({
      idSession: this.idSession,
      idAccount: this.idAccount,
    }, extra));
  }

  async login() {
    const res = await this._post('teleco/services/account-login', {
      email: this.email,
      pwd: this.password,
    });
    this.idAccount = res.idAccount;
    this.idSession = res.idSession;
    return res;
  }

  async installations() {
    const res = await this._authPost('teleco/services/account-installation-list');
    return res.installationList;
  }

  async roomConfig(idInstallation) {
    const res = await this._authPost('teleco/services/room-configuration-list', { idInstallation });
    return res.roomList;
  }
}

module.exports = Cloud;
