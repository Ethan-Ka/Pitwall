/**
 * rgbBridge — browser-side WebSocket client for the Pitwall RGB bridge process.
 *
 * API contract
 * ------------
 * Connects to ws://localhost:8765 (the local Node.js bridge started in Phase 3).
 * Sends colour commands as JSON:
 *
 *   {
 *     r:             number,   // 0–255
 *     g:             number,   // 0–255
 *     b:             number,   // 0–255
 *     brightness:    number,   // 0–100 (percentage)
 *     transition_ms: number    // crossfade duration in milliseconds
 *   }
 *
 * Error philosophy
 * ----------------
 * This client is best-effort: if the bridge is not running (localhost:8765
 * unreachable) the app should continue to function normally. All errors are
 * surfaced as console.warn() rather than thrown exceptions, so callers do not
 * need to wrap sendColor() in try/catch.
 */

const BRIDGE_URL = 'ws://localhost:8765';

export interface RgbColorCommand {
  r: number;
  g: number;
  b: number;
  brightness: number;
  transition_ms: number;
}

export class RgbBridgeClient {
  private ws: WebSocket | null = null;
  private intentionalClose = false;

  /**
   * Open the WebSocket connection to the local bridge.
   * Safe to call multiple times — returns early if already connected.
   */
  connect(): void {
    if (this.ws !== null && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    this.intentionalClose = false;

    try {
      this.ws = new WebSocket(BRIDGE_URL);
    } catch (err) {
      console.warn('[rgbBridge] Failed to create WebSocket:', err);
      this.ws = null;
      return;
    }

    this.ws.addEventListener('open', () => {
      console.info('[rgbBridge] Connected to bridge at', BRIDGE_URL);
    });

    this.ws.addEventListener('error', (event) => {
      // The bridge process is likely not running — this is expected in dev
      // when Phase 3 has not been started.
      console.warn('[rgbBridge] WebSocket error (is the bridge running?)', event);
    });

    this.ws.addEventListener('close', (event) => {
      if (!this.intentionalClose) {
        console.warn(
          `[rgbBridge] Connection closed unexpectedly (code ${event.code}). Bridge may have stopped.`,
        );
      }
      this.ws = null;
    });
  }

  /**
   * Close the WebSocket connection gracefully.
   * Safe to call when already disconnected.
   */
  disconnect(): void {
    if (this.ws === null) return;
    this.intentionalClose = true;
    this.ws.close(1000, 'Client disconnecting');
    this.ws = null;
  }

  /**
   * Send a colour command to the bridge.
   *
   * All parameters are validated before sending; out-of-range values are
   * clamped rather than rejected so callers can pass raw colour data without
   * pre-processing.
   *
   * Warns (does not throw) if the socket is not open.
   *
   * @param r            Red channel, 0–255
   * @param g            Green channel, 0–255
   * @param b            Blue channel, 0–255
   * @param brightness   Brightness percentage, 0–100
   * @param transition_ms Crossfade duration in milliseconds, >= 0
   */
  sendColor(
    r: number,
    g: number,
    b: number,
    brightness: number,
    transition_ms: number,
  ): void {
    if (this.ws === null || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[rgbBridge] sendColor() called but bridge is not connected. Skipping.');
      return;
    }

    const command: RgbColorCommand = {
      r:             Math.round(Math.max(0, Math.min(255, r))),
      g:             Math.round(Math.max(0, Math.min(255, g))),
      b:             Math.round(Math.max(0, Math.min(255, b))),
      brightness:    Math.round(Math.max(0, Math.min(100, brightness))),
      transition_ms: Math.max(0, Math.round(transition_ms)),
    };

    try {
      this.ws.send(JSON.stringify(command));
    } catch (err) {
      console.warn('[rgbBridge] Failed to send colour command:', err);
    }
  }

  /** True if the WebSocket is currently open and ready. */
  get isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

/**
 * Shared singleton for use across the app.
 * Call rgbBridge.connect() once during app initialisation (e.g., in main.tsx)
 * and rgbBridge.disconnect() on teardown.
 */
export const rgbBridge = new RgbBridgeClient();
