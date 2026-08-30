# Changelog

All notable changes to this project will be documented in this file.

## [1.8.4] - 2026-08-30

### Added
- 💾 **Local-first file sync** - FocusTube now records all activity and safe
  preferences in `chrome.storage.local` even when no JSON file is connected.
  Pending changes are shown as **Saved locally** and are merged and written
  immediately when a file is selected or reconnected.
- 👤 **Portable user metadata and focus settings** - The shared data file now
  carries the profile display name/avatar/goal, blocked topics (keywords),
  blocked channels/patterns, Smart Lists, Pomodoro preferences, and other
  productivity settings. Section timestamps preserve the most recent edit,
  including block-list removals.
- 🖼️ **Site-logo cache** - Website favicons discovered by Chrome are stored with
  time-usage data and included in the cross-browser file payload.

### Fixed
- ⏱️ **Tracking after service-worker restarts** - Time tracking rehydrates the
  active tab whenever the MV3 worker wakes, instead of waiting for a navigation
  or tab switch before recording usage again.

### Privacy
- API keys, passwords, emails, browser/session state, file handles, and runtime
  timer state are explicitly excluded from the portable JSON file.

## [1.8.3] - 2026-08-22

### Added
- 🏷️ **Watch Time & Topics dashboard panel** - New range-aware section showing
  total tracked watch time (day/week/month, summed from per-site time tracking)
  beside a Top Topics breakdown. Topics are captured on YouTube watch pages by
  the new `topic-tracker.js` content script from the hashtag chips above video
  titles, hashtags in titles, and the video's category (normalized to
  `#category`), counted once per video, stored per day (`topicStats`), included
  in the cross-browser file sync, and rendered with proportional bars and counts.
  The dashboard live-refresh now also reacts to topicStats changes.

## [1.8.2] - 2026-08-22

### Added
- ⚡ **Near-real-time file sync** - The background now watches local data
  changes (time-tracking ticks, metric recordings, limit/block edits) via
  `chrome.storage.onChanged` and pushes to the shared JSON file ~10s after
  any mutation, instead of waiting for the 1-minute alarm. The dashboard also
  re-renders itself live when data changes, and the sync badge shows the last
  write time and file size (e.g. "Syncing · 12s ago · 3 KB") so writes are
  visible. Alarms are recreated on install/update (Chrome clears them on
  extension reload), with an immediate sync kick.

## [1.8.0] - 2026-08-21

### Redesigned
- 🎨 **Design System v2 "Graphite & Honey"** - Full visual overhaul replacing the
  default neon-blue/violet "AI look" (Tailwind blue-500/violet-500/cyan-500, aurora
  animations, glow shadows, shimmer sweeps, spring physics) with an intentional,
  editorial system: warm graphite dark base, one honey-amber brand accent, muted
  semantic colors (sage / ochre / clay / periwinkle), a 4-color muted chart palette,
  hairline borders, soft realistic shadows, brief standard-eased motion, and
  prefers-reduced-motion support. All surfaces (popup, dashboard, YouTube content
  UI, block page) now consume the same tokens from `src/shared/liquid-glass.css`,
  and every hardcoded neon hex in JS-injected UI was remapped.
- 🖥️ **Dashboard UX rework** - Segmented Day/Week/Month control with ARIA tabs and
  arrow-key navigation; the Day tab now shows a 7-day context chart with today
  highlighted instead of a meaningless single bar; month charts label every third
  day; Top Sites show daily-limit usage ("43m / 60m") with near/over-limit color
  states; header refresh button; version footer reads from the manifest.

### Fixed
- 🦾 **Brave + manual Import/Export flow** - Brave disables the File System Access
  API by default, so the sync card now detects Brave (via `navigator.brave`) and
  shows how to enable direct file sync (`brave://flags` → "File System Access API").
  The Import path no longer crashes on an empty file ("Unexpected end of JSON
  input") — it distinguishes an empty file (with guidance to Sync/Export from a
  browser that has data first), invalid JSON, and non-FocusTube JSON, and the
  Export button now explains where the file went and what to do with it.
- 🐛 **"Could not use that file: Cannot read properties of undefined (reading 'hasFile')"** -
  The sync card's status renderer read `status.hasFile` before its null guard, so any
  failed or missing status response (background worker asleep, stale page context, or
  an older background build without the sync handlers) crashed after picking a file.
  The guard now runs first, the storage listener handles cleared keys, and when
  messaging fails but a file handle is stored, the card shows a "Connected" state and
  the periodic background sync picks it up instead of reporting "not set up".
- 🐛 **Range tabs never working** - Two crashes made the dashboard dead on every
  successful data load: `renderProfile` wrote to a `#user-email` element that does
  not exist (thrown before tabs were ever bound), and `renderRange` wrote to a
  `#metric-time` element that does not exist. Both are now null-safe, tabs are
  bound before any async work, and any load failure shows an error state with a
  Retry button instead of a silently broken page.
- 🔥 **Streak reset unfairly** - A day with no activity *yet* no longer zeroes the
  streak; the streak now carries over until the day actually ends with no actions.

## [1.7.0] - 2026-08-21

### Added
- 🔄 **Cross-Browser Local File Sync** - Share one JSON data file on disk between
  every browser running FocusTube (dashboard → "Cross-Browser Data Sync"). Daily
  stats, per-site time usage, site blocks, and daily time limits stay in sync via
  a periodic read → union-merge → write cycle. Works with any folder, including
  Dropbox/OneDrive for cross-machine sharing. Export/Import fallback for browsers
  without the File System Access API (e.g. Firefox).

### Fixed
- 📊 **Dashboard showing no data** - Metrics were stored under UTC day keys while
  the dashboard grouped by local days, so activity landed on the wrong day for
  every non-UTC timezone (e.g. before 5:30am IST, or evenings in the Americas).
  All day keys are now local-time based.
- ⏱️ **Time tracking undercounting ~30-60x** - The 1-second tracking alarm is
  clamped by Chrome to a 30s minimum (1min pre-Chrome 120), but each tick only
  recorded 1 second of usage. Ticks now accumulate the real elapsed time, and the
  alarm is no longer re-created on every service-worker wake (which kept pushing
  the next tick out and could stop tracking entirely).

## [1.1.0] - 2026-04-16

### Added
- 🌐 **Universal Site Blocker** - Block any website for specific time periods
- 📚 **Comprehensive Documentation** - docs/ folder with architecture, API, and structure guides
- 🎯 **Improved Project Structure** - Professional folder organization
- 🚫 **Enhanced Blocking** - Better domain matching with subdomain support
- ⚡ **Performance Optimizations** - Reduced forced reflows and timer intervals
- 🛡️ **Error Handling** - Comprehensive error checking and validation
- 📊 **Active Blocks Management** - Real-time countdown and management UI
- ✨ **Beautiful Block Page** - Smooth animations and motivational messaging

### Changed
- 📁 **Project Structure** (BREAKING - non-functional)
  - Moved icons from `src/icons/` to `public/icons/`
  - Reorganized content folder into submodules:
    - `src/content/core/` - Core utilities
    - `src/content/youtube/` - YouTube features
    - `src/content/blocking/` - Blocking features
    - `src/content/controllers/` - Page controllers
    - `src/content/utils/` - UI utilities
    - `src/content/ui/` - UI orchestration
  - Updated manifest.json with new paths

### Fixed
- ⚠️ **Performance Issues**
  - Fixed "setTimeout took 66ms" error → Changed to setInterval(1000)
  - Fixed "Forced reflow" error → Batch DOM updates
  - Eliminated multiple overlay instances
- 🐛 **Error Handling**
  - Added try-catch blocks for storage operations
  - Chrome runtime error validation
  - Safe domain normalization
- 🔄 **Domain Matching**
  - Now handles subdomains correctly
  - Works with www and protocol variations
  - Case-insensitive matching

### Improved
- 📈 **Code Quality**
  - Better error messages
  - Improved logging
  - Enhanced validation
- 🎨 **UI/UX**
  - Better visual feedback
  - Hover effects
  - Keyboard shortcuts (Enter key)
  - Clearer active blocks display

### Deprecated
- None

### Removed
- None

### Security
- None

---

## [1.0.0] - 2026-04-15

### Added
- 🎬 **YouTube Optimization**
  - Hide ads and Shorts
  - Block distracting channels/keywords
  - Auto-skip ads
  - Force highest quality
  - Theater mode toggle
  - Auto-pause on inactivity

- 🔧 **Content Control**
  - Hide comments
  - Hide info cards
  - Hide end screens
  - Hide metrics
  - Custom CSS filtering
  - Glass theme effects

- 🎯 **Focus Features**
  - YouTube time blocking (5 min to custom)
  - Scheduled blocking (daily time ranges)
  - Quiz protection on disable
  - Focus dashboard
  - AI video summaries

- 🎨 **User Interface**
  - Beautiful popup dashboard
  - Settings management
  - Profile section
  - Stats tracking
  - Theme customization

- 🎤 **Utility Features**
  - Screenshot capture (Ctrl+S)
  - Screen recording (Ctrl+Shift+R)
  - Keyboard shortcuts
  - Floating toolbar

### Architecture
- Service worker for background tasks
- Content scripts for YouTube manipulation
- Chrome storage for persistence
- popup & dashboard for UI
- Offscreen document for recording

---

## Version History

### Legend
- 🎬 YouTube Features
- 🔧 Technical Changes
- 🎯 Focus/Productivity
- 🐛 Bug Fixes
- ⚡ Performance
- 📁 Structure/Organization
- 🎨 UI/UX Improvements
- 🛡️ Security
- ✨ New Features
- ⚠️ Breaking Changes

---

## Release Schedule

- `1.0.0` (April 15, 2026) - Initial release
- `1.1.0` (April 16, 2026) - Universal site blocker + restructuring
- `1.2.0` (TBD) - Advanced analytics and statistics
- `1.3.0` (TBD) - Cloud sync across devices
- `2.0.0` (TBD) - Major redesign and new features

---

## Known Issues

### Current Release (1.1.0)
- None reported yet

### Previous Releases
- None

---

## Roadmap

### Short Term (Next Release)
- [ ] Advanced analytics dashboard
- [ ] Export/import block lists
- [ ] Whitelist specific URLs
- [ ] Block by category (social media, news, etc.)
- [ ] Password-protected unblock

### Mid Term (Future)
- [ ] Cloud synchronization
- [ ] Browser sync across devices
- [ ] Team/family blocking mode
- [ ] Custom block page designs
- [ ] Webhook integration

### Long Term (Vision)
- [ ] AI-powered focus suggestions
- [ ] Machine learning focus patterns
- [ ] Gamification elements
- [ ] Mobile app integration
- [ ] Cross-browser support

---

## Contributing

See the main README.md for contribution guidelines.

---

## Support

- 📖 Documentation: See `docs/` folder
- 🐛 Report Issues: GitHub issues
- 💬 Discussions: GitHub discussions
- 📧 Email: support@focustube.app

---

## License

FocusTube - Productivity & Distraction Control

---

## Credits

**Version 1.0.0** - Initial development
- YouTube optimization suite
- Focus protection features
- User interface design

**Version 1.1.0** - Generalization & Enhancement
- Universal site blocker
- Project restructuring
- Comprehensive documentation
- Performance optimization

---

## Upgrade Guide

### From 1.0.0 to 1.1.0

1. **Update Extension** - Reinstall from source
2. **No Data Loss** - All settings preserved in Chrome storage
3. **Check Folder Structure** - Files moved (non-functional change)
4. **Update Imports** - If you have custom modifications
5. **Review Docs** - New documentation available in `docs/`

### Troubleshooting Upgrade
- Extension not loading? Clear cache and reload
- Settings lost? Check storage in DevTools
- Blocker not working? Reload the page

---

## Next Steps

- Read [PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md) for organization details
- Review [ARCHITECTURE.md](docs/ARCHITECTURE.md) for technical design
- Check [API.md](docs/API.md) for available functions
- See [SITE_BLOCKER_README.md](../SITE_BLOCKER_README.md) for site blocker features

---

## Questions?

Check the documentation first - most answers are there!

Last updated: 2026-04-16
