// -----------------------------------------------------------------------------
// Devices: discovery payloads, polling, publication, manifest actions.
// -----------------------------------------------------------------------------

import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createFakeGladys } from './helpers/fakeGladys.js';
import { restoreFetch, stubFetch } from './helpers/stubFetch.js';
import { stopTimesPayload } from './helpers/fixtures.js';
import { encodeFeed } from './helpers/gtfsRealtimeEncoder.js';
import { GLADYS_POLL_FREQUENCIES_MS, normalizeConfig } from '../src/config.js';
import {
  ACTIONS,
  buildBlueprints,
  buildDiscoveredDevices,
  findSelectedBlueprint,
  DeviceSelectionError,
  pollDevice,
  refreshDeviceNow,
} from '../src/devices/index.js';
import { NO_DEPARTURE_MINUTES } from '../src/devices/stop.js';
import { clearPollSchedule } from '../src/devices/pollSchedule.js';
import { clearStateCache } from '../src/devices/stateCache.js';
import { clearPublishReports } from '../src/devices/publish.js';
import { clearReadings } from '../src/devices/readings.js';
import { clearSceneMemory } from '../src/scenes/triggers.js';
import { clearRealtimeCache } from '../src/api/realtime.js';
import { clearTransitousCache } from '../src/api/transitous.js';
import { clearSuggestions } from '../src/devices/suggestions.js';
import { NETWORK } from '../src/network.js';

const TRIP_UPDATES = new URL(NETWORK.realtime.tripUpdatesUrl).pathname;

const config = normalizeConfig({
  api_key: 'k',
  stops: '1658, 3009@1:Train to work',
  max_departures: 2,
  language: 'fr',
});

function tripFeed(nowSeconds) {
  return encodeFeed({
    timestamp: nowSeconds,
    entities: [
      {
        tripUpdate: {
          trip: { tripId: 'T1', routeId: '6' },
          stopTimeUpdates: [{ stopId: '1245', departure: { time: nowSeconds + 185 } }],
        },
      },
    ],
  });
}

function routes(extra = {}) {
  return { [TRIP_UPDATES]: tripFeed(Math.floor(Date.now() / 1000)), ...extra };
}

beforeEach(() => {
  clearPollSchedule();
  clearStateCache();
  clearPublishReports();
  clearReadings();
  clearSceneMemory();
  clearRealtimeCache();
  clearTransitousCache();
  clearSuggestions();
});
afterEach(() => restoreFetch());

test('one device per watched stop, and no line nor bike device in Ottawa', () => {
  const gladys = createFakeGladys();
  const devices = buildDiscoveredDevices(
    gladys,
    normalizeConfig({ ...config, bike_stations: '1', watch_lines: true }),
  );
  assert.deepEqual(
    devices.map((device) => device.name),
    ['OC Transpo – Rideau / King Edward', 'Train to work'],
  );
  assert.deepEqual(
    devices.map((device) => device.external_id),
    ['transit-stop:1658', 'transit-stop:3009@1'],
  );
});

test('every discovery payload is one the core accepts', () => {
  const gladys = createFakeGladys();
  for (const device of buildDiscoveredDevices(gladys, config)) {
    assert.ok(GLADYS_POLL_FREQUENCIES_MS.includes(device.poll_frequency), device.name);
    assert.equal(device.should_poll, true, `${device.name} must be scheduled by the core`);
    const ids = new Set();
    for (const feature of device.features) {
      // t_device_feature.min / max are NOT NULL in the core.
      assert.equal(typeof feature.min, 'number', `${feature.name} needs a min`);
      assert.equal(typeof feature.max, 'number', `${feature.name} needs a max`);
      assert.equal(feature.read_only, true);
      assert.ok(!ids.has(feature.external_id), `duplicate feature ${feature.external_id}`);
      ids.add(feature.external_id);
    }
  }
  // 2 departures x (minutes + route) + summary.
  assert.equal(buildDiscoveredDevices(gladys, config)[0].features.length, 5);
});

test('feature names follow the configured language', () => {
  const gladys = createFakeGladys();
  const [stop] = buildDiscoveredDevices(gladys, normalizeConfig({ ...config, language: 'en' }));
  assert.equal(stop.features[0].name, 'Next departure');
  const [arret] = buildDiscoveredDevices(gladys, config);
  assert.equal(arret.features[0].name, 'Prochain passage');
});

test('polling a stop publishes the board, and the sentinel for missing departures', async () => {
  stubFetch(routes());
  const gladys = createFakeGladys();
  await pollDevice(gladys, { external_id: 'transit-stop:1658' }, config);

  const byFeature = Object.fromEntries(
    gladys.published.map((state) => [state.featureExternalId, state.state ?? state.text]),
  );
  assert.equal(byFeature['transit-stop:1658:departure_1'], 3);
  assert.equal(byFeature['transit-stop:1658:departure_1_route'], '6');
  assert.equal(byFeature['transit-stop:1658:departure_2'], NO_DEPARTURE_MINUTES);
  assert.equal(byFeature['transit-stop:1658:departure_2_route'], '');
  assert.equal(byFeature['transit-stop:1658:departures'], '6 3 min');
});

test('the ticks inside the refresh interval do not read the API again', async () => {
  const calls = stubFetch(routes());
  const gladys = createFakeGladys();
  await pollDevice(gladys, { external_id: 'transit-stop:1658' }, config);
  await pollDevice(gladys, { external_id: 'transit-stop:1658' }, config);
  assert.equal(calls.length, 1);

  // A device just created is read right away, whole.
  clearRealtimeCache();
  const before = gladys.published.length;
  await refreshDeviceNow(gladys, { external_id: 'transit-stop:1658' }, config);
  assert.equal(calls.length, 2);
  assert.equal(gladys.published.length - before, 5);
});

test('unchanged values are not published twice', async () => {
  stubFetch(routes());
  const gladys = createFakeGladys();
  await pollDevice(gladys, { external_id: 'transit-stop:3009@1' }, config);
  clearPollSchedule();
  clearRealtimeCache();
  const before = gladys.published.length;
  await pollDevice(gladys, { external_id: 'transit-stop:3009@1' }, config);
  assert.equal(gladys.published.length, before);
});

test('a device removed from the configuration is ignored', async () => {
  const calls = stubFetch({});
  await pollDevice(createFakeGladys(), { external_id: 'transit-stop:00000' }, config);
  assert.equal(calls.length, 0);
});

test('a stop code missing from the stop table says so', async () => {
  const unknown = normalizeConfig({ stops: '99999' });
  const [blueprint] = buildBlueprints(createFakeGladys(), unknown);
  await assert.rejects(blueprint.read(unknown), (err) =>
    /n’est pas dans la liste des arrêts OC Transpo/.test(err.userMessage.fr),
  );
});

test('a widget pointing at nothing gets an explanation', () => {
  const gladys = createFakeGladys();
  assert.throws(
    () => findSelectedBlueprint(gladys, '', config, 'transit-stop'),
    (err) => err instanceof DeviceSelectionError && /Choose a stop/.test(err.userMessage.en),
  );
});

test('test_api_key reports the feed, and the estimate when it works', async () => {
  stubFetch(
    routes({
      [TRIP_UPDATES]: {
        status: 401,
        body: '{ "statusCode": 401, "message": "Access denied due to invalid subscription key." }',
      },
    }),
  );
  const refused = await ACTIONS.test_api_key(createFakeGladys(), { config });
  assert.match(refused.en, /✖ Real-time predictions: OC Transpo refused the API key/);
  assert.doesNotMatch(refused.en, /Service alerts/);

  restoreFetch();
  clearRealtimeCache();
  stubFetch(routes());
  const ok = await ACTIONS.test_api_key(createFakeGladys(), { config });
  assert.match(ok.en, /^OC Transpo API OK\. This configuration costs about 1440 requests a day/);

  const noKey = await ACTIONS.test_api_key(createFakeGladys(), { config: normalizeConfig({}) });
  assert.match(noKey.fr, /Aucune clé/);
  assert.equal(ACTIONS.search_bike_stations, undefined);
});

test('a created device keeps refreshing once it is neither typed nor suggested', async () => {
  stubFetch(routes());
  const gladys = createFakeGladys();
  const empty = normalizeConfig({ api_key: 'k' });
  gladys.devices = [
    {
      external_id: 'transit-stop:1658@6',
      name: 'Bus to work',
      params: [
        { name: 'stop_code', value: '1658' },
        { name: 'routes', value: '6' },
      ],
    },
  ];
  assert.deepEqual(
    buildDiscoveredDevices(gladys, empty).map((device) => device.external_id),
    ['transit-stop:1658@6'],
  );
  // Not in the configuration, yet decoded: its board is not empty.
  await pollDevice(gladys, { external_id: 'transit-stop:1658@6' }, empty);
  const first = gladys.published.find((state) => state.featureExternalId.endsWith(':departure_1'));
  assert.equal(first.state, 3);
});

test('without a key, a stop shows Transitous, marked as scheduled, every 2 minutes at most', async () => {
  const calls = stubFetch({
    '/v5/stoptimes': stopTimesPayload(Date.now(), [
      { minutes: 4 },
      { minutes: 12, routeId: '7', shortName: '7', headsign: 'St-Laurent', realTime: true },
    ]),
  });
  const gladys = createFakeGladys();
  const noKey = normalizeConfig({ stops: '1658', max_departures: 2 });

  const [stop] = buildDiscoveredDevices(gladys, noKey);
  assert.equal(stop.poll_frequency, 60_000);
  assert.equal(buildBlueprints(gladys, noKey)[0].pollIntervalMs(noKey), 120_000);

  await pollDevice(gladys, { external_id: 'transit-stop:1658' }, noKey);
  const summary = gladys.published.find((state) => state.featureExternalId.endsWith(':departures'));
  // The real time Transitous has carries no "~".
  assert.match(summary.text, /^6 ~[34] min · 7 1[12] min$/);
  assert.ok(calls.every((call) => !call.url.includes('azure-api.net')));
});

test('Transitous can be turned off', async () => {
  const off = normalizeConfig({ stops: '1658', schedule_without_key: false });
  const [blueprint] = buildBlueprints(createFakeGladys(), off);
  await assert.rejects(blueprint.read(off), (err) => /passages sans clé/.test(err.userMessage.fr));
});

test('search_stops lists the codes with the directions of their routes', async () => {
  stubFetch({ '/v5/stoptimes': stopTimesPayload(Date.now(), [{ minutes: 3 }]) });
  const message = await ACTIONS.search_stops(createFakeGladys(), {
    fields: { query: 'rideau king edward' },
    config,
  });
  assert.match(message.fr, /^Collez un code dans « Arrêts »/);
  assert.match(message.fr, /1658 — Rideau \/ King Edward \(6 → Greenboro\)/);
});

test('search_stops still lists the stops when Transitous does not answer', async () => {
  stubFetch({ '/v5/stoptimes': { status: 503, body: '' } });
  const message = await ACTIONS.search_stops(createFakeGladys(), {
    fields: { query: '1658' },
    config,
  });
  assert.match(message.en, /^1658 — Rideau \/ King Edward$/m);
  const none = await ACTIONS.search_stops(createFakeGladys(), {
    fields: { query: 'zzzz qqqq' },
    config,
  });
  assert.match(none.en, /No OC Transpo stop matches/);
});
