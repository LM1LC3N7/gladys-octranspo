// -----------------------------------------------------------------------------
// The operator's real-time client: departures, the shared feed cache, the
// stop table mapping, the refusals.
// -----------------------------------------------------------------------------

import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeConfig } from '../src/config.js';
import {
  clearRealtimeCache,
  departuresFromFeed,
  fetchDepartures,
  getTripUpdates,
  realtimeErrorFor,
  RealtimeApiError,
  redact,
  setPolledStops,
} from '../src/api/realtime.js';
import { NETWORK } from '../src/network.js';
import { encodeFeed } from './helpers/gtfsRealtimeEncoder.js';
import { restoreFetch, stubFetch } from './helpers/stubFetch.js';

const NOW_MS = 1_760_100_000_000;
const NOW = NOW_MS / 1000;
const FEED = new URL(NETWORK.realtime.tripUpdatesUrl).pathname;

// 1658 is Rideau / King Edward (stop_id 1245); 3009 Rideau station, whose
// O-Train platform is stop_id CD990. Route 6 is the 6, 7 the 7, 1-373 the
// O-Train Line 1.
const config = normalizeConfig({ api_key: 'k3y', stops: '1658, 1658@7, 3009' });

function feed() {
  return encodeFeed({
    timestamp: NOW,
    entities: [
      {
        tripUpdate: {
          trip: { tripId: 'late', routeId: '6' },
          stopTimeUpdates: [{ stopId: '1245', departure: { time: NOW + 600, delay: 400 } }],
        },
      },
      {
        tripUpdate: {
          trip: { tripId: 'soon', routeId: '7' },
          stopTimeUpdates: [
            { stopId: '1245', arrival: { time: NOW + 125 } },
            { stopId: '99999', arrival: { time: NOW + 300 } },
          ],
        },
      },
      {
        tripUpdate: {
          trip: { tripId: 'otrain', routeId: '1-373' },
          stopTimeUpdates: [{ stopId: 'CD990', arrival: { time: NOW + 60 } }],
        },
      },
      {
        tripUpdate: {
          trip: { tripId: 'cancelled', routeId: '6', scheduleRelationship: 3 },
          stopTimeUpdates: [{ stopId: '1245', arrival: { time: NOW + 200 } }],
        },
      },
      {
        tripUpdate: {
          trip: { tripId: 'skips', routeId: '6' },
          stopTimeUpdates: [
            { stopId: '1245', scheduleRelationship: 1, arrival: { time: NOW + 90 } },
          ],
        },
      },
      {
        tripUpdate: {
          trip: { tripId: 'gone', routeId: '6' },
          stopTimeUpdates: [{ stopId: '1245', arrival: { time: NOW - 120 } }],
        },
      },
    ],
  });
}

beforeEach(() => clearRealtimeCache());
afterEach(() => restoreFetch());

test('departures are mapped from stop codes, named, sorted and filtered', async () => {
  stubFetch({ [FEED]: feed() });
  const [stop, stopRoute7, station] = config.watched.stops;

  const board = await fetchDepartures(config, stop, { now: NOW_MS });
  assert.deepEqual(
    board.map((departure) => [departure.tripId, departure.route, departure.minutes]),
    [
      ['soon', '7', 2],
      ['late', '6', 10],
    ],
  );
  assert.equal(board[1].delaySeconds, 400);
  assert.equal(board[0].realtime, true);

  // The route filter keeps the 7 and drops the 6 calling at the same stop.
  const filtered = await fetchDepartures(config, stopRoute7, { now: NOW_MS });
  assert.deepEqual(
    filtered.map((departure) => departure.tripId),
    ['soon'],
  );

  // A station code covers its platforms, the O-Train ones included.
  const platform = await fetchDepartures(config, station, { now: NOW_MS });
  assert.deepEqual(
    platform.map((departure) => [departure.route, departure.minutes]),
    [['1', 1]],
  );
});

test('one read of the feed serves every stop, with the key in the gateway header', async () => {
  const calls = stubFetch({ [FEED]: feed() });
  for (const stop of config.watched.stops) {
    await fetchDepartures(config, stop, { now: NOW_MS });
  }
  await fetchDepartures(config, config.watched.stops[0], { now: NOW_MS + 30_000 });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].headers['Ocp-Apim-Subscription-Key'], 'k3y');
  assert.doesNotMatch(calls[0].url, /k3y/);
  assert.match(calls[0].headers['User-Agent'], /^gladys-octranspo\//);

  // A new interval reads again; so does a forced fresh read.
  await fetchDepartures(config, config.watched.stops[0], { now: NOW_MS + 60_000 });
  await getTripUpdates(config, { now: NOW_MS + 61_000, fresh: true });
  assert.equal(calls.length, 3);
});

test('a stop the configuration does not list (a suggestion) is decoded too', async () => {
  stubFetch({ [FEED]: feed() });
  const typedNothing = normalizeConfig({ api_key: 'k3y' });
  const suggested = { id: '1658', routes: [], name: null };
  setPolledStops([suggested]);
  const board = await fetchDepartures(typedNothing, suggested, { now: NOW_MS });
  assert.equal(board.length, 2);
});

test('a departure just past its time stays on the board for a few seconds', () => {
  const board = departuresFromFeed(
    {
      stopTimes: [
        {
          stopId: '1245',
          routeId: '6',
          tripScheduleRelationship: 0,
          scheduleRelationship: 0,
          arrival: { time: NOW - 20 },
        },
      ],
    },
    { id: '1658', routes: [] },
    NOW,
  );
  assert.equal(board[0].minutes, 0);
});

test('no key: a bilingual explanation, and no request', async () => {
  const calls = stubFetch({});
  const noKey = normalizeConfig({ stops: '1658' });
  await assert.rejects(fetchDepartures(noKey, noKey.watched.stops[0]), (err) => {
    assert.ok(err instanceof RealtimeApiError);
    assert.match(err.userMessage.fr, /clé d’API OC Transpo/);
    return true;
  });
  assert.equal(calls.length, 0);
});

test('the refusals become messages the user can act on', async () => {
  stubFetch({
    [FEED]: {
      status: 401,
      body: '{ "statusCode": 401, "message": "Access denied due to invalid subscription key." }',
    },
  });
  await assert.rejects(fetchDepartures(config, config.watched.stops[0], { now: NOW_MS }), (err) => {
    assert.equal(err.status, 401);
    assert.match(err.userMessage.en, /refused the API key/);
    // The message never carries the key.
    assert.doesNotMatch(err.message, /k3y/);
    return true;
  });
  assert.match(realtimeErrorFor(403, 'Quota exceeded', 'x').userMessage.en, /quota/);
  assert.match(realtimeErrorFor(429, '', 'x').userMessage.en, /rate limiting/);
  assert.equal(realtimeErrorFor(503, 'Service Unavailable', 'x').userMessage, undefined);
});

test('a network error never logs the key', async () => {
  globalThis.fetch = async (url, options) => {
    throw new Error(`connect ECONNREFUSED ${url} ${JSON.stringify(options.headers)}`);
  };
  await assert.rejects(
    fetchDepartures(config, config.watched.stops[0], { now: NOW_MS }),
    (err) => !err.message.includes('k3y') && err.message.includes('***'),
  );
  assert.equal(redact('a k3y b k3y', 'k3y'), 'a *** b ***');
  assert.equal(redact('text', ''), 'text');
});
