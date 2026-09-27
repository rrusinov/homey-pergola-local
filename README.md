# Teleco Daisy (Local)

Control your **Teleco Automation DaisyBox** from Homey — over your local network, without the Teleco cloud.

The DaisyBox speaks a local, unauthenticated protocol on the LAN:

1. It broadcasts a discovery beacon on **UDP port 55555** (contains its MAC / `instCode` and IP).
2. Commands are sent to **TCP port 400**, XOR-obfuscated and Base64-encoded.

This app uses that channel for all control, so commands are near-instant and keep working when the Teleco cloud is unavailable.

## How it works

- **Pairing (one-time cloud):** when you add a device, you log in once with your Daisy app email/password. The app reads your installation, rooms and devices from the Teleco cloud and stores the device IDs locally.
- **Control (fully local):** every command is sent directly to the DaisyBox on TCP :400. No internet connection is required after pairing.

## Supported devices

Any Teleco Daisy device type exposed by the cloud configuration:

- **Louver / Cover** — pergola slats, awnings, shades, curtains (`windowcoverings`).
- **Light / Heater** — on/off lights, dimmable 4-level lights, 4-channel heaters (`light`).

Position presets: the hardware only accepts discrete steps (e.g. 0 / 33 / 66 / 100 %). The `windowcoverings_set` slider snaps to the nearest supported step.

## Requirements

- **Homey Pro** (2016–2019 or Early 2023). Homey Cloud / Bridge cannot run local-network apps.
- The DaisyBox and Homey on the same LAN/subnet.

## Notes

- The DaisyBox handles **one command at a time** and can be temporarily unresponsive under bursts. This app serialises commands and reports `DaisyBox is busy` when it answers `DENY`.
- Status estimates (e.g. slat position) are optimistic, since some motors provide no position feedback.

## Credits

The local protocol was reverse-engineered by the community:

- [andreasnuesslein/py-teleco-daisy](https://github.com/andreasnuesslein/py-teleco-daisy) and [hass_teleco_daisy](https://github.com/andreasnuesslein/hass_teleco_daisy) (MIT)
- [croll83/ha-teleco-daisy](https://github.com/croll83/ha-teleco-daisy) — local LAN channel (MIT)

## License

MIT
