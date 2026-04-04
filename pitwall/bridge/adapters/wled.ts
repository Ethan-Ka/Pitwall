/**
 * WLED adapter stub
 *
 * WLED exposes a UDP JSON API on port 21324 (by default) and a REST API at
 * http://<device>/json/state. Phase 3 should implement whichever is lower
 * latency for live colour streaming (UDP is preferred for < 30 ms round-trips).
 *
 * Reference: https://kno.wled.ge/interfaces/json-api/
 */

// TODO (Phase 3): import dgram from 'node:dgram' for UDP, or node-fetch for REST.

export interface WledConfig {
  /** IP address or hostname of the WLED device */
  host: string;
  /** UDP port (default 21324) */
  port?: number;
}

export interface LightAdapter {
  name: string;
  send(r: number, g: number, b: number, brightness: number, transition_ms: number): Promise<void>;
}

export class WledAdapter implements LightAdapter {
  readonly name = 'wled';

  constructor(private readonly config: WledConfig) {
    // TODO (Phase 3): create and cache UDP socket here.
    void config;
  }

  async send(
    r: number,
    g: number,
    b: number,
    brightness: number,
    transition_ms: number,
  ): Promise<void> {
    // TODO (Phase 3): serialize to WLED JSON format and send via UDP / REST.
    void r; void g; void b; void brightness; void transition_ms;
    throw new Error('WledAdapter.send() not yet implemented');
  }
}
