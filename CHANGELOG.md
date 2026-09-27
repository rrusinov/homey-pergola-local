# Changelog

## 1.2.0

- Rename app to **Pergola Local** (`one.zyx.pergola-local`) to avoid trademarks in the app name
- Add continuous-run (repeated-frame burst) support for jog-based blades (type 22 model 31)
- Dim-to-zero now turns lights/heater off
- Docs: trademark disclaimer, comparison notes

## 1.1.0

- Add discrete **Position** picker for covers (Closed 0% / 33% / 66% / 100%)
- Slider now snaps to the nearest supported hardware step
- Add per-driver device icons (`drivers/*/assets/icon.svg`)
- Move source to `github.com/rrusinov/homey-teleco-daisy`

## 1.0.0

- Initial release
- Local LAN control (UDP :55555 discovery, TCP :400 commands)
- One-time cloud pairing to enumerate devices; fully offline control afterwards
- `cover` and `light`/`heater` drivers
