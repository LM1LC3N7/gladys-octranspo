// -----------------------------------------------------------------------------
// Payloads shared by the suites. The Transitous ones follow
// api.transitous.org (trimmed to the fields the integration reads).
//
// Stops are network landmarks of the stop table (gtfs/stops.json):
//   1658  Rideau / King Edward               (stop_id 1245)
//   3009  Rideau station                     (station 3009_stn, platforms
//                                             9833… and the O-Train CD990/CD995)
// Routes: route_id 6 is the 6, 7 the 7, 1-373 the O-Train Line 1.
// -----------------------------------------------------------------------------

import { NETWORK } from '../../src/network.js';

// --- Transitous ---------------------------------------------------------------

/**
 * /v5/stoptimes for one stop: departures `minutes` from `now` (ms). The
 * default route is the 6, leaving from Rideau / King Edward (stop_id 1245).
 */
export function stopTimesPayload(now, entries) {
  const iso = (ms) => new Date(ms).toISOString();
  const prefix = NETWORK.transitousPrefix;
  return {
    stopTimes: entries.map(
      (
        {
          minutes,
          routeId = '6',
          shortName = '6',
          headsign = 'Greenboro',
          stopId = '1245',
          delayMinutes = 0,
          cancelled = false,
          realTime = false,
          pickupType = 'NORMAL',
        },
        index,
      ) => ({
        place: {
          name: 'RIDEAU / KING EDWARD',
          stopId: `${prefix}${stopId}`,
          departure: iso(now + (minutes + delayMinutes) * 60_000),
          scheduledDeparture: iso(now + minutes * 60_000),
          pickupType,
        },
        realTime,
        headsign,
        tripId: `20261011_04:31_${prefix}T${index}`,
        routeId: `${prefix}${routeId}`,
        routeShortName: shortName,
        cancelled,
        tripCancelled: false,
      }),
    ),
  };
}
