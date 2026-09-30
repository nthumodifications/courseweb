export interface ParsedSSEEvent {
  type: string;
  data?: unknown;
  code?: string;
}

type SSEFrame = ParsedSSEEvent | "[DONE]";

/**
 * Small SSE parser for the chat endpoint. A fetch chunk is not guaranteed to
 * end on a line (or even on a UTF-8 character), so callers should pass
 * decoded text to push() and process the returned complete frames.
 */
export class SSEParser {
  private buffer = "";
  private dataLines: string[] = [];

  push(chunk: string): SSEFrame[] {
    this.buffer += chunk;
    const frames: SSEFrame[] = [];

    let newlineIndex = this.buffer.indexOf("\n");
    while (newlineIndex !== -1) {
      let line = this.buffer.slice(0, newlineIndex);
      this.buffer = this.buffer.slice(newlineIndex + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);

      this.consumeLine(line, frames);
      newlineIndex = this.buffer.indexOf("\n");
    }

    return frames;
  }

  /** Flush a final line/frame when the response closes without another LF. */
  finish(): SSEFrame[] {
    const frames: SSEFrame[] = [];
    if (this.buffer.length > 0) {
      let line = this.buffer;
      this.buffer = "";
      if (line.endsWith("\r")) line = line.slice(0, -1);
      this.consumeLine(line, frames);
    }
    this.flushFrame(frames);
    return frames;
  }

  private consumeLine(line: string, frames: SSEFrame[]) {
    if (line === "") {
      this.flushFrame(frames);
      return;
    }

    // SSE comments/fields other than data are not part of this contract.
    if (!line.startsWith("data:")) return;
    const value = line.slice(5).startsWith(" ") ? line.slice(6) : line.slice(5);
    this.dataLines.push(value);
  }

  private flushFrame(frames: SSEFrame[]) {
    if (this.dataLines.length === 0) return;

    const data = this.dataLines.join("\n");
    this.dataLines = [];
    if (data === "[DONE]") {
      frames.push("[DONE]");
      return;
    }

    try {
      const parsed: unknown = JSON.parse(data);
      if (parsed && typeof parsed === "object" && "type" in parsed) {
        frames.push(parsed as ParsedSSEEvent);
      }
    } catch {
      // Ignore malformed/incomplete frames. The server contract only emits
      // JSON data, and a bad frame should not break later streamed text.
    }
  }
}
