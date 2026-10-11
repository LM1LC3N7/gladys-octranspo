# Gladys OC Transpo Ottawa

External integration for [Gladys Assistant](https://gladysassistant.com) that
brings Ottawa public transit into your smart home: the **next OC Transpo bus
and O-Train departures**, in real time for most trips, out of the box from
the free Transitous service, or straight from the official OC Transpo feed
with a free key.

**Zero configuration to start:** the integration reads the location of the
house from Gladys and offers the closest stops in the Discover tab, named the
way people know them ("OC Transpo – Rideau / King Edward (6 → Greenboro)"). No
account, no number to look up.

Unofficial: not affiliated with OC Transpo nor with the City of Ottawa.

User documentation: [français](docs/fr.md) · [English](docs/en.md).

## What you get in Gladys

| Kind                  | Content                                                    |
| --------------------- | ---------------------------------------------------------- |
| Devices               | one per stop (minutes to wait, route, summary)             |
| Dashboard widget      | departures board                                           |
| Scene trigger         | departure approaching (1–15 min)                           |
| Scene action          | read the next departures of a stop                         |
| Configuration buttons | test the OC Transpo API key, find a stop by name or number |

Requires Gladys **5.1.0** or later.

| Without any account                                                         | With a free OC Transpo key                     |
| --------------------------------------------------------------------------- | ---------------------------------------------- |
| departures from Transitous (timetable, OC Transpo real time for most trips) | the official real-time feed, read every minute |

The key comes from the OC Transpo developer portal (GTFS-RT product, still
labelled beta). One read of the feed serves every stop: about 1,400 requests a
day with the default settings, whatever the number of stops. The user
documentation has a step-by-step guide.

No line status (OC Transpo publishes no service alerts feed in the open) and
no bike share (Ottawa has none with docks): the shared code is ready for both.

## How it works

- **The stop table** (`gtfs/stops.json`, `gtfs/routes.json`) is generated from
  the OC Transpo static GTFS by `npm run update-stops` and ships with the
  image. It turns the 4-digit number on the sign into the GTFS stop ids the
  feeds use (an O-Train station code covers all its platforms), and answers
  the stop search and the "near my home" suggestions without any request.
- **Departures**: the OC Transpo GTFS-Realtime TripUpdates with a key (one
  read per interval, decoded for the watched stops only by a hand-written
  decoder), Transitous without one.

## Development

```bash
npm install
npm test               # node --test, no network access
npm run lint           # ESLint
npm run format:check   # Prettier, as the CI runs it
npm run update-stops   # regenerate gtfs/ from the OC Transpo static GTFS
npx github:GladysAssistant/integration-store .   # store admission checks
```

The project follows the official
[integration template](https://github.com/GladysAssistant/integration-template-js)
and shares its code with
[gladys-stm](https://github.com/LM1LC3N7/gladys-stm),
[gladys-translink](https://github.com/LM1LC3N7/gladys-translink) and
[gladys-rtc-quebec](https://github.com/LM1LC3N7/gladys-rtc-quebec): the
network lives in `src/network.js`. See [CLAUDE.md](CLAUDE.md) for the
architecture and the conventions.

### Publishing a version

1. In GitHub: **Actions → Release → Run workflow**. Choose **minor** for the
   first release (0.0.0 → 0.1.0), then patch / minor / major.
2. The first time only: make the GHCR package **public**
   (`github.com/LM1LC3N7/gladys-octranspo/pkgs/container/gladys-octranspo` →
   Package settings → Change visibility).
3. Add the topic `gladys-assistant-integration` to the repository: the store
   indexer picks the integration up within the hour.

## Data and licences

- Stop list and real-time data: OC Transpo and City of Ottawa open data,
  under the
  [terms of use](https://www.octranspo.com/en/plan-your-trip/travel-tools/developers/dev-terms/).
- Departures without a key: [Transitous](https://transitous.org/sources/)
  (free community service; the integration sends a User-Agent naming it,
  caches every description and never reads departures more than every two
  minutes).
- Code: Apache License 2.0. Parts of `src/devices/` are adapted from
  [prohand/gladys-transport-commun-lyonnais](https://github.com/prohand/gladys-transport-commun-lyonnais)
  (Apache-2.0), see [NOTICE](NOTICE).
