/**
 * Philips Hue adapter stub
 *
 * Uses the Hue CLIP API v2 (Bridge API). Authentication requires a developer
 * username obtained via the bridge's /api endpoint. All requests are HTTPS to
 * the local bridge IP; the bridge uses a self-signed cert (disable cert
 * verification for local LAN use only).
 *
 * Reference: https://developers.meethue.com/develop/hue-api-v2/
 */

// TODO (Phase 3): import node-fetch or the official hue-api-v3 SDK.

export interface HueConfig {
  /** Local IP of the Hue Bridge */
  bridgeIp: string;
  /** Application key (username) obtained from /api endpoint */
  appKey: string;
  /** Comma-separated light or group resource IDs to target */
  resourceIds: string[];
}

export interface LightAdapter {
  name: string;
  send(r: number, g: number, b: number, brightness: number, transition_ms: number): Promise<void>;
}

export class HueAdapter implements LightAdapter {
  readonly name = 'hue';

  constructor(private readonly config: HueConfig) {
    // TODO (Phase 3): validate config fields, pre-build base URL.
    void config;
  }

  async send(
    r: number,
    g: number,
    b: number,
    brightness: number,
    transition_ms: number,
  ): Promise<void> {
    // TODO (Phase 3): convert RGB to Hue XY colour space, PATCH each resource.
    void r; void g; void b; void brightness; void transition_ms;
    throw new Error('HueAdapter.send() not yet implemented');
  }
}
