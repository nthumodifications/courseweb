import { describe, expect, test } from "bun:test";
import {
  decodeMqttPackets,
  encodeConnect,
  encodeRemainingLength,
  encodeSubscribe,
} from "./laundry-mqtt";

function bytes(value: Uint8Array): number[] {
  return Array.from(value);
}

describe("laundry MQTT codec", () => {
  test("encodes a clean MQTT 3.1.1 connection", () => {
    expect(bytes(encodeConnect("nthumods-test", 60))).toEqual([
      0x10,
      0x19,
      0,
      4,
      0x4d,
      0x51,
      0x54,
      0x54,
      4,
      2,
      0,
      60,
      0,
      13,
      ...Array.from(new TextEncoder().encode("nthumods-test")),
    ]);
  });

  test("encodes MQTT remaining lengths and per-machine subscriptions", () => {
    expect(bytes(encodeRemainingLength(127))).toEqual([127]);
    expect(bytes(encodeRemainingLength(128))).toEqual([128, 1]);
    const packet = encodeSubscribe(7, [
      "machine/a/status/#",
      "machine/b/status/#",
    ]);
    expect(bytes(packet.slice(0, 4))).toEqual([0x82, packet.length - 2, 0, 7]);
    expect(new TextDecoder().decode(packet)).toContain("machine/a/status/#");
    expect(new TextDecoder().decode(packet)).toContain("machine/b/status/#");
  });

  test("handles fragmented and concatenated CONNACK and PUBLISH packets", () => {
    const connack = new Uint8Array([0x20, 0x02, 0, 0]);
    const topic = new TextEncoder().encode("machine/abc/status/");
    const payload = new TextEncoder().encode('{"mac":"abc","status":2048}');
    const bodyLength = 2 + topic.length + 2 + payload.length;
    const publish = new Uint8Array([
      0x32,
      bodyLength,
      0,
      topic.length,
      ...topic,
      0,
      9,
      ...payload,
    ]);
    const first = decodeMqttPackets(
      new Uint8Array([...connack, ...publish.slice(0, 10)]),
    );
    expect(first.packets).toEqual([
      { kind: "connack", sessionPresent: false, returnCode: 0 },
    ]);
    const second = decodeMqttPackets(
      new Uint8Array([...first.remainder, ...publish.slice(10)]),
    );
    expect(second.remainder).toHaveLength(0);
    expect(second.packets).toEqual([
      {
        kind: "publish",
        topic: "machine/abc/status/",
        payload: '{"mac":"abc","status":2048}',
        qos: 1,
      },
    ]);
  });
});
