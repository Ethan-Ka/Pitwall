/**
 * Govee adapter stub
 *
 * Govee devices support a LAN control mode (enabled in the Govee app) that
 * listens on UDP port 4003. Commands are sent as JSON payloads to the device's
 * local IP. Discovery packets can be broadcast on 239.255.255.250:4001.
 *
 * Reference: https://govee-public.s3.amazonaws.com/developer-docs/GoveeAPIReference.pdf
 *            (LAN Control section)
 */

// TODO (Phase 3): import dgram from 'node:dgram'.

export interface GoveeConfig {
  /** Local IP of the Govee device (or broadcast address for discovery) */
  deviceIp: string;
  /** SKU / model string used in command payloads */
  sku: string;
}

export interface LightAdapter {
  name: string;
  send(r: number, g: number, b: number, brightness: number, transition_ms: number): Promise<void>;
}

export class GoveeAdapter implements LightAdapter {
  readonly name = 'govee';

  constructor(private readonly config: GoveeConfig) {
    // TODO (Phase 3): create UDP socket, optionally run device discovery.
    void config;
  }

  async send(
    r: number,
    g: number,
    b: number,
    brightness: number,
    transition_ms: number,
  ): Promise<void> {
    // TODO (Phase 3): build Govee LAN command JSON, send via UDP to port 4003.
    void r; void g; void b; void brightness; void transition_ms;
    throw new Error('GoveeAdapter.send() not yet implemented');
  }
}
