import { useQuery } from '@tanstack/react-query'

interface TrackMetadataRound {
  round: number
  file: string | null
  format: string | null
  openf1Names?: string[]
}

interface TrackMetadata {
  season: number
  rounds: TrackMetadataRound[]
}

export function useTrackDisplayAsset(
  year: number | null | undefined,
  round: number | null | undefined,
  circuitShortName?: string | null,
) {
  return useQuery({
    queryKey: ['track-display-asset', year, round ?? circuitShortName],
    enabled: year != null && (round != null || circuitShortName != null),
    staleTime: Infinity,
    retry: false,
    queryFn: async (): Promise<string | null> => {
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

      if (!entry?.file || !entry.format) return null
      return `/seasons/${year}/tracks/display/${entry.file}-1.${entry.format}`
    },
  })
}
