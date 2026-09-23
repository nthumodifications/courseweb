export const LAUNDRY_MQTT_URL = "wss://wipepay.com.tw:443/mqtt/";

export type MqttConnackPacket = {
  kind: "connack";
  sessionPresent: boolean;
  returnCode: number;
};

export type MqttPublishPacket = {
  kind: "publish";
  topic: string;
  payload: string;
  qos: 0 | 1 | 2;
};

export type MqttPacket =
  | MqttConnackPacket
  | MqttPublishPacket
  | { kind: "pingresp" | "pingreq" | "other"; packetType: number };

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function encodeUtf8(value: string): Uint8Array {
  const encoded = textEncoder.encode(value);
  if (encoded.length > 0xffff) throw new Error("MQTT UTF-8 field is too long");
  return new Uint8Array([
    encoded.length >> 8,
    encoded.length & 0xff,
    ...encoded,
  ]);
}

function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const result = new Uint8Array(
    parts.reduce((total, part) => total + part.length, 0),
  );
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

export function encodeRemainingLength(length: number): Uint8Array {
  if (!Number.isInteger(length) || length < 0 || length > 268_435_455) {
    throw new Error("Invalid MQTT remaining length");
  }
  const bytes: number[] = [];
  do {
    let encoded = length % 128;
    length = Math.floor(length / 128);
    if (length > 0) encoded |= 0x80;
    bytes.push(encoded);
  } while (length > 0);
  return new Uint8Array(bytes);
}

function encodePacket(
  packetType: number,
  body: Uint8Array,
  flags = 0,
): Uint8Array {
  return concatBytes(
    new Uint8Array([(packetType << 4) | flags]),
    encodeRemainingLength(body.length),
    body,
  );
}

export function encodeConnect(
  clientId: string,
  keepAliveSeconds = 60,
): Uint8Array {
  if (
    !Number.isInteger(keepAliveSeconds) ||
    keepAliveSeconds < 0 ||
    keepAliveSeconds > 0xffff
  ) {
    throw new Error("Invalid MQTT keepalive");
  }
  const variableHeader = new Uint8Array([
    0,
    4,
    0x4d,
    0x51,
    0x54,
    0x54,
    4,
    2,
    keepAliveSeconds >> 8,
    keepAliveSeconds & 0xff,
  ]);
  return encodePacket(1, concatBytes(variableHeader, encodeUtf8(clientId)));
}

export function encodeSubscribe(
  packetId: number,
  topics: readonly string[],
): Uint8Array {
  if (!Number.isInteger(packetId) || packetId < 1 || packetId > 0xffff) {
    throw new Error("Invalid MQTT packet identifier");
  }
  if (topics.length === 0) throw new Error("MQTT SUBSCRIBE needs a topic");
  const filters = topics.map((topic) =>
    concatBytes(encodeUtf8(topic), new Uint8Array([0])),
  );
  return encodePacket(
    8,
    concatBytes(new Uint8Array([packetId >> 8, packetId & 0xff]), ...filters),
    2,
  );
}

export function encodePingreq(): Uint8Array {
  return new Uint8Array([0xc0, 0]);
}

export function encodePingresp(): Uint8Array {
  return new Uint8Array([0xd0, 0]);
}

export function encodeDisconnect(): Uint8Array {
  return new Uint8Array([0xe0, 0]);
}

function readRemainingLength(
  bytes: Uint8Array,
  offset: number,
): { length: number; next: number } | null {
  let multiplier = 1;
  let value = 0;
  for (let count = 0; count < 4; count += 1) {
    if (offset + count >= bytes.length) return null;
    const encoded = bytes[offset + count];
    value += (encoded & 0x7f) * multiplier;
    if ((encoded & 0x80) === 0)
      return { length: value, next: offset + count + 1 };
    multiplier *= 128;
  }
  throw new Error("Malformed MQTT remaining length");
}

function readUtf8(
  bytes: Uint8Array,
  offset: number,
): { value: string; next: number } {
  if (offset + 2 > bytes.length) throw new Error("Malformed MQTT UTF-8 field");
  const length = (bytes[offset] << 8) | bytes[offset + 1];
  const next = offset + 2 + length;
  if (next > bytes.length) throw new Error("Malformed MQTT UTF-8 field");
  return { value: textDecoder.decode(bytes.subarray(offset + 2, next)), next };
}

function decodePacket(firstByte: number, body: Uint8Array): MqttPacket {
  const packetType = firstByte >> 4;
  if (packetType === 2) {
    if (body.length < 2) throw new Error("Malformed MQTT CONNACK");
    return {
      kind: "connack",
      sessionPresent: (body[0] & 1) === 1,
      returnCode: body[1],
    };
  }
  if (packetType === 3) {
    const qosValue = (firstByte >> 1) & 3;
    if (qosValue === 3) throw new Error("Malformed MQTT PUBLISH QoS");
    const qos = qosValue as 0 | 1 | 2;
    const topic = readUtf8(body, 0);
    let offset = topic.next;
    if (qos > 0) {
      if (offset + 2 > body.length)
        throw new Error("Malformed MQTT PUBLISH packet identifier");
      offset += 2;
    }
    return {
      kind: "publish",
      topic: topic.value,
      payload: textDecoder.decode(body.subarray(offset)),
      qos,
    };
  }
  if (packetType === 12) return { kind: "pingreq", packetType };
  if (packetType === 13) return { kind: "pingresp", packetType };
  return { kind: "other", packetType };
}

export function decodeMqttPackets(input: Uint8Array): {
  packets: MqttPacket[];
  remainder: Uint8Array;
} {
  const packets: MqttPacket[] = [];
  let offset = 0;
  while (offset < input.length) {
    const remaining = readRemainingLength(input, offset + 1);
    if (!remaining) break;
    const bodyStart = remaining.next;
    const packetEnd = bodyStart + remaining.length;
    if (packetEnd > input.length) break;
    packets.push(
      decodePacket(input[offset], input.subarray(bodyStart, packetEnd)),
    );
    offset = packetEnd;
  }
  return { packets, remainder: input.slice(offset) };
}

function randomClientId(): string {
  const bytes = new Uint8Array(8);
  if (globalThis.crypto?.getRandomValues)
    globalThis.crypto.getRandomValues(bytes);
  else
    for (let i = 0; i < bytes.length; i += 1)
      bytes[i] = Math.floor(Math.random() * 256);
  return `nthumods-${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

export type LaundryMqttClientOptions = {
  macs: readonly string[];
  onConnected: () => void;
  onClosed: () => void;
  onError: (error: Error) => void;
  onStatus: (mac: string, payload: unknown, receivedAtMs: number) => void;
};

export class LaundryMqttClient {
  private socket: WebSocket | null = null;
  private receiveBuffer = new Uint8Array();
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private packetId = 0;
  private closedByUser = false;

  constructor(private readonly options: LaundryMqttClientOptions) {}

  connect(): void {
    this.closedByUser = false;
    const socket = new WebSocket(LAUNDRY_MQTT_URL, ["mqtt"]);
    socket.binaryType = "arraybuffer";
    socket.onopen = () => {
      this.send(encodeConnect(randomClientId(), 60));
    };
    socket.onmessage = (event) => {
      void this.handleMessage(event.data);
    };
    socket.onerror = () => {
      this.options.onError(new Error("WipePay MQTT connection failed"));
    };
    socket.onclose = () => {
      this.stopPing();
      this.socket = null;
      if (!this.closedByUser) this.options.onClosed();
    };
    this.socket = socket;
  }

  close(): void {
    this.closedByUser = true;
    this.stopPing();
    if (this.socket?.readyState === 1) {
      try {
        this.send(encodeDisconnect());
      } catch {
        // The socket may close between the ready-state check and send.
      }
    }
    this.socket?.close();
    this.socket = null;
  }

  private send(packet: Uint8Array): void {
    if (!this.socket || this.socket.readyState !== 1) return;
    this.socket.send(packet);
  }

  private async handleMessage(data: unknown): Promise<void> {
    let bytes: Uint8Array;
    if (data instanceof ArrayBuffer) bytes = new Uint8Array(data);
    else if (ArrayBuffer.isView(data))
      bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    else if (data instanceof Blob)
      bytes = new Uint8Array(await data.arrayBuffer());
    else return;
    this.receiveBuffer = concatBytes(this.receiveBuffer, bytes);
    try {
      const result = decodeMqttPackets(this.receiveBuffer);
      this.receiveBuffer = result.remainder;
      for (const packet of result.packets) this.handlePacket(packet);
    } catch (error) {
      this.options.onError(
        error instanceof Error ? error : new Error("Malformed MQTT packet"),
      );
      this.closedByUser = false;
      this.stopPing();
      this.socket?.close();
    }
  }

  private handlePacket(packet: MqttPacket): void {
    if (packet.kind === "connack") {
      if (packet.returnCode !== 0)
        throw new Error(
          `WipePay MQTT rejected connection (${packet.returnCode})`,
        );
      const topics = this.options.macs.map((mac) => `machine/${mac}/status/#`);
      this.send(encodeSubscribe(this.nextPacketId(), topics));
      this.options.onConnected();
      this.pingTimer = setInterval(() => this.send(encodePingreq()), 30_000);
      return;
    }
    if (packet.kind === "pingreq") {
      this.send(encodePingresp());
      return;
    }
    if (packet.kind !== "publish") return;
    const match = packet.topic.match(/^machine\/([^/]+)\/status\/?$/);
    if (!match) return;
    try {
      this.options.onStatus(match[1], JSON.parse(packet.payload), Date.now());
    } catch {
      // Retain the connection when an unrelated or malformed status payload arrives.
    }
  }

  private nextPacketId(): number {
    this.packetId = (this.packetId % 0xffff) + 1;
    return this.packetId;
  }

  private stopPing(): void {
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = null;
  }
}
