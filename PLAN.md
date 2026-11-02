# Rotawise build plan

Working name was "Platoon". It is taken on both stores (an exact "Platoon" app plus
"Platoon: Fire Service", a direct competitor), so the app is called **Rotawise**.
The App Store (US and AU) and Google Play have no app with that name as of 2 Nov 2026.
The folder stays `Documents\Platoon` on purpose.

Positioning: "Your rotation, on your home screen. Pay once. Never a subscription."
Fully offline. No account. No ads, analytics or tracking.

## What this PC can and cannot verify

- Windows 11, no Mac, no Android phone, no Android SDK installed.
- iOS native code (SwiftUI widget, App Group storage) compiles only on EAS Build
  (free plan, builds queue). There is no iOS simulator here, so "screenshot the widget
  on the simulator" becomes "install the TestFlight build on your iPhone and check the
  widget". I will not claim the iOS widget renders until someone has seen it.
- Android: the app and widget are compiled on EAS Build and the widget UI is unit
  tested in Jest. An emulator here would need Android Studio (free, several GB). It is
  a stretch goal at the end, not a blocker.
- Everything in TypeScript is verified here: tsc, eslint, Jest, and a Playwright smoke
  test against the exported web build (same React Native code via React Native Web).

## Milestones

| # | Milestone | Done means |
|---|-----------|------------|
| M0 | Name and plan | Name checked in both stores, user picked Rotawise, this file |
| M1 | Skeleton | Expo SDK 58, TypeScript strict, Expo Router, Jest, ESLint, Playwright configured; `npm run verify` passes on an empty app |
| M2 | Rotation math | Pure module `src/lib/rotation` with every preset, custom builder, Kelly days, platoon offsets, 24 hour tours spanning two dates, overrides (trades, extra shifts, leave); full Jest suite incl. leap years, DST, year boundaries, midnight crossing, Kelly intervals, trades overriding the base |
| M3 | Free tier | Onboarding under 60 seconds (preset, start date, platoon), month and year views, today card ("ON / OFF, next shift in X days"), platoon colors with letter labels, dark mode, SQLite storage (web uses localStorage so the smoke test runs) |
| M4 | Pro | Trades ledger (updates calendar), overtime log with hour totals, pay periods and paydays with estimated gross, vacation/sick/Kelly balances, device calendar export, multiple profiles overlaid, year PDF and image, themes and widget colors; RevenueCat non consumable `rotawise_pro_lifetime`, restore purchases, "one time purchase forever" copy |
| M5 | Widgets | Shared snapshot written by the app; iOS WidgetKit target (small today, medium next 7 days) via `@bacons/apple-targets` reading App Group storage; Android widgets via `react-native-android-widget`; both update daily. iOS compiles on EAS; Android compiles on EAS and renders in Jest |
| M6 | Quality gate | tsc, eslint, Jest, web export and Playwright smoke test all green |
| M7 | Landing site | Static HTML/CSS in `site/`; home, rotation template pages with 2027 printable calendars per platoon, department pages generated from `site/departments.csv` (10 UNVERIFIED seed rows), privacy and support pages; builds with one command and opens locally |
| M8 | Store and release | Icon and splash from one vector, store screenshots from the web build, `STORE_LISTING.md`, `RELEASE_STEPS.md`, EAS iOS build compiles, `REPORT.md` with what was tested and what was not |

## Design decisions

- Dates are plain `YYYY-MM-DD` strings and integer day numbers in the math module;
  no `Date` objects, so DST and time zones cannot shift a shift.
- A shift is one instance with a start date, a start time and a duration. A 24 hour
  tour starting 07:00 on the 3rd is ONE shift that ends 07:00 on the 4th. The calendar
  marks the 4th as "ends 07:00", not as a second shift.
- Platoons are offsets into the same cycle. A/B/C on 24/48 are offsets 0, 1, 2 days.
- Overrides (trade given, trade taken, extra shift, vacation, sick, Kelly day) are
  stored per profile and applied on top of the generated base rotation.
- Platoon colors come from the Okabe and Ito color blind safe palette, and every
  platoon always shows its letter.
- Pro is a one time, non consumable purchase. The entitlement is `pro`.
- Storage: expo-sqlite on iOS and Android through one small repository interface;
  the web build uses localStorage behind the same interface so tests and the web
  smoke test exercise the same screens.
