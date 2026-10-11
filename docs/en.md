# OC Transpo Ottawa

The **next OC Transpo bus and O-Train departures** near your home, in Gladys.

This integration is not affiliated with OC Transpo nor with the City of
Ottawa.

## Get started in 3 steps

No technical knowledge is needed, and no account to begin with.

1. **Check the address of your house in Gladys**: _Settings → Houses_. The
   house must have a position on the map. The integration uses it to find the
   stops near you. The position stays in your Gladys.
2. **Install the integration** from the integration catalog, and accept the
   access to the house location. Open its configuration page and press
   **Save**, without filling anything in.
3. Open the **Discover** tab of the integration. The 3 stops closest to your
   home are offered there, with their name and the direction of their routes,
   e.g. "OC Transpo – Rideau / King Edward (6 → Greenboro)". Press **Add** on
   each one you want.

That's it. You now get the **next departures** at each stop, most of them **in
real time**.

The message at the top of the configuration page always tells you what to do
next. For example: "Ready: 3 stops to add. Open the Discover tab…".

Device names start with **OC Transpo –**. You can rename them freely in
Gladys.

An O-Train station (Rideau, Lyon, Hurdman…) is a single stop, for all its
platforms: trains and buses.

### Showing the departures on the dashboard

1. Open the dashboard, then press **Edit**.
2. Add a widget and choose **OC Transpo departures**.
3. Choose the stop, then save.

Departures tracked in real time are green. Scheduled times are grey and carry
a **~**: "~12 min" means "scheduled in 12 minutes".

## Official real time (optional)

Without a key, the departures come from Transitous, a free community service
that already receives the OC Transpo real time for most buses. They are read
every 2 minutes.

With a free, personal **OC Transpo API key**, the departures come straight
from the **OC Transpo real-time feed**, read every minute.

### Getting the OC Transpo API key (5 minutes)

1. Go to the
   [OC Transpo developers page](https://www.octranspo.com/en/plan-your-trip/travel-tools/developers/)
   and follow the link to the **developer portal**. **Create an account**, then
   activate it with the email you receive.
2. Sign in to the portal, open **Products** and **subscribe** to the
   **GTFS-RT** product.
3. Open your **profile**: the subscription shows a **primary key**. Copy it.
4. In Gladys, open the configuration of the integration. Paste the key in
   **OC Transpo API key**, then press **Save**.
5. Press **Test the OC Transpo API key**: the line must show ✔.

The labels of the portal may differ slightly: the OC Transpo real-time feed is
still labelled "beta".

**Requests.** One read of the OC Transpo feed serves all your stops: with the
default settings the integration makes about 1,400 requests a day, **whatever
the number of stops**.

## Watching other stops (work, school…)

For a stop far from home:

1. At the bottom of the configuration page, press **Find a stop**. Type a
   street, a station or the stop number, e.g. "Rideau" or "Bank Somerset".
2. The answer lists the stops with their number and the direction of their
   routes, e.g. `1658 — Rideau / King Edward (6 → Greenboro)`.
3. Copy the number (`1658`) in **Stops**, save, then add the stop in the
   **Discover** tab.

The number is the 4-digit one written on every OC Transpo stop sign (the one
you text to 560560).

### Going further

The **Stops** field accepts several numbers separated by commas, a route
filter after `@` and a name after `:`.

| Entry                | Meaning                             |
| -------------------- | ----------------------------------- |
| `1658`               | every route calling at stop 1658    |
| `3009@1`             | O-Train Line 1 only, at Rideau      |
| `3009@6\|7`          | routes 6 and 7                      |
| `3009@7:Bus to work` | route 7, displayed as "Bus to work" |

## What each device holds

- **Next departure**, **Departure 2**…: the minutes to wait. 999 means no
  departure is scheduled.
- **Next departure route**…: the route ("7", "1" for O-Train Line 1).
- **Next departures**: a summary, e.g. `7 3 min · 6 ~11 min`.

## Scenes

**Trigger:** **Departure approaching**: a departure gets under 1, 2, 3, 5, 10
or 15 minutes. Example: "when the 7 is 5 minutes away, turn the hall light
on".

**Action:** **Read the next departures**: e.g. a message every morning "Your 7
comes in {{minutes}} minutes".

## Troubleshooting

| Message or symptom                                | What to do                                                                                              |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| "set the address of your house"                   | _Settings → Houses_: place the house on the map, then save the configuration of the integration again.  |
| "Gladys did not share the location of your house" | Reinstall the integration and accept the location access, or type stop numbers.                         |
| Nothing in the Discover tab                       | Read the message of the configuration page: it says what is missing.                                    |
| "OC Transpo refused the API key"                  | Check that you pasted the primary key of the GTFS-RT subscription, and that the subscription is active. |
| "Stop … is not in the OC Transpo stop list"       | Check the number on the sign. A brand new stop comes with the next version of the integration.          |
| A stop stays at 999                               | No departure scheduled (at night), or a route filter matching no route of the stop.                     |

## Privacy, data and licences

- The house location is only used to look the nearby stops up, in the stop
  list shipped with the integration: it is sent nowhere.
- Stop list: the OC Transpo GTFS, shipped with the integration (updated with
  every version).
- Departures without a key: [Transitous](https://transitous.org/sources/), a
  free community service, from the OC Transpo data.
- Real time: OC Transpo and City of Ottawa open data, under the
  [terms of use](https://www.octranspo.com/en/plan-your-trip/travel-tools/developers/dev-terms/).
- Integration code: Apache 2.0 licence.
