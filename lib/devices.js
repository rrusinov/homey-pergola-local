'use strict';

const COVER_ACTIONS = ['OPEN_STOP_CLOSE'];
const LIGHT_ACTIONS = ['POWER', 'COLOR'];

function mapCommands(device) {
  return (device.deviceCommandList || []).map((c) => ({
    commandAction: c.commandAction,
    commandParam: c.commandParam,
    commandId: c.idDevicetypeCommandModel,
    lowlevelCommand: c.lowlevelCommand || '',
  }));
}

function normalizeDevice(installation, room, device) {
  return {
    instCode: installation.instCode,
    idInstallation: installation.idInstallation,
    room: room.roomDescription,
    label: device.label,
    idInstallationDevice: device.idInstallationDevice,
    deviceIndex: device.deviceIndex,
    idDevicetype: device.idDevicetype,
    idDevicemodel: device.idDevicemodel,
    commands: mapCommands(device),
  };
}

function actionsOf(device) {
  return (device.commands || []).map((c) => (c.commandAction || '').toUpperCase());
}

function isCover(device) {
  return actionsOf(device).some((a) => COVER_ACTIONS.includes(a));
}

function isLight(device) {
  return actionsOf(device).some((a) => LIGHT_ACTIONS.includes(a));
}

function findCommand(device, action, param) {
  const wantAction = (action || '').toUpperCase();
  const wantParam = (param || '').toUpperCase();
  const commands = device.commands || [];
  let match = commands.find((c) => (c.commandAction || '').toUpperCase() === wantAction
    && (c.commandParam || '').toUpperCase() === wantParam);
  if (match) return match;
  match = commands.find((c) => (c.commandParam || '').toUpperCase() === wantParam);
  return match || null;
}

function buildCommand(device, command) {
  return {
    idInstallationDevice: device.idInstallationDevice,
    deviceCode: String(device.deviceIndex),
    commandId: command.commandId,
    commandAction: command.commandAction,
    commandParam: command.commandParam,
    lowlevelCommand: command.lowlevelCommand || '',
  };
}

const COVER_PRESETS = { LEV1: 0, LEV2: 0.33, LEV3: 0.66, LEV4: 1 };
const LIGHT_PRESETS = { LEV1: 0.25, LEV2: 0.5, LEV3: 0.75, LEV4: 1 };

function nearestPreset(device, value, presets) {
  const candidates = [];
  const openCmd = findCommand(device, 'OPEN_STOP_CLOSE', 'OPEN')
    || findCommand(device, 'POWER', 'ON');
  const closeCmd = findCommand(device, 'OPEN_STOP_CLOSE', 'CLOSE')
    || findCommand(device, 'POWER', 'OFF');

  if (closeCmd) candidates.push({ value: 0, command: closeCmd });
  if (openCmd) candidates.push({ value: 1, command: openCmd });

  (device.commands || []).forEach((c) => {
    const param = (c.commandParam || '').toUpperCase();
    if (presets[param] !== undefined) {
      candidates.push({ value: presets[param], command: c });
    }
  });

  if (!candidates.length) return null;
  return candidates.reduce((best, cur) => (
    Math.abs(cur.value - value) < Math.abs(best.value - value) ? cur : best
  ));
}

function coverPresetForValue(device, value) {
  return nearestPreset(device, value, COVER_PRESETS);
}

function coverCommandForValue(device, value) {
  const preset = nearestPreset(device, value, COVER_PRESETS);
  return preset ? preset.command : null;
}

function lightCommandForValue(device, value) {
  const preset = nearestPreset(device, value, LIGHT_PRESETS);
  return preset ? preset.command : null;
}

module.exports = {
  normalizeDevice,
  isCover,
  isLight,
  findCommand,
  buildCommand,
  coverPresetForValue,
  coverCommandForValue,
  lightCommandForValue,
};
