# Changelog

## 1.4.1

- Switch to the Homey **Compose** layout (`.homeycompose/`), which also fixes drivers,
  capabilities and Flow cards not being merged by the CLI
- Add Flow cards:
  - Cover: *Set position*, *Open*, *Close*, *Stop*, and condition *Position is …*
  - Light: *Set brightness*, *Set color*
- Flow cards use an autocomplete device picker scoped to the app's devices
  (Homey on this firmware drops cards that use a `driver_id` device filter)

## 1.3.0

- Remove cloud status sync; state is tracked **purely locally** (cloud is only used
  for device discovery during pairing)
- Persist last known state on the device so it survives restarts
- Fix Homey "timeout after 10000ms": box IP is now discovered at pairing and in the
  background, and discovery/send timeouts are bounded well under 10 s
- Faster command path (cached box IP)

## 1.2.0

- Rename app to **Pergola Local** (`one.zyx.pergola-local`) to avoid trademarks in the app name
- Add continuous-run (repeated-frame burst) support for jog-based blades (type 22 model 31)
- Dim-to-zero now turns lights/heater off
- Docs: trademark disclaimer, comparison notes

## 1.1.0

- Add discrete **Position** picker for covers (Closed 0% / 33% / 66% / 100%)
- Slider now snaps to the nearest supported hardware step
- Add per-driver device icons (`drivers/*/assets/icon.svg`)
- Move source to `github.com/rrusinov/homey-pergola-local`

## 1.0.0

- Initial release
- Local LAN control (UDP :55555 discovery, TCP :400 commands)
- One-time cloud pairing to enumerate devices; fully offline control afterwards
- `cover` and `light`/`heater` drivers
