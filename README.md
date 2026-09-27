# Teleco Daisy (Local) — Homey app

Control your **Teleco Automation DaisyBox** from Homey over your **local network**, without the Teleco cloud.

The DaisyBox speaks a local, unauthenticated protocol on the LAN:

1. It broadcasts a discovery beacon on **UDP port 55555** (contains its MAC / `instCode` and IP).
2. Commands are sent to **TCP port 400**, XOR-obfuscated and Base64-encoded.

This app uses that channel for all control, so commands are near-instant and keep working when the Teleco cloud is unavailable.

> **Unofficial.** This is an independent, community-developed project. It is not affiliated with, authorized, or endorsed by Teleco Automation S.r.l. or Somfy. "Teleco", "Daisy" and "DaisyBox" are trademarks of their respective owners and are used here only to describe compatibility.

## How it works

- **Pairing (one-time cloud):** when you add a device, you log in once with your Daisy app email/password. The app reads your installation, rooms and devices from the Teleco cloud and stores the device IDs locally.
- **Control (fully local):** every command is sent directly to the DaisyBox on TCP :400. No internet connection is required after pairing.

## Requirements

- **Homey Pro** (2016–2019 or Early 2023). Homey Cloud / Bridge cannot run local-network apps.
- The DaisyBox and Homey on the same LAN/subnet.
- A Daisy account (only for the one-time pairing step).

## Installation (development)

```bash
npm install -g homey
homey login
homey select --id <your-homey-id>
git clone https://github.com/rrusinov/homey-teleco-daisy.git
cd homey-teleco-daisy
homey app install
```

Then in the Homey app: **Devices → + → Add Device → Teleco Daisy (Local)**.

## Supported devices

Any Teleco Daisy device type exposed by the cloud configuration:

- **Louver / Cover** — pergola slats, awnings, shades, curtains (`windowcoverings`).
- **Light / Heater** — on/off lights, dimmable 4-level lights, 4-channel heaters (`light`).

### Positions

The hardware only accepts discrete steps. The **Position** picker offers
`Closed (0%) / 33% / 66% / 100%`. The standard Homey slider is also available
and snaps to the nearest supported step.

## Limitations

- **No local state feedback.** The box's TCP :400 channel is write-only (it only
  replies `ACK` / `DENY`). Device state is pushed by the box to the Teleco cloud,
  so this app tracks position optimistically. Homey cannot read the real
  position without using the cloud.
- The DaisyBox handles **one command at a time** and can be temporarily
  unresponsive under bursts. Commands are serialised; a busy box returns
  `DaisyBox is busy`.
- Slat position for one-way motors is an estimate (no hardware feedback).

## Credits

The local protocol was reverse-engineered by the community:

- [andreasnuesslein/py-teleco-daisy](https://github.com/andreasnuesslein/py-teleco-daisy) (MIT)
- [andreasnuesslein/hass_teleco_daisy](https://github.com/andreasnuesslein/hass_teleco_daisy) (MIT)
- [croll83/ha-teleco-daisy](https://github.com/croll83/ha-teleco-daisy) — local LAN channel (MIT)

See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for their license texts.

## License

[MIT](LICENSE) © Ruslan Rusinov. Unofficial and not endorsed by Teleco Automation / Somfy.
