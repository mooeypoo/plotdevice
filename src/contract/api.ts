/**
 * The whole renderer↔main surface, exposed to the renderer as `window.plotDevice`.
 * Phase 1 adds the workspace use cases.
 */
export interface PlotDeviceApi {
  /** Incremented whenever this interface changes incompatibly. */
  readonly contractVersion: 1
}
