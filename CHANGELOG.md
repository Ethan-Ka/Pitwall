# Changelog


### To Do

- [ ] For Free plans Up to 3 requests per second and 30 requests per minute
- [ ] For paid plans Live data during sessions with REST, MQTT, and WebSocket
Up to 6 requests per second and 60 requests per minute
- [ ] Add national anthem and track specific color functionality to the ambient race bar
- [ ] Implement database
- [ ] Develop the widgets
- [ ] User setup flow
- [ ] Link separate 'main' windows
- [ ] Layout export and sharing
- - [ ] Plugins for custom widgets and or functionality
- [ ] Weather
- [ ] Special focus on audio/comms
- [ ] Championship and driver/team standings
- [ ] Car and track custom svgs for map widget and car widget
- [ ] F1TV/Stream overlay with driver/different camera detection
- [ ] switch between live and historical mode
- [ ] Hide log behind menu lol
- [ ] Better inference engine
- [ ] RGB Bridge
- [ ] Back end
- [ ] Replay stuff?
- [ ] System tray and overlay layout editor
- [ ] Update readme
- [ ] Maybe make this a optional-paid app a little bit cheaper than OpenF1? Fork OpenF1 and run it myself with F1TV key?
- [ ] Features for people watching on their TV

All notable changes to this project are documented in this file.

## alpha v0.1.8 - 2026-04-05

Version delta from previous release: `alpha v0.1.5` -> `alpha v0.1.8` (`+0.03`).

### Feature Summary

- Added a local database cache (IndexedDB) for interval/gap timeline data in intervalCache.ts.
    - Refactored interval hooks in useIntervals.ts into:
    - useIntervalHistory: full timeline data (chart-ready).
    - useIntervals: current/latest-per-driver data (existing widget behavior preserved).

#### what the local database changes:
- Historical mode: cache-first.
    - If interval history for a session is already stored, it returns cached data and skips API calls.
- Live mode: fetch + merge + persist.
    - New API interval points are merged with existing cached points (deduped by driver_number + date) and saved.
- Failure fallback:
  - If API fetch fails and cached history exists, it returns cached history instead of throwing immediately.

**the local database is not fully implemented yet. This entry into the changelog was to clarify the reason and the roadmap for the db**

- Added true widget pop-out windows with dock-back support.
	- Widgets can open in dedicated Electron pop-out windows.
	- Pop-outs can be docked back into the main workspace (including drag-to-dock behavior).
	- Pop-out lifecycle handling was improved with reusable warm windows and bootstrap/reset flows.

- Added cross-window live state sync between main and pop-out windows.
	- Session, ambient, and driver-focus state now sync across windows.
	- Pop-out windows can consume startup transfer payloads and restore widget context reliably.

- Added two new user-facing widgets.
	- Lap Time Card: focused single-driver lap timing panel with live-lap timer and PB delta context.
	- Stint Pace Comparison: side-by-side tyre-age pace comparison with shared-age analysis and delta reporting.

- Expanded widget loading and catalog behavior.
	- Introduced lazy widget resolution/caching so widget modules can be loaded on demand.
	- Pop-out bootstrap now preloads widget modules to reduce blank/idle startup time.
	- Widget picker now includes richer categorization and broader strategy/timing/telemetry inventory.

- Added focus-editor workflow for widget targeting.
	- FocusStrip now supports editing focus context for the selected widget directly.
	- Driver context editing supports inherit/fixed/race-position and pinned-driver patterns.

- Improved widget settings depth.
	- Driver-tab controls now support multi-driver configuration for comparison widgets.
	- Inferred widgets expose formula-oriented settings more consistently in the settings panel.

- Improved app shell and startup UX.
	- Startup routing now chooses main app vs pop-out app automatically.
	- Startup/loading experience and version surfacing were refined for clarity.
	- Workspace persistence now separates main windows and pop-out windows to avoid state collision.

- Expanded developer diagnostics and controls.
	- Added additional Electron debug bridge actions (mode toggles, overlays, ambient/leader color presets, logging helpers).
	- Added window-dimension diagnostics and richer dev control interactions.

- Documentation and release metadata updates.
	- Updated root status/version markers to `alpha v0.1.8`.
	- Updated release planning/demo artifacts for the new canvas/focus/widget workflows.
