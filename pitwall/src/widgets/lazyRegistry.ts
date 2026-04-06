import type { ComponentType } from 'react'

type WidgetComponent = ComponentType<{ widgetId: string }>
type WidgetLoader = () => Promise<WidgetComponent>

let specWidgetsModulePromise: Promise<typeof import('./SpecPlaceholderWidgets')> | null = null

function loadSpecWidgets() {
  specWidgetsModulePromise ??= import('./SpecPlaceholderWidgets')
  return specWidgetsModulePromise
}

const WIDGET_LAZY_LOADERS: Record<string, WidgetLoader> = {
  LapDeltaTower: () => import('./LapDeltaTower').then((m) => m.LapDeltaTower),
  RunningOrderStrip: () => import('./RunningOrderStrip').then((m) => m.RunningOrderStrip),
  RaceControlFeed: () => import('./RaceControlFeed').then((m) => m.RaceControlFeed),
  WeatherDashboard: () => import('./WeatherDashboard').then((m) => m.WeatherDashboard),
  TyreIntelligence: () => import('./TyreIntelligence').then((m) => m.TyreIntelligence),
  FullTrackMap: () => import('./FullTrackMap').then((m) => m.FullTrackMap),
  WeatherRadar: () => import('./WeatherRadar').then((m) => m.WeatherRadar),
  StandingsBoard: () => import('./StandingsBoard').then((m) => m.StandingsBoard),
  LapTimeCard: () => import('./LapTimeCard').then((m) => m.LapTimeCard),
  GapEvolutionChart: () => loadSpecWidgets().then((m) => m.GapEvolutionChart),
  StintPaceComparison: () => import('./StintPaceComparison').then((m) => m.StintPaceComparison),
  HeadToHeadDelta: () => loadSpecWidgets().then((m) => m.HeadToHeadDelta),
  SectorMiniCards: () => loadSpecWidgets().then((m) => m.SectorMiniCards),
  SpeedGauge: () => loadSpecWidgets().then((m) => m.SpeedGauge),
  ThrottleBrakeTrace: () => loadSpecWidgets().then((m) => m.ThrottleBrakeTrace),
  GearTrace: () => loadSpecWidgets().then((m) => m.GearTrace),
  ThrottleHeatmap: () => loadSpecWidgets().then((m) => m.ThrottleHeatmap),
  ERSMicroSectors: () => loadSpecWidgets().then((m) => m.ERSMicroSectors),
  DRSEfficiency: () => loadSpecWidgets().then((m) => m.DRSEfficiency),
  EngineModeTracker: () => loadSpecWidgets().then((m) => m.EngineModeTracker),
  StrategyTimeline: () => loadSpecWidgets().then((m) => m.StrategyTimeline),
  DegRateGraph: () => loadSpecWidgets().then((m) => m.DegRateGraph),
  PitWindowUrgency: () => loadSpecWidgets().then((m) => m.PitWindowUrgency),
  PitStopLog: () => loadSpecWidgets().then((m) => m.PitStopLog),
  UndercutSimulator: () => loadSpecWidgets().then((m) => m.UndercutSimulator),
  SectorMap: () => loadSpecWidgets().then((m) => m.SectorMap),
  OvertakeReplay: () => loadSpecWidgets().then((m) => m.OvertakeReplay),
  TrackTempEvolution: () => loadSpecWidgets().then((m) => m.TrackTempEvolution),
  WindDirection: () => loadSpecWidgets().then((m) => m.WindDirection),
  RadioScanner: () => loadSpecWidgets().then((m) => m.RadioScanner),
  RadioFeedText: () => loadSpecWidgets().then((m) => m.RadioFeedText),
  StandingsTable: () => loadSpecWidgets().then((m) => m.StandingsTable),
  ChampionshipCalculator: () => loadSpecWidgets().then((m) => m.ChampionshipCalculator),
  PointsDeltaTracker: () => loadSpecWidgets().then((m) => m.PointsDeltaTracker),
  CarVisualization: () => loadSpecWidgets().then((m) => m.CarVisualization),
}

const widgetComponentCache = new Map<string, WidgetComponent>()
const widgetPromiseCache = new Map<string, Promise<WidgetComponent | undefined>>()

export function resolveLazyWidget(type: string): Promise<WidgetComponent | undefined> {
  const cached = widgetComponentCache.get(type)
  if (cached) return Promise.resolve(cached)

  const pending = widgetPromiseCache.get(type)
  if (pending) return pending

  const loader = WIDGET_LAZY_LOADERS[type]
  if (!loader) return Promise.resolve(undefined)

  const promise = loader()
    .then((component) => {
      widgetComponentCache.set(type, component)
      return component
    })
    .catch(() => undefined)
    .finally(() => {
      widgetPromiseCache.delete(type)
    })

  widgetPromiseCache.set(type, promise)
  return promise
}