import type { ComponentType } from 'react'
import { LapDeltaTower } from './LapDeltaTower'
import { RunningOrderStrip } from './RunningOrderStrip'
import { RaceControlFeed } from './RaceControlFeed'
import { WeatherDashboard } from './WeatherDashboard'
import { TyreIntelligence } from './TyreIntelligence'
import { FullTrackMap } from './FullTrackMap'
import { WeatherRadar } from './WeatherRadar'
import { StandingsBoard } from './StandingsBoard'
import { LiveLapTimeCard } from './LiveLapTimeCard'
import { LastLapCard } from './LastLapCard'
import { StintPaceComparison } from './StintPaceComparison'
import { SectorMiniCards } from './SectorMiniCards'
import {
  GapEvolutionChart,
  HeadToHeadDelta,
  SpeedGauge,
  ThrottleBrakeTrace,
  GearTrace,
  ThrottleHeatmap,
  ERSMicroSectors,
  DRSEfficiency,
  EngineModeTracker,
  StrategyTimeline,
  DegRateGraph,
  PitWindowUrgency,
  PitStopLog,
  UndercutSimulator,
  SectorMap,
  OvertakeReplay,
  TrackTempEvolution,
  WindDirection,
  RadioScanner,
  RadioFeedText,
  StandingsTable,
  ChampionshipCalculator,
  PointsDeltaTracker,
  CarVisualization,
} from './SpecPlaceholderWidgets'

export type WidgetCategory =
  | 'Timing'
  | 'Telemetry'
  | 'Race Control'
  | 'Strategy'
  | 'Weather'
  | 'Track'
  | 'Radio'
  | 'Standings'

export interface WidgetManifestEntry {
  type: string
  label: string
  description: string
  category: WidgetCategory
  color: string
  defaultSize: { w: number; h: number }
  minH: number
  /** When false, minH is respected as-is. When true (default), minH is auto-set to defaultSize.h so all content stays visible. */
  fitContent?: boolean
  component: ComponentType<{ widgetId: string }>
}

export const WIDGET_MANIFEST: WidgetManifestEntry[] = [
  {
    type: 'LapDeltaTower',
    label: 'Lap Delta Tower',
    description: 'Full ranking table with gap, interval, sector times',
    category: 'Timing',
    color: 'var(--red)',
    defaultSize: { w: 12, h: 10 },
    minH: 6,
    fitContent: false,
    component: LapDeltaTower,
  },
  {
    type: 'LastLapCard',
    label: 'Last Lap Card',
    description: 'Shows the last completed lap for a driver (no live timer)',
    category: 'Timing',
    color: 'var(--red)',
    defaultSize: { w: 4, h: 4 },
    minH: 3,
    component: LastLapCard,
  },
  {
    type: 'LiveLapTimeCard',
    label: 'Lap Time Card',
    description: 'Shows the live running lap timer for the focused driver (no completed lap fallback)',
    category: 'Timing',
    color: 'var(--red)',
    defaultSize: { w: 4, h: 5 },
    minH: 3,
    component: LiveLapTimeCard,
  },
  {
    type: 'GapEvolutionChart',
    label: 'Gap Evolution Chart',
    description: 'Gap history chart between two selected drivers',
    category: 'Timing',
    color: 'var(--red)',
    defaultSize: { w: 8, h: 4 },
    minH: 3,
    component: GapEvolutionChart,
  },
  {
    type: 'HeadToHeadDelta',
    label: 'Head-to-Head Delta',
    description: 'Direct comparison card for two driver targets',
    category: 'Timing',
    color: 'var(--red)',
    defaultSize: { w: 8, h: 4 },
    minH: 3,
    component: HeadToHeadDelta,
  },
  {
    type: 'SectorMiniCards',
    label: 'Sector Mini-Cards',
    description: 'Compact S1/S2/S3 performance cards',
    category: 'Timing',
    color: 'var(--red)',
    defaultSize: { w: 4, h: 5 },
    minH: 3,
    component: SectorMiniCards,
  },
  {
    type: 'SpeedGauge',
    label: 'Speed Gauge',
    description: 'Live speed telemetry with gear/rpm view',
    category: 'Telemetry',
    color: 'var(--purple)',
    defaultSize: { w: 4, h: 4 },
    minH: 3,
    component: SpeedGauge,
  },
  {
    type: 'ThrottleBrakeTrace',
    label: 'Throttle / Brake Trace',
    description: 'Pedal input timeline for focused driver',
    category: 'Telemetry',
    color: 'var(--purple)',
    defaultSize: { w: 8, h: 4 },
    minH: 3,
    component: ThrottleBrakeTrace,
  },
  {
    type: 'GearTrace',
    label: 'Gear Trace',
    description: 'Rolling gear selection trace over time',
    category: 'Telemetry',
    color: 'var(--purple)',
    defaultSize: { w: 8, h: 4 },
    minH: 3,
    component: GearTrace,
  },
  {
    type: 'ThrottleHeatmap',
    label: 'Throttle Heatmap',
    description: 'Lap segment throttle intensity heatmap',
    category: 'Telemetry',
    color: 'var(--purple)',
    defaultSize: { w: 8, h: 8 },
    minH: 3,
    component: ThrottleHeatmap,
  },
  {
    type: 'ERSMicroSectors',
    label: 'ERS Micro-Sectors',
    description: 'Inferred ERS deployment by micro-sector',
    category: 'Telemetry',
    color: 'var(--purple)',
    defaultSize: { w: 8, h: 8 },
    minH: 3,
    component: ERSMicroSectors,
  },
  {
    type: 'DRSEfficiency',
    label: 'DRS Efficiency',
    description: 'Inferred open-vs-closed DRS delta metric',
    category: 'Telemetry',
    color: 'var(--purple)',
    defaultSize: { w: 4, h: 4 },
    minH: 3,
    component: DRSEfficiency,
  },
  {
    type: 'EngineModeTracker',
    label: 'Engine Mode Tracker',
    description: 'Inferred power mode behavior tracker',
    category: 'Telemetry',
    color: 'var(--purple)',
    defaultSize: { w: 4, h: 4 },
    minH: 3,
    component: EngineModeTracker,
  },
  {
    type: 'CarVisualization',
    label: 'Car Visualization',
    description: '2026 car profile with telemetry overlays',
    category: 'Telemetry',
    color: 'var(--purple)',
    defaultSize: { w: 12, h: 8 },
    minH: 3,
    component: CarVisualization,
  },
  {
    type: 'RunningOrderStrip',
    label: 'Running Order Strip',
    description: 'Horizontal dot row of all 20 drivers by position',
    category: 'Race Control',
    color: 'var(--orange)',
    defaultSize: { w: 24, h: 2 },
    minH: 1,
    fitContent: false,
    component: RunningOrderStrip,
  },
  {
    type: 'RaceControlFeed',
    label: 'Race Control Feed',
    description: 'Timestamped flag and incident log',
    category: 'Race Control',
    color: 'var(--gold)',
    defaultSize: { w: 8, h: 8 },
    minH: 3,
    fitContent: false,
    component: RaceControlFeed,
  },
  {
    type: 'StintPaceComparison',
    label: 'Stint Pace Comparison',
    description: 'Compares pace in a matched tyre age window',
    category: 'Strategy',
    color: 'var(--purple)',
    defaultSize: { w: 8, h: 4 },
    minH: 3,
    component: StintPaceComparison,
  },
  {
    type: 'StrategyTimeline',
    label: 'Strategy Timeline',
    description: 'All-driver stint timeline with pit markers',
    category: 'Strategy',
    color: 'var(--gold)',
    defaultSize: { w: 16, h: 6 },
    minH: 3,
    component: StrategyTimeline,
  },
  {
    type: 'DegRateGraph',
    label: 'Deg Rate Graph',
    description: 'Inferred tyre degradation curve by stint',
    category: 'Strategy',
    color: 'var(--gold)',
    defaultSize: { w: 8, h: 4 },
    minH: 3,
    component: DegRateGraph,
  },
  {
    type: 'PitWindowUrgency',
    label: 'Pit Window Urgency',
    description: 'Inferred urgency signal for next stop window',
    category: 'Strategy',
    color: 'var(--gold)',
    defaultSize: { w: 4, h: 4 },
    minH: 3,
    component: PitWindowUrgency,
  },
  {
    type: 'PitStopLog',
    label: 'Pit Stop Log',
    description: 'Chronological pit stop history list',
    category: 'Strategy',
    color: 'var(--gold)',
    defaultSize: { w: 8, h: 4 },
    minH: 3,
    component: PitStopLog,
  },
  {
    type: 'UndercutSimulator',
    label: 'Undercut Simulator',
    description: 'Scenario calculator for undercut outcomes',
    category: 'Strategy',
    color: 'var(--gold)',
    defaultSize: { w: 8, h: 8 },
    minH: 3,
    component: UndercutSimulator,
  },
  {
    type: 'TyreIntelligence',
    label: 'Tyre Intelligence',
    description: 'Cliff lap prediction with editable formula ~EST',
    category: 'Strategy',
    color: 'var(--green)',
    defaultSize: { w: 6, h: 6 },
    minH: 3,
    component: TyreIntelligence,
  },
  {
    type: 'WeatherDashboard',
    label: 'Weather Dashboard',
    description: '6 live weather metrics with trend arrows',
    category: 'Weather',
    color: 'var(--cyan)',
    defaultSize: { w: 8, h: 5 },
    minH: 3,
    component: WeatherDashboard,
  },
  {
    type: 'TrackTempEvolution',
    label: 'Track Temp Evolution',
    description: 'Track temperature chart with inferred overlays',
    category: 'Weather',
    color: 'var(--blue)',
    defaultSize: { w: 8, h: 4 },
    minH: 3,
    component: TrackTempEvolution,
  },
  {
    type: 'WindDirection',
    label: 'Wind Direction',
    description: 'Wind direction and drift changes by heading',
    category: 'Weather',
    color: 'var(--blue)',
    defaultSize: { w: 4, h: 4 },
    minH: 3,
    component: WindDirection,
  },
  {
    type: 'WeatherRadar',
    label: 'Weather Radar',
    description: 'Windy embed centered on circuit',
    category: 'Weather',
    color: 'var(--blue)',
    defaultSize: { w: 8, h: 8 },
    minH: 3,
    component: WeatherRadar,
  },
  {
    type: 'FullTrackMap',
    label: 'Full Track Map',
    description: 'Live driver positions on SVG circuit outline',
    category: 'Track',
    color: 'var(--purple)',
    defaultSize: { w: 8, h: 8 },
    minH: 3,
    component: FullTrackMap,
  },
  {
    type: 'SectorMap',
    label: 'Sector Map',
    description: 'Track sectors with driver position context',
    category: 'Track',
    color: 'var(--green)',
    defaultSize: { w: 8, h: 8 },
    minH: 3,
    component: SectorMap,
  },
  {
    type: 'OvertakeReplay',
    label: 'Overtake Replay',
    description: 'Historic overtake events and replay timeline',
    category: 'Track',
    color: 'var(--green)',
    defaultSize: { w: 8, h: 8 },
    minH: 3,
    component: OvertakeReplay,
  },
  {
    type: 'RadioScanner',
    label: 'Radio Scanner',
    description: 'Live team radio channel scanner',
    category: 'Radio',
    color: 'var(--pink)',
    defaultSize: { w: 8, h: 8 },
    minH: 3,
    fitContent: false,
    component: RadioScanner,
  },
  {
    type: 'RadioFeedText',
    label: 'Radio Feed (Text)',
    description: 'Text feed of transcribed radio messages',
    category: 'Radio',
    color: 'var(--pink)',
    defaultSize: { w: 6, h: 8 },
    minH: 3,
    fitContent: false,
    component: RadioFeedText,
  },
  {
    type: 'StandingsBoard',
    label: 'Standings Board',
    description: 'Projected driver + constructor points board',
    category: 'Standings',
    color: 'var(--green)',
    defaultSize: { w: 12, h: 8 },
    minH: 3,
    component: StandingsBoard,
  },
  {
    type: 'StandingsTable',
    label: 'Standings Table',
    description: 'Live driver and constructor championship table',
    category: 'Standings',
    color: 'var(--gold)',
    defaultSize: { w: 12, h: 8 },
    minH: 3,
    component: StandingsTable,
  },
  {
    type: 'ChampionshipCalculator',
    label: 'Championship Calculator',
    description: 'What-if points outcomes and title scenarios',
    category: 'Standings',
    color: 'var(--gold)',
    defaultSize: { w: 10, h: 8 },
    minH: 3,
    component: ChampionshipCalculator,
  },
  {
    type: 'PointsDeltaTracker',
    label: 'Points Delta Tracker',
    description: 'Historic points swing between contenders',
    category: 'Standings',
    color: 'var(--gold)',
    defaultSize: { w: 8, h: 4 },
    minH: 3,
    component: PointsDeltaTracker,
  },
]

export const WIDGET_REGISTRY: Record<string, ComponentType<{ widgetId: string }>> = Object.fromEntries(
  WIDGET_MANIFEST.map((e) => [e.type, e.component])
)

export const WIDGET_DEFAULTS: Record<string, { w: number; h: number }> = Object.fromEntries(
  WIDGET_MANIFEST.map((e) => [e.type, e.defaultSize])
)

export function getMinHeightForWidget(type: string): number {
  const entry = WIDGET_MANIFEST.find((e) => e.type === type)
  if (!entry) return 3
  return entry.fitContent === false ? entry.minH : entry.defaultSize.h
}

export const WIDGET_PICKER_LIST = WIDGET_MANIFEST.map(({ type, label, description, color }) => ({
  type,
  label,
  description,
  color,
}))

export const WIDGET_CATEGORY_MAP: Record<string, WidgetCategory> = Object.fromEntries(
  WIDGET_MANIFEST.map((e) => [e.type, e.category])
)
