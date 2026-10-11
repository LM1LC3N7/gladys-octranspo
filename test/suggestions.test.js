// -----------------------------------------------------------------------------
// "Near my home": the stops and stations suggested from the house location,
// and the connection status that tells the user what to do next.
// -----------------------------------------------------------------------------

import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createFakeGladys } from './helpers/fakeGladys.js';
import { restoreFetch, stubFetch } from './helpers/stubFetch.js';
import { stopTimesPayload } from './helpers/fixtures.js';
import { normalizeConfig } from '../src/config.js';
import {
  clearSuggestions,
  getSuggestions,
  refreshSuggestions,
  suggestedStopLabel,
} from '../src/devices/suggestions.js';
import { buildDiscoveredDevices } from '../src/devices/index.js';
import { clearTransitousCache } from '../src/api/transitous.js';
import { describeStatus, inventory } from '../src/status.js';

function routes() {
  return {
    '/v5/stoptimes': stopTimesPayload(Date.now(), [{ minutes: 3 }, { minutes: 9 }]),
  };
}

beforeEach(() => {
  clearSuggestions();
  clearTransitousCache();
});
afterEach(() => restoreFetch());

test('the closest stops are suggested, named the way people know them', async () => {
  stubFetch(routes());
  const gladys = createFakeGladys();
  const config = normalizeConfig({ nearby_stops: 3 });

  const found = await refreshSuggestions(gladys, config);

  assert.equal(found.status, 'ok');
  // Rideau station stands for its platforms, which are not suggested on top
  // of it.
  assert.equal(found.stops[0].id, '3009');
  assert.equal(found.stops.length, 3);
  assert.deepEqual(found.bikeStations, []);

  // Without typing anything, the Discovery screen offers them.
  const names = buildDiscoveredDevices(gladys, config).map((device) => device.name);
  assert.equal(names[0], 'OC Transpo – Rideau');
  assert.ok(names.every((name) => name.startsWith('OC Transpo – ')));
});

test('no located house, no permission, nothing wanted: each has its own status', async () => {
  stubFetch(routes());
  const gladys = createFakeGladys();
  const config = normalizeConfig({});

  gladys.houses = [{ id: 'h', name: 'Home', latitude: null, longitude: null }];
  assert.equal((await refreshSuggestions(gladys, config)).status, 'no_location');

  gladys.houses = new Error('HTTP 403');
  assert.equal((await refreshSuggestions(gladys, config)).status, 'no_house');

  const off = normalizeConfig({ nearby_stops: 0, nearby_bike_stations: 0 });
  assert.equal((await refreshSuggestions(gladys, off)).status, 'disabled');
});

test('a house far from the network gets nothing to suggest, without failing', async () => {
  stubFetch(routes());
  const gladys = createFakeGladys();
  gladys.houses = [{ id: 'h', name: 'Cottage', latitude: 46.5, longitude: -78.3 }];
  const found = await refreshSuggestions(gladys, normalizeConfig({}));
  assert.equal(found.status, 'ok');
  assert.deepEqual(getSuggestions().stops, []);
});

test('a name the user typed is never prefixed', async () => {
  stubFetch(routes());
  const gladys = createFakeGladys();
  const config = normalizeConfig({ stops: '1658:My bus, 3009', nearby_stops: 0 });
  await refreshSuggestions(gladys, config);
  assert.deepEqual(
    buildDiscoveredDevices(gladys, config).map((device) => device.name),
    ['My bus', 'OC Transpo – Rideau'],
  );
});

test('a suggested label: the name, then the first routes and their direction', () => {
  assert.equal(suggestedStopLabel({ code: '1', name: 'Main St' }, null), 'Main St');
  assert.equal(suggestedStopLabel({ code: '1', name: '' }, null), '1');
  const busy = {
    name: 'Hub',
    routes: Array.from({ length: 12 }, (_, index) => ({
      route: String(index + 1),
      headsigns: ['Somewhere far away'],
    })),
  };
  const label = suggestedStopLabel({ code: '1', name: 'Hub' }, busy);
  assert.match(label, /^Hub \(1 → Somewhere far away, 2 → Somewhere far away, …\)$/);
});

test('status: nothing found asks to locate the house', async () => {
  stubFetch(routes());
  const gladys = createFakeGladys();
  gladys.houses = [];
  const config = normalizeConfig({});
  await refreshSuggestions(gladys, config);
  const status = describeStatus(gladys, config);
  assert.equal(status.connected, false);
  assert.match(status.message.fr, /Paramètres → Maisons/);
});

test('status: devices waiting point to the Discovery tab, and say what a key adds', async () => {
  stubFetch(routes());
  const gladys = createFakeGladys();
  const config = normalizeConfig({ nearby_stops: 2 });
  await refreshSuggestions(gladys, config);

  const status = describeStatus(gladys, config);
  assert.equal(status.connected, true);
  assert.equal(
    status.message.fr,
    'Prêt : 2 arrêts à ajouter. Ouvrez l’onglet « Découverte » de cette ' +
      'intégration et cliquez sur « Ajouter ». Sans clé : une clé OC Transpo gratuite ajoute ' +
      'le temps réel officiel.',
  );
});

test('status: once everything is added, what is watched and the request count', async () => {
  stubFetch(routes());
  const gladys = createFakeGladys();
  const config = normalizeConfig({ api_key: 'k', nearby_stops: 1 });
  await refreshSuggestions(gladys, config);
  gladys.devices = buildDiscoveredDevices(gladys, config);

  const status = describeStatus(gladys, config);
  assert.equal(
    status.message.en,
    'Connected. Watching 1 stop (about 1440 OC Transpo requests a day).',
  );
});

test('status: stops with neither a key nor Transitous', () => {
  const config = normalizeConfig({ stops: '1658', schedule_without_key: false });
  const status = describeStatus(createFakeGladys(), config);
  assert.equal(status.connected, false);
  assert.match(status.message.en, /OC Transpo API key/);
});

test('inventory', () => {
  assert.deepEqual(inventory({ stops: 3, stations: 0, lines: false }), {
    en: '3 stops',
    fr: '3 arrêts',
  });
});
