/**
 * OpenAI SDK uploads require a global `File` (see `openai/internal/uploads.js`).
 * Node 18 often has no global `File`; Node 20+ does. Polyfill from `node:buffer` for Whisper `toFile()`.
 */
import { File as NodeBufferFile } from "node:buffer";

if (typeof globalThis.File === "undefined") {
  (globalThis as unknown as { File: typeof NodeBufferFile }).File = NodeBufferFile;
}

export {};
