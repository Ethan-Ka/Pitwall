// Shared coordinate helpers for circuit map widgets.
// Both FullTrackMap and SectorMap use the same normalizer — keeping them here
// prevents the two copies from diverging when the transform logic changes.

export interface BBox {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

export function bboxFromPoints(pts: { x: number; y: number }[]): BBox {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const p of pts) {
    if (p.x < minX) minX = p.x
    if (p.x > maxX) maxX = p.x
    if (p.y < minY) minY = p.y
    if (p.y > maxY) maxY = p.y
  }
  return { minX, maxX, minY, maxY }
}

// Maps FastF1/OpenF1 metric-space (x, y) into SVG pixel space.
// FastF1 Y increases upward; SVG Y increases downward — flip applied here.
export function makeNormalizer(bbox: BBox, svgW: number, svgH: number, pad = 20) {
  const rangeX = bbox.maxX - bbox.minX || 1
  const rangeY = bbox.maxY - bbox.minY || 1
  const scale = Math.min((svgW - pad * 2) / rangeX, (svgH - pad * 2) / rangeY)
  const offX = pad + ((svgW - pad * 2) - rangeX * scale) / 2
  const offY = pad + ((svgH - pad * 2) - rangeY * scale) / 2
  return {
    toSVG: (x: number, y: number) => ({
      svgX: offX + (x - bbox.minX) * scale,
      svgY: svgH - (offY + (y - bbox.minY) * scale),
    }),
    scale,
  }
}
