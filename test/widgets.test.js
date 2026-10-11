// -----------------------------------------------------------------------------
// Dashboard widgets: every content must pass the SDK's own validator (the
// vocabulary and the budget the core enforces), and no failure may reach the
// dashboard as an exception.
// -----------------------------------------------------------------------------

import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { validateWidgetContent } from '@gladysassistant/integration-sdk';
import { createFakeGladys } from './helpers/fakeGladys.js';
import { restoreFetch, stubFetch } from './helpers/stubFetch.js';
import { stopTimesPayload } from './helpers/fixtures.js';
import { encodeFeed } from './helpers/gtfsRealtimeEncoder.js';
import { normalizeConfig } from '../src/config.js';
import { clearReadings } from '../src/devices/readings.js';
import { clearRealtimeCache } from '../src/api/realtime.js';
import { departuresContent } from '../src/widgets/index.js';
import { truncate, WIDGETS } from '../src/widgets/index.js';
import { NETWORK } from '../src/network.js';

const TRIP_UPDATES_PATH = new URL(NETWORK.realtime.tripUpdatesUrl).pathname;

const config = normalizeConfig({ api_key: 'k', stops: '1658', language: 'fr' });

function routes(extra = {}) {
  const now = Math.floor(Date.now() / 1000);
  return {
    [TRIP_UPDATES_PATH]: encodeFeed({
      entities: Array.from({ length: 12 }, (_, index) => ({
        tripUpdate: {
          trip: { tripId: `T${index}`, routeId: index % 2 ? '7' : '6' },
          stopTimeUpdates: [
            {
              stopId: '1245',
              departure: { time: now + index * 240, delay: index === 3 ? 600 : 0 },
            },
          ],
        },
      })),
    }),
    ...extra,
  };
}

function assertValid(content) {
  assert.deepEqual(validateWidgetContent(content), []);
}

beforeEach(() => {
  clearReadings();
  clearRealtimeCache();
});
afterEach(() => restoreFetch());

test('the departures board is valid and capped', async () => {
  stubFetch(routes());
  const content = await WIDGETS.departures(createFakeGladys(), {
    settings: { stop: 'transit-stop:1658' },
    config,
  });
  assertValid(content);
  const board = content.components.find((component) => component.type === 'status');
  assert.equal(board.items.length, 8);
  assert.equal(board.items[3].color, 'warning');
});

test('only the departures card exists in Ottawa', () => {
  assert.deepEqual(Object.keys(WIDGETS), ['departures']);
});

test('failures become a card that says what is wrong', async () => {
  stubFetch(routes({ [TRIP_UPDATES_PATH]: { status: 401, body: '' } }));
  const refused = await WIDGETS.departures(createFakeGladys(), {
    settings: { stop: 'transit-stop:1658' },
    config,
  });
  assertValid(refused);
  assert.match(refused.components[0].text.en, /refused the API key/);

  const unset = await WIDGETS.departures(createFakeGladys(), { settings: {}, config });
  assertValid(unset);
  assert.match(unset.components[0].text.en, /Choose a stop/);
});

test('a slow API gets a loading card rather than a dashboard error', async () => {
  // An answer that comes, but long after the card's deadline.
  globalThis.fetch = () =>
    new Promise((resolve) =>
      setTimeout(() => resolve({ ok: false, status: 503, text: async () => '' }), 100),
    );
  const content = await WIDGETS.departures(
    createFakeGladys(),
    { settings: { stop: 'transit-stop:1658' }, config },
    { deadlineMs: 10 },
  );
  assertValid(content);
  assert.match(content.components[0].text.en, /longer than usual/);
});

test('truncate', () => {
  assert.equal(truncate('abc', 5), 'abc');
  assert.equal(truncate('abcdef', 5), 'abcd…');
});

test('a scheduled board is grey, marked "~", and says what a key adds', async () => {
  stubFetch({
    '/v5/stoptimes': stopTimesPayload(Date.now(), [
      { minutes: 5 },
      { minutes: 20, routeId: '7', shortName: '7', headsign: 'St-Laurent' },
      // Real time Transitous has: green, no "~".
      { minutes: 25, realTime: true },
    ]),
  });
  const content = await WIDGETS.departures(createFakeGladys(), {
    settings: { stop: 'transit-stop:1658' },
    config: normalizeConfig({ stops: '1658', language: 'fr' }),
  });
  assertValid(content);
  const board = content.components.find((component) => component.type === 'status');
  assert.deepEqual(
    board.items.map((item) => [item.label.fr, item.color]),
    [
      ['Ligne 6 → Greenboro', 'neutral'],
      ['Ligne 7 → St-Laurent', 'neutral'],
      ['Ligne 6 → Greenboro', 'success'],
    ],
  );
  assert.match(board.items[0].value, /^~[45] min$/);
  assert.match(content.components.at(-1).text.fr, /clé OC Transpo pour le temps réel/);
});

test('an empty board says so', () => {
  const content = departuresContent('Arrêt', []);
  assertValid(content);
  assert.match(content.components[1].text.fr, /Aucun passage/);
});
