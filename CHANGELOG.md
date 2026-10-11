# Changelog

All notable changes to this integration are documented in this file. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project
uses [semantic versioning](https://semver.org/).

Describe each change under `## [Unreleased]` as you make it. The Release
workflow moves that section under the version it ships, and the section becomes
the notes of the version's GitHub Release.

## [Unreleased]

## [0.1.0] - 2026-10-11

### Added

- First version, derived from gladys-stm (STM Montréal) and gladys-translink.
- Next departures of every OC Transpo stop, buses and O-Train: from Transitous
  without any account (with the OC Transpo real time for most trips), from the
  OC Transpo GTFS-Realtime feed with a free key.
- The closest stops suggested from the house location; an O-Train station is
  one stop for all its platforms.
- Stop search by name or number, in the stop list shipped with the image.
- Dashboard widget, scene trigger and scene action (Gladys 5.1.0+).

[Unreleased]: https://github.com/LM1LC3N7/gladys-octranspo/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/LM1LC3N7/gladys-octranspo/releases/tag/v0.1.0
