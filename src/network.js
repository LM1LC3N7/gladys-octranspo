// -----------------------------------------------------------------------------
// The transit network this integration serves: OC Transpo, Ottawa.
//
// Everything that names the operator, its feeds or its lines lives here, so
// the rest of the code reads "the network", "the bike share", "the lines" —
// and the sister integrations (STM, TransLink, RTC Québec) differ from this one
// by this file, their gtfs/ folder and their texts, not by their logic.
// -----------------------------------------------------------------------------

export const NETWORK = {
  /** The operator, as riders call it. */
  operator: 'OC Transpo',
  /** The device names start with it: "OC Transpo – Rideau / King Edward". */
  stopPrefix: 'OC Transpo – ',
  /** The language of the texts when the user did not choose one. */
  defaultLanguage: 'en',

  /**
   * The static GTFS the stop table (gtfs/stops.json, gtfs/routes.json) is
   * generated from, by `npm run update-stops`.
   */
  gtfs: {
    url: 'https://oct-gtfs-emasagcnfmcgeham.z01.azurefd.net/public-access/GTFSExport.zip',
    // OC Transpo writes its stop names in capitals ("RIDEAU / KING EDWARD"):
    // they read better as "Rideau / King Edward".
    stopName: (row) => titleCase(row.stop_name),
  },

  /** Transitous ids are the GTFS ids behind this prefix: `ca-on-OCTranspo_3009_stn`. */
  transitousPrefix: 'ca-on-OCTranspo_',

  /**
   * The operator's real-time feed (GTFS-Realtime TripUpdates), with the user's
   * key, sent in the header of the Azure API Management gateway.
   */
  realtime: {
    keyLabel: { en: 'OC Transpo API key', fr: 'clé d’API OC Transpo' },
    portal: 'https://www.octranspo.com/en/plan-your-trip/travel-tools/developers/',
    tripUpdatesUrl:
      'https://nextrip-public-api.azure-api.net/octranspo/gtfs-rt-tp/beta/v1/TripUpdates',
    // OC Transpo publishes no service alerts feed in the open: no line status.
    alertsUrl: null,
    /**
     * The request of one feed with the key.
     * @param {string} url
     * @param {string} key
     */
    authorize: (url, key) => ({ url, headers: { 'Ocp-Apim-Subscription-Key': key } }),
  },

  /** No line status device: see `realtime.alertsUrl`. */
  lines: [],
  linesName: { en: 'O-Train', fr: 'O-Train' },

  /** Ottawa has no docked bike share. */
  bike: null,

  /** The search example of the "Find a stop" answers: a network landmark. */
  examples: { search: 'Rideau' },
};

/**
 * "RIDEAU / KING EDWARD" → "Rideau / King Edward", "TUNNEY'S PASTURE" →
 * "Tunney's Pasture", "O-TRAIN" → "O-Train".
 * @param {string} name
 */
export function titleCase(name) {
  return String(name ?? '')
    .toLowerCase()
    .replace(
      /(^|[\s/(-])(\p{Letter})/gu,
      (_match, before, letter) => before + letter.toUpperCase(),
    );
}
