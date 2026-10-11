# CLAUDE.md

Guidance for Claude Code (and any other contributor) working in this repository.

## What this project is

An **external Gladys Assistant integration** for Ottawa public transit (OC
Transpo: buses and O-Train). It runs as a Docker container next to a Gladys
instance, talks to Gladys through the official SDK
(`@gladysassistant/integration-sdk`), and publishes **read-only** devices: one
per watched stop.

Not affiliated with OC Transpo nor with the City of Ottawa. Data: the OC
Transpo static GTFS (shipped as a stop table in `gtfs/`), the OC Transpo
GTFS-Realtime TripUpdates (personal key, `Ocp-Apim-Subscription-Key` header),
and Transitous (keyless: departures — with OC Transpo real time for most
trips — and stop descriptions).

**Inactive shared modules.** Ottawa has no docked bike share and OC Transpo
publishes no service alerts feed in the open: `NETWORK.bike` is null and
`NETWORK.lines` empty. `src/api/bikes.js`, `src/api/lines.js`,
`src/devices/bikeStation.js` and `src/devices/lineStatus.js` stay, unused,
to keep the code identical to the sister repositories (they are tested in
gladys-translink); the manifest declares none of their settings, actions,
triggers or widgets.

**Design goal: usable by somebody who is not technical.** Nothing to type to
start: the house location (`location: true`) gives the suggested stops and
stations, the key is optional, and the connection status line
(`src/status.js`) always says what to do next. Keep it that way: every new
setting needs a default that works, and every failure a message that says what
to do.

**Sister integrations.** `gladys-translink` (Vancouver), `gladys-octranspo`
(Ottawa), `gladys-rtc-quebec` (Québec), `gladys-ttc` (Toronto),
`gladys-calgary-transit` (Calgary) and `gladys-edmonton-transit` (Edmonton)
share this code base, derived from `gladys-stm` (Montréal). Everything that
names the network lives in `src/network.js`, its data in `gtfs/`, its texts
in the manifest and the docs: the rest of the code is identical in the six
repositories, and a fix to it belongs in the six (and in gladys-stm when it
applies there).

## Commands

```bash
npm ci
npm test               # node --test, no framework, no network access
npm run lint           # eslint
npm run format         # prettier --write .
npm run format:check   # what CI checks
npm run update-stops   # regenerate gtfs/ from the OC Transpo static GTFS (network)
npx github:GladysAssistant/integration-store .   # store admission checks
```

Run `npm test`, `npm run lint` and `npm run format:check` before every commit:
CI (`.github/workflows/ci.yml`) runs the three. The CI minutes are counted:
batch the pushes (one push a day at most, unless asked otherwise).

## Layout

```
index.js                      SDK wiring only: handlers, connect, status
src/network.js                the network: operator, feeds, key, lines, bike share
src/config.js                 defaults, type coercion, watch-list mini-syntax, request estimate
src/api/http.js               fetch with timeout and User-Agent
src/api/stops.js              the stop table (gtfs/): code → stop_ids, search, nearby, route labels
src/api/gtfsRealtime.js       minimal GTFS-Realtime decoder (watched stops only; alerts)
src/api/realtime.js           operator feeds with the key: departures, shared feed cache, errors
src/api/lines.js              line status from the service alerts
src/api/bikes.js              bike share GBFS client, per-cycle cache, station search
src/api/transitous.js         Transitous: departures of a stop code, descriptions
src/status.js                 the connection status line: what the user must do next
src/devices/index.js          device registry (typed + suggested + created) + manifest actions
src/devices/suggestions.js    the stops and bike stations closest to the house
src/devices/stop.js           one device per watched stop
src/devices/lineStatus.js     the line status device
src/devices/bikeStation.js    one device per watched bike station
src/devices/pollSchedule.js   drops the poll ticks inside the configured interval
src/devices/stateCache.js     drops the states that did not move since the last read
src/devices/publish.js        publishes only to the features the created device has
src/devices/readings.js       last reading per device, shared with the widgets
src/devices/refreshLoop.js    the container's own ticker over the created devices
src/scenes/triggers.js        scene events, computed between two polls of a device
src/scenes/actions.js         scene actions: a fresh read handed to the scene
src/widgets/index.js          dashboard widgets
scripts/update-stops.mjs      generates gtfs/ from the static GTFS (ZIP + CSV, no dependency)
gtfs/                         the stop table, shipped with the image
test/                         node:test suites; helpers: fake SDK, fetch stub, GTFS-RT encoder, fixtures
docs/en.md, docs/fr.md        user documentation (re-hosted by Gladys)
gladys-assistant-integration.json   the store manifest
```

Keep the separation: `index.js` holds no transit logic, `src/api/` only reads
the sources, `src/devices/` only turns a reading into features, `src/scenes/`
and `src/widgets/` only turn a blueprint's `read` into events, outputs and
cards.

## Data sources: what is known and how

- **Stop codes**: riders know the 4-digit number on the sign (the one texted
  to 560560), with leading zeros (`0513`); the feeds speak GTFS `stop_id`
  (checked on the static GTFS of 2026-10: 5,590 codes, one equal to its id).
  A code may cover several stop_ids: every platform of an O-Train station
  shares the station's code (`3009` Rideau: `3009_stn`, its bus platforms and
  the O-Train platforms `CD990`/`CD995`), and a few street codes cover both
  sides of a corner. `gtfs/stops.json` holds `[code, name, lat, lon, ids,
query]`: `ids` for the real-time feed, `query` for Transitous (the station
  when there is one). Names are published in capitals and title cased by
  `NETWORK.gtfs.stopName`. Stops without a code (STO stops of the feed) are
  left out.
- **Routes**: `route_id` equals the short name, except the O-Train lines
  (`1-373` is Line 1). `gtfs/routes.json` maps an id to the label.
- **Real time**: `https://nextrip-public-api.azure-api.net/octranspo/gtfs-rt-tp/beta/v1/TripUpdates`,
  key in the `Ocp-Apim-Subscription-Key` header; a missing or bad key answers
  HTTP 401 with a JSON body (`Access denied due to invalid subscription
key`). The feed is labelled beta by OC Transpo, and its payload was not
  checked with a real key yet: if a trip lacks `route_id`, the route is taken
  from the trips Transitous saw at the stop.
- **The decoder** (`src/api/gtfsRealtime.js`) was cross-checked against the
  official `gtfs-realtime-bindings` 2.2.0 in both directions. Re-run such a
  check if you touch the wire-format code.
- **Transitous**: ids are `ca-on-OCTranspo_<stop_id>`. It has OC Transpo real
  time (`realTime: true`) for most trips. Headsigns are bilingual ("Hospital ~
  Hôpital"): the `~` becomes a `/`, the boards use `~` for scheduled times.
  `/v5/stoptimes` answers for a station group: the departures are filtered on
  the code's own stop_ids. Usage policy: open-source non-commercial,
  User-Agent with a contact, stay light — keep the caches and the 120 s floor
  (`MIN_SCHEDULE_POLL_FREQUENCY`).

## Conventions

- ES modules, Node >= 22, no runtime dependency besides the SDK. Do not add
  one without a strong reason (the 256 MB sandbox is why the GTFS-RT decoder is
  hand-written).
- Prettier decides formatting; ESLint decides the rest.
- Comments explain **why**, in full sentences, in English.
- Every user-visible string in the manifest, actions and widgets is bilingual
  (`{ en, fr }`); text features follow the `language` setting.
- **External ids, feature keys, manifest keys are forever**: Gladys keys the
  devices, their history, the scenes and the dashboards on them.
- **Created devices** are rebuilt from their params (`stop_code`, `routes`,
  `station_id`): never rename those params.
- **Versions belong to the Release workflow**: never edit `version` in
  `package.json` / the manifest, nor the `docker_image` tag, by hand.
- **Changelog**: every user-visible change adds a line under
  `## [Unreleased]` in `CHANGELOG.md`.
- **Never commit an API key**, nor a personal stop: use network landmarks in
  examples and tests (Rideau station: 3009; Rideau / King Edward: 1658; the
  Rideau Centre as the house).
- Tests never touch the network: `test/helpers/stubFetch.js` routes `fetch`.
  They do read the real `gtfs/` table: a regeneration that drops a landmark
  shows there.

## Roadmap ideas

- Check the TripUpdates payload with a real key, and keep a captured sample as
  a fixture.
- A line status for the O-Train if OC Transpo opens a service alerts feed
  (`NETWORK.realtime.alertsUrl`, `NETWORK.lines`: the code is ready).
- STO (Gatineau) stops, which share the National Capital Region.
- Ask the Transitous team for an explicit OK before the integration gets many
  users (their policy asks to be contacted for heavy use).
- Screenshots in the user documentation.
