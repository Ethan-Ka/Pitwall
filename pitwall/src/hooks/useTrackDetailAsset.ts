import { useQuery } from '@tanstack/react-query'

// Maps the metadata.json `file` field → avif filename suffix
const FILE_TO_DETAIL: Record<string, string> = {
  melbourne: 'melbourne',
  shanghai: 'shanghai',
  suzuka: 'suzuka',
  montreal: 'montreal',
  monaco: 'montecarlo',
  barcelona: 'catalunya',
  spielberg: 'spielberg',
  silverstone: 'silverstone',
  spa: 'spafrancorchamps',
  budapest: 'hungaroring',
  zandvoort: 'zandvoort',
  monza: 'monza',
  baku: 'baku',
  singapore: 'singapore',
  austin: 'austin',
  mexico_city: 'mexicocity',
  sao_paulo: 'interlagos',
  las_vegas: 'lasvegas',
  lusail: 'lusail',
  abu_dhabi: 'yasmarinacircuit',
}

// Fallback for rounds where metadata `file` is null (e.g. Madrid new circuit)
const OPENF1_TO_DETAIL: Record<string, string> = {
  madrid: 'madring',
}

interface TrackMetadataRound {
  round: number
  file: string | null
  format: string | null
  openf1Names?: string[]
  detailRotation?: number
}

interface TrackMetadata {
  season: number
  rounds: TrackMetadataRound[]
}

export interface TrackDetailAsset {
  url: string
  detailRotation: number
}

export function useTrackDetailAsset(
  year: number | null,
  round: number | null,
  circuitShortName?: string | null,
): TrackDetailAsset | null {
  const { data } = useQuery({
    queryKey: ['track-detail-asset', year, round ?? circuitShortName],
    enabled: year != null && (round != null || circuitShortName != null),
    staleTime: Infinity,
    retry: false,
    queryFn: async (): Promise<TrackDetailAsset | null> => {
      if (year == null) return null
      const res = await fetch(`/seasons/${year}/tracks/metadata.json`)
      if (!res.ok) return null
      const meta: TrackMetadata = await res.json()

      let entry: TrackMetadataRound | undefined
      if (round != null) {
        entry = meta.rounds.find((r) => r.round === round)
      } else if (circuitShortName) {
        entry = meta.rounds.find((r) =>
          r.openf1Names?.some(
            (n) => n.toLowerCase() === circuitShortName.toLowerCase(),
          ),
        )
      }

      if (!entry) return null
      const detailRotation = entry.detailRotation ?? 0

      if (entry.file) {
        const suffix = FILE_TO_DETAIL[entry.file]
        if (suffix) {
          return { url: `/seasons/${year}/tracks/detailed/${year}track${suffix}detailed.avif`, detailRotation }
        }
      }

      if (entry.openf1Names) {
        for (const name of entry.openf1Names) {
          const suffix = OPENF1_TO_DETAIL[name.toLowerCase()]
          if (suffix) {
            return { url: `/seasons/${year}/tracks/detailed/${year}track${suffix}detailed.avif`, detailRotation }
          }
        }
      }

      return null
    },
  })
  return data ?? null
}
