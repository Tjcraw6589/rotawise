# Rotawise store listing

Copy and paste these into App Store Connect and Google Play Console. No hyphens anywhere,
as asked. Character limits were checked with `node scripts/check-listing.mjs`.

## Names and short text

| Field | Text | Limit |
|---|---|---|
| App Store name | Shift Calendar: Rotawise | 30 |
| App Store subtitle | Fire, EMS & Police Rotations | 30 |
| Google Play title | Shift Calendar: Rotawise | 30 |
| Google Play short description | Fire, EMS and police shift calendar with widgets. Pay once, no subscription. | 80 |
| App Store promotional text | Your rotation, on your home screen. 24/48, 48/96, Kelly, Pitman, DuPont and custom patterns with A B C D platoons. Pay once. Never a subscription. | 170 |

## App Store keywords (100 characters, commas, no spaces; "shift" and "calendar" are already in the name, which Apple also searches)

```
firefighter,24/48,kelly,platoon,pitman,dupont,ems,police,schedule,rotation,widget,overtime,nurse
```

## Description (App Store)

Apple does not allow other platforms to be named here, so the two stores get slightly different text.

```
Your rotation, on your home screen. Pay once. Never a subscription.

Rotawise is the shift calendar for firefighters, EMS, police, dispatchers, nurses and anyone on a rotating schedule. Set up your rotation in under a minute and see at a glance whether you're on or off today, and when your next shift starts.

FREE, AND GENUINELY USEFUL
• Every common rotation: 24/48, 48/96, 24/72, Kelly schedule, Pitman, DuPont, 2 2 3, 4 on 4 off and 3 twelves
• Custom pattern builder: any sequence of days off, 24 hour tours, 12 hour days and nights, any start date
• A, B, C and D platoons with high contrast colors that work for color blind eyes, always with a letter
• See your platoon or every platoon at once
• A 24 hour tour is one shift across two dates, not two day shifts
• Kelly days at whatever interval your department uses
• Month and year views, big and readable at a glance, with dark mode
• Home screen widgets: Today (on or off, next shift) and Next 7 days. They update by themselves at midnight and at every shift change

PRO: ONE PAYMENT, YOURS FOREVER
• Trades and swaps ledger: who owes whom, and your calendar updates with every trade
• Overtime and extra shift log with hour totals
• Pay periods and paydays (weekly, biweekly, twice a month or custom) with estimated gross pay from your hourly rate and overtime multiplier
• Vacation, sick and Kelly day balances
• Share with a calendar: send shifts to your iPhone calendar, including iCloud or Google calendars, so a partner can see them
• More rotations: a second job or a partner's rotation overlaid in color
• Print the year as a PDF or share it as an image
• Color themes and widget colors

Rotawise Pro is a one time purchase. It is not a subscription and never renews. Restore it on any iPhone or iPad signed in to the same Apple Account.

PRIVATE BY DESIGN
No account. No ads. No analytics. No tracking. Your schedule stays on your phone.

Rotawise calculates the rotation you set up. Always check your department's official schedule.
```

## Description (Google Play)

```
Your rotation, on your home screen. Pay once. Never a subscription.

Rotawise is the shift calendar for firefighters, EMS, police, dispatchers, nurses and anyone on a rotating schedule. Set up your rotation in under a minute and see at a glance whether you're on or off today, and when your next shift starts.

FREE, AND GENUINELY USEFUL
• Every common rotation: 24/48, 48/96, 24/72, Kelly schedule, Pitman, DuPont, 2 2 3, 4 on 4 off and 3 twelves
• Custom pattern builder: any sequence of days off, 24 hour tours, 12 hour days and nights, any start date
• A, B, C and D platoons with high contrast colors that work for color blind eyes, always with a letter
• See your platoon or every platoon at once
• A 24 hour tour is one shift across two dates, not two day shifts
• Kelly days at whatever interval your department uses
• Month and year views, big and readable at a glance, with dark mode
• Home screen widgets: Today (on or off, next shift) and Next 7 days. They update by themselves at midnight and at every shift change

PRO: ONE PAYMENT, YOURS FOREVER
• Trades and swaps ledger: who owes whom, and your calendar updates with every trade
• Overtime and extra shift log with hour totals
• Pay periods and paydays (weekly, biweekly, twice a month or custom) with estimated gross pay from your hourly rate and overtime multiplier
• Vacation, sick and Kelly day balances
• Share with a calendar: send shifts to a calendar on your phone, such as Google Calendar, so a partner can see them
• More rotations: a second job or a partner's rotation overlaid in color
• Print the year as a PDF or share it as an image
• Color themes and widget colors

Rotawise Pro is a one time purchase. It is not a subscription and never renews. Restore it on any Android phone or tablet signed in to the same Google account.

PRIVATE BY DESIGN
No account. No ads. No analytics. No tracking. Your schedule stays on your phone.

Rotawise calculates the rotation you set up. Always check your department's official schedule.
```

## In app purchase

| Field | Value |
|---|---|
| Type | Non consumable |
| Product ID | rotawise_pro_lifetime (same on both stores) |
| Reference name / display name | Rotawise Pro |
| Price | $4.99 (Apple tier 5, Google 4.99 USD) |
| Description | Pay once. Every Pro tool, forever. Not a subscription. |
| RevenueCat entitlement | pro |
| RevenueCat offering | default, with one Lifetime package |

## Categories and ratings

| Store | Field | Value |
|---|---|---|
| Both | Primary category | Productivity |
| App Store | Secondary category | Utilities |
| Both | Age rating | 4+ / Everyone (no objectionable content) |
| Both | Price | Free (with one in app purchase) |
| Both | Support URL | https://tjcraw6589.github.io/rotawise/support.html |
| Both | Marketing URL | https://tjcraw6589.github.io/rotawise/ |
| Both | Privacy policy URL | https://tjcraw6589.github.io/rotawise/privacy.html |

## Privacy answers (App Store "App Privacy", Google "Data safety")

Decided 2 Nov 2026: keep RevenueCat and answer honestly for it. The schedule never leaves the
phone. On every launch the app asks RevenueCat whether Pro is unlocked, sending an anonymous app
user ID plus basic device and app version details. The purchase receipt is sent only if the user
buys Pro.

**App Store, App Privacy:**
1. "Do you or your third party partners collect data from this app?" **Yes**.
2. Data type: **Purchases, Purchase History**. Nothing else.
3. Used for: **App Functionality** only.
4. Linked to the user's identity: **No**.
5. Used for tracking: **No**.

The label then reads "Data Not Linked to You: Purchases". This matches the app's privacy
manifest (`app.json`) and the privacy policy.

**Google Play, Data safety** (when the Play account exists):
- Collects data: **Yes**, Financial info, **Purchase history**, collected not shared,
  required, for **App functionality**, not processed ephemerally.
- Encrypted in transit: **Yes**. Deletion request: data is not tied to a person, so answer
  that users can delete by uninstalling.

## Screenshots

Generated from the real app screens with `npm run screenshots` into `store/screenshots/`:

| Folder | Pixels | Use for |
|---|---|---|
| iphone-6.9 | 1320 x 2868 | App Store iPhone 6.9 inch (required) |
| iphone-6.3 | 1206 x 2622 | App Store iPhone 6.3 inch |
| iphone-6.5 | 1284 x 2778 | App Store iPhone 6.5 inch |
| ipad-13 | 2064 x 2752 | App Store iPad 13 inch (the app supports iPad) |
| android-phone | 1080 x 1920 | Google Play phone |
| android-tablet-10 | 1600 x 2560 | Google Play 10 inch tablet |

Order: 01 Today, 02 Month (all platoons), 03 Widgets, 04 Year, 05 Trades, 06 Pay, 07 Dark month
with a partner overlay, 08 Pro (one time purchase), 09 Setup.

The widgets screenshot shows the in app widget preview, drawn by the same rules as the real
widgets. Once the TestFlight build is on your iPhone, a real home screen screenshot with the
widgets is the better image for slot 3.

## Feature graphic (Google Play, 1024 x 500)

`store/feature-graphic.png`, generated by `npm run assets`.
