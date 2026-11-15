# SignalRGB plugin for Creative Pebble X

A [SignalRGB](https://signalrgb.com) plugin that drives the RGB lighting of the **Creative Pebble X** desktop speakers (USB `041E:3299`) from the SignalRGB canvas.

SignalRGB has no built-in support for this speaker. The plugin talks to it over the same USB HID channel that Creative App uses.

## Install

1. Download [`Creative_Pebble_X.js`](Creative_Pebble_X.js).
2. Put it in `Documents\WhirlwindFX\Plugins\`.
3. Restart SignalRGB from the tray: **Exit**, then start it again.
4. **Creative Pebble X** appears under Devices. Place it on your layout.

The speaker must be connected over USB, because Bluetooth does not carry the lighting channel.

## How it behaves

- The plugin samples **5 points** from a vertical column on the canvas and shows them on the speaker from top to bottom.
- It uses **slot 6** of the speaker's lighting slots. It sets that slot to the *Static* effect and makes it active. When SignalRGB exits, slot 6 goes back to Creative's default effect.
- When SignalRGB exits, the speaker lighting turns off by default. If you want Creative's default effect to keep running instead, set **Lighting on exit** to *On* in the device settings.
- It sends at most 10 updates per second, and only when a colour changes. It also resends the current colours every 2 seconds.
- Don't change the lighting in Creative App while SignalRGB is running. If you pick another slot or effect there, it overrides the plugin until SignalRGB restarts.

## Limits

These were measured on a real speaker:

| What | Result |
|---|---|
| Colours per update | exactly **5**. A packet with 6 or more colours is ignored as a whole. |
| Between the 5 colours | the firmware draws a smooth gradient across the LED segments. You cannot address single LEDs. |
| Left and right speaker | always show the same colours. They cannot be driven separately. |

## Protocol

This section is for anyone who wants to extend the plugin. It was worked out from USB captures of Creative App (USBPcap + Wireshark).

The commands go to HID interface 0, top-level collection usage page `0xFF01`, as 64-byte **output reports with report ID 3**. Creative App sends them as `SET_REPORT` control transfers, and the speaker answers on interrupt IN endpoint `0x82`.

```text
03 6A 3A <len> 00 <cmd> <args...>      (zero-padded to 64 bytes)
len = 1 (cmd) + number of argument bytes
```

| Command | Meaning |
|---|---|
| `25 01` / `25 00` | lighting on / off |
| `29 <slot> <effect>` | put an effect into slot 1–6 |
| `2D <slot>` | make a slot active |
| `2B <slot> 01 01 <FF B G R> ×5` | set the slot's colours, top first |
| `2B <slot> 03 <ms lo> <ms hi>` | set the slot's speed in milliseconds (250–6000) |
| `21` | list the effects the speaker supports |
| `22 <effect>` | describe one effect's parameters |

The speaker reports 8 effects: `0B 08 0A 09 04 01 03 07`. Effect `03` is *Static* and takes only the colour parameter. Each colour is 4 bytes: `FF`, blue, green, red.

## Licence

[MIT](LICENSE)
