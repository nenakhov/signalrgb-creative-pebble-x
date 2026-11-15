// Creative Pebble X (USB 041E:3299) - SignalRGB plugin.
// Protocol taken from a USB capture of Creative App (2026-11-15):
//   every command is a 64-byte HID output report (ID 0x03) on the vendor collection 0xFF01:
//   03 6A 3A <len> 00 <cmd> <args...>      len = 1 (cmd) + args length
//   25 01 / 25 00                light on / off
//   29 <slot> <effect>           put an effect into a slot (effect 03 = "Static", 5 colours)
//   2D <slot>                    make that slot the active one
//   2B <slot> 01 01 <FF B G R>*5 colours of the slot, top of the speaker first
// SignalRGB takes slot 6 for itself and restores it to Creative's default (effect 01) on shutdown.

export function Name() { return "Creative Pebble X"; }
export function VendorId() { return 0x041E; }
export function ProductId() { return 0x3299; }
export function Publisher() { return "nenakhov"; }
export function Type() { return "Hid"; }
export function DeviceType() { return "speakers"; }
export function Size() { return [1, 5]; }
export function DefaultPosition() { return [10, 60]; }
export function DefaultScale() { return 8.0; }
/* global
shutdownColor:readonly
LightingMode:readonly
forcedColor:readonly
*/
export function ControllableParameters() {
	return [
		{"property":"shutdownColor", "group":"lighting", "label":"Shutdown Color", "min":"0", "max":"360", "type":"color", "default":"#000000"},
		{"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", "type":"combobox", "values":["Canvas", "Forced"], "default":"Canvas"},
		{"property":"forcedColor", "group":"lighting", "label":"Forced Color", "min":"0", "max":"360", "type":"color", "default":"#009bde"},
	];
}

const SLOT = 0x06;
const EFFECT_STATIC = 0x03;
const EFFECT_CREATIVE_DEFAULT_SLOT6 = 0x01;
const MIN_INTERVAL_MS = 100;          // at most 10 colour updates per second
const KEEPALIVE_MS = 2000;            // resend unchanged colours now and then

const vLedNames = ["Top", "Upper", "Middle", "Lower", "Bottom"];
const vLedPositions = [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]];

let lastPacket = "";
let lastSent = 0;

export function LedNames() { return vLedNames; }
export function LedPositions() { return vLedPositions; }

export function Validate(endpoint) {
	return endpoint.interface === 0 && endpoint.usage_page === 0xFF01;
}

function sendCommand(bytes) {
	const packet = new Array(64).fill(0);
	packet[0] = 0x03;
	packet[1] = 0x6A;
	packet[2] = 0x3A;
	packet[3] = bytes.length;
	packet[4] = 0x00;
	for (let i = 0; i < bytes.length; i++) { packet[5 + i] = bytes[i]; }
	device.write(packet, 64);
}

export function Initialize() {
	sendCommand([0x25, 0x01]);                    // light on
	sendCommand([0x29, SLOT, EFFECT_STATIC]);     // slot 6 = Static
	sendCommand([0x2D, SLOT]);                    // activate slot 6
	lastPacket = "";
}

export function Render() {
	sendColors(false);
}

export function Shutdown(SystemSuspending) {
	sendColors(SystemSuspending ? "#000000" : shutdownColor);
	sendCommand([0x29, SLOT, EFFECT_CREATIVE_DEFAULT_SLOT6]);  // give slot 6 back to Creative's default effect
}

function sendColors(overrideColor) {
	const args = [0x2B, SLOT, 0x01, 0x01];

	for (let i = 0; i < vLedPositions.length; i++) {
		let col;

		if (overrideColor) {
			col = hexToRgb(overrideColor);
		} else if (LightingMode === "Forced") {
			col = hexToRgb(forcedColor);
		} else {
			col = device.color(vLedPositions[i][0], vLedPositions[i][1]);
		}

		args.push(0xFF, col[2], col[1], col[0]);  // FF B G R
	}

	const now = Date.now();
	const key = args.join(",");

	if (!overrideColor) {
		if (now - lastSent < MIN_INTERVAL_MS) { return; }
		if (key === lastPacket && now - lastSent < KEEPALIVE_MS) { return; }
	}

	sendCommand(args);
	lastPacket = key;
	lastSent = now;
}

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);

	return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)];
}

export function ImageUrl() {
	return "https://assets.signalrgb.com/devices/default/audio/speakers.png";
}
