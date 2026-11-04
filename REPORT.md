# Rotawise: final report

Rotawise (working name Platoon, which is taken on both stores) is a shift calendar for
firefighters, EMS, police and rotating shift workers. Expo SDK 58, TypeScript strict,
SQLite storage, fully offline, no account, no ads, no analytics.

## What works and how it was tested

| Area | Works | How it was tested on this PC |
|---|---|---|
| Rotation math | Every preset (24/48, 48/96, 24/72, Kelly, Pitman, DuPont, 2 2 3, 4 on 4 off, 3 twelves), custom patterns, platoons A to D, 24 hour tours as one shift over two dates, Kelly days with interval and phase, trades, extra shifts and leave on top of the base, pay periods and gross pay | 124 Jest tests: every preset checked day by day against an independent date oracle for 2024 to 2030 (two leap years), one platoon per slot every day, average hours per week, all 2027 and 2028 clock changes in New York, London and Sydney, year ends, tours crossing midnight and New Year, Kelly spacing at 7, 9, 10 and 13, trades overriding Kelly days |
| Free tier | Setup in one screen (three taps), Today card (ON or OFF, next shift in X days), next 7 days, month view (my platoon or all, letters on every color), year view, dark mode, settings | Jest router tests drive onboarding and every screen; Playwright on the exported web build drives onboarding, month, day details, year, widget preview, reload persistence, dark mode |
| Pro | Trades ledger that changes the calendar, overtime totals, pay periods and estimated gross, leave balances, calendar export, more rotations with overlays, year PDF and image, themes and widget colors, one time purchase with restore | Jest router tests: Pro gate opens the purchase screen, trades update the month view, pay estimate (checked to the cent), balances, adding a second rotation |
| No hyphens in copy | All user facing text | A test renders all 17 screens and fails on any hyphen; the listing checker does the same for store text |
| Color blind safety | Okabe and Ito colors, letter always shown, 4.5:1 contrast | Contrast test on every platoon color |
| Storage | SQLite on phones, browser storage on web | Store tests: save, restart, read back, corrupt data, erase all |
| Android widgets | Today (small) and Next 7 days (medium), light and dark, redraw every 30 minutes and on every change | Jest builds the real native widget tree and checks every label; task handler and refresh tested |
| iOS widgets | Same two widgets in SwiftUI, timeline entries at every midnight and every shift change | Swift cannot run on Windows. Tests check the Swift reads the same App Group key and fields and uses the same strings and colors as the tested TypeScript rules. Compile result: see EAS builds below |
| Landing site | Home, 9 rotation template pages with 2027 calendars per platoon, 10 department pages from `site/departments.csv`, privacy, support, sitemap | Built with `npm run site` and checked in the browser; unverified pages carry a warning and are hidden from search engines |
| Store assets | Icon, Android icon layers, splash, feature graphic, 54 screenshots in 6 store sizes, listing text, keywords | Listing checker (limits and hyphens), screenshots reviewed |

## EAS builds

Both builds compile on EAS (free plan, 7 of 30 builds used this month, no charges).

| Build | Result | What was checked in the artifact |
|---|---|---|
| iOS simulator, commit 206fd60, [429157d7](https://expo.dev/accounts/tjcraw6589s-team/projects/rotawise/builds/429157d7-d3cf-44b3-8627-d470710f0795) | Finished | `Rotawise.app/PlugIns/RotawiseWidget.appex` is there: a 615 KB compiled SwiftUI binary, bundle `com.tyjcraw.rotawise.widget`, extension point `com.apple.widgetkit-extension`, iOS 17. So the Swift widget compiles and ships inside the app. |
| Android preview APK, commit 206fd60, [cef0e14c](https://expo.dev/accounts/tjcraw6589s-team/projects/rotawise/builds/cef0e14c-6f0d-4cfd-8ee5-201bc8796e06) | Finished | The APK manifest declares the widget receivers (Today and Week) and the widget service. |

Three earlier attempts failed and were fixed: the cloud's older npm rejected the lock file
(builds now pin Node 24.17.0), RevenueCat 11.0.0 needs a CocoaPods release that does not exist
yet (pinned 10.15.1, as in Bowerly), and an ignore rule had kept the Android widget files out
of git. The only change after commit 206fd60 is the JavaScript tablet layout (commit 58a822c).

A simulator build cannot be installed on an iPhone. The TestFlight build needs your one time
Apple sign in (RELEASE_STEPS.md step 1).

## QA pass (2 Nov 2026)

Every screen was driven in the browser at 375 by 812 and 360 by 640, light and dark, as Pro and free.
Found and fixed:

- Selected options in segmented controls were nearly invisible in dark mode, and the controls were short tap targets. They are now filled with the primary color, 44 points tall, and labels wrap instead of being cut off.
- The two week preview outlined the first day of the second week as if it were today. Regression test added.
- Setup's One day earlier and One day later buttons were small. They are now full size.
- Pay showed "6 days after" crammed between buttons. It now reads "Paid after period ends: 6 days" and explains which straight time number to use.
- The Paid back switch sat outside a card; the profile color picker was plain buttons labeled Chosen. That is now round swatches with a check in a sheet.
- The month view's end of tour bar is now in the legend; the widget previews have visible edges in dark mode.
- Calendar export now falls back to the device clock if the phone's JavaScript engine lacks named time zones, instead of crashing. Tested with a zone that forces the fallback.
- The Pro screen said "Never a subscription" twice in a row.

Gate after the pass: tsc (app and site), eslint, 183 Jest tests, 3 Playwright tests, all passing.

## Not tested, and why

- **Widgets on a device.** There is no Mac, iOS simulator or Android emulator here. The brief
  asked for simulator screenshots of the widgets; that is not possible on this PC. The iOS
  widget has to be checked on your iPhone through TestFlight (RELEASE_STEPS.md step 4). The
  Android widget is checked by its build and unit tests only. I have not seen either widget
  render on a real home screen, so I am not claiming they do.
- **Android emulator.** It needs Android Studio (about 4 GB) and the Windows Hypervisor
  Platform feature. This PC runs a hypervisor, but checking whether that feature is on needs
  administrator rights. If you want it, say so: you would turn the feature on in Windows and
  approve the download, then I can install it and take widget screenshots.
- **Real purchases.** Buying and restoring Pro need the RevenueCat project and keys
  (RELEASE_STEPS.md step 3) and a TestFlight sandbox account. The purchase code is the same
  code Bowerly ships with.
- **Calendar export, PDF and image sharing** use device APIs that do not exist on the web;
  they are covered by mocked tests only until TestFlight.

## Known gaps and honest risks

1. **Privacy label.** Decided: keep RevenueCat. The label is "Purchases, Purchase History,
   not linked to you, app functionality" (answers in `STORE_LISTING.md`), not "Data Not
   Collected". The app, manifest, site and policy all say the same thing.
2. **iOS widget compile risk** is limited to the Swift files; see the EAS result above.
3. **Department pages are examples.** All 10 rows are marked UNVERIFIED with placeholder
   dates. They show a warning banner and are excluded from search until you confirm them.
4. **Name.** Rotawise had no exact match on either store on 2 Nov 2026. A trademark search
   was not done.
5. **Google Play** needs a $25 account and an Android phone for verification, so Android is
   built but not listed.
6. **Kelly day defaults.** Departments run Kelly days very differently. The app lets users
   set the interval and pick their next Kelly day, but the Kelly preset's default of every
   7th tour is a guess.
7. **eas-cli** on this PC is 25.3.0 (27.2.0 is out). Builds work; updating is optional.

## How to run things

```
npm run verify          # tsc, eslint, Jest
npm run export:web      # web build into dist/
npm run test:e2e        # Playwright smoke test on dist/
npm run site            # landing site into site/dist
npm run site:serve      # preview it at http://127.0.0.1:4192/
npm run assets          # icons, splash, widget previews, feature graphic
npm run screenshots     # store screenshots from dist/
node scripts/check-listing.mjs
```

## Session of 3 Nov 2026

| Area | Result | How it was checked |
|---|---|---|
| iOS design pass | Paywall price and buttons pinned on screen; larger text no longer clips; sheets swipe to close; contrast and VoiceOver fixes; clearer copy | Web preview at 375 and 440 points, light and dark, doubled text sizes; 7 new Jest tests (190 total), 3 Playwright tests, tsc, eslint |
| Site SEO | Titles and descriptions fit search results, structured data, breadcrumbs | Local build, then the live site: 12 pages load, 25 internal links load, department pages noindex |
| Website | Live at https://tjcraw6589.github.io/rotawise/ | GitHub repo Tjcraw6589/rotawise, Pages from GitHub Actions |
| RevenueCat | Project Rotawise, App Store app with valid key, product rotawise_pro_lifetime, entitlement pro, offering default | Dashboard; public key in app.json |
| App Store Connect | Pro purchase ready (4.99 USD, 175 countries, review screenshot); listing text, links, categories, review contact, Free, manual release | Read back through App Store Connect |
| TestFlight | Build 16 built and uploaded | Expo build and submission both finished |

Not tested yet: the widgets on a real iPhone, build 16 on a device, a sandbox purchase and
Restore purchases, and large text on a real iPhone (simulated in the browser only).

Apple refuses the App Store Connect API key for portal calls since 3 Nov even after API access
was re approved and a new key was made. Builds work by reusing the saved Apple sign in:
`EXPO_APPLE_ID=<your Apple ID> eas build -p ios --profile production --non-interactive --no-wait --auto-submit`.
If Apple asks for a sign in again, run `eas credentials -p ios` once and sign in.
