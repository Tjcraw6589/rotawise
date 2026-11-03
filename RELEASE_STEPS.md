# Rotawise: the steps only you can do

Everything else (code, builds, uploads to TestFlight, store text, the website) Claude does.
Each step says what to do and roughly how long it takes. Nothing here costs money except
where it says so, and Claude never pays for anything or submits for review without your OK.

## 1. Apple: let EAS set up signing (5 minutes, once)

The app has a home screen widget, which needs its own Apple ID and an App Group. EAS creates
all of that, but only after you sign in to Apple once.

1. Open a terminal in `Documents\Platoon` and run:
   ```
   eas build -p ios --profile production
   ```
2. When it asks, sign in with your Apple ID and password (and the 2 factor code). Answer **Yes**
   to every "Generate a new..." or "Set up capabilities" question.
3. Close the terminal once it says the build is queued. Tell Claude "the Rotawise build is
   queued". Claude takes it from there (TestFlight upload included).

## 2. App Store Connect (10 minutes, in the browser pane)

1. Sign in to App Store Connect in the Claude browser pane.
2. Tell Claude: "set up Rotawise in App Store Connect". Claude creates the app, the
   $4.99 one time purchase `rotawise_pro_lifetime`, and fills in the listing from
   `STORE_LISTING.md`.
3. Click the few things Apple only lets you click: **Content Rights**, **Age Rating**, and
   **App Privacy** (use the privacy answers in `STORE_LISTING.md`; Claude opens each one for you).
4. Drag the screenshots from `store\screenshots\iphone-6.9` (and `ipad-13`) into the
   media manager. The browser pane cannot upload files, so this one is yours.

## 3. RevenueCat (10 minutes)

RevenueCat confirms purchases and makes Restore purchases work. Free until $2,500 a month in revenue.

1. Sign in at app.revenuecat.com (captiancraw@gmail.com) and create a project named **Rotawise**.
2. Add an **App Store** app with bundle ID `com.tyjcraw.rotawise`.
3. Upload your **In App Purchase key** (.p8 file) on that app's page. You can reuse the
   Bowerly key (Key ID HF669L7QMN) if you still have the file; otherwise App Store Connect,
   Users and Access, Integrations, In App Purchase, generate one. Never paste the .p8 text into chat.
4. Tell Claude "RevenueCat project is ready". Claude adds the product, the `pro` entitlement and
   the `default` offering, then asks you to copy the **public** Apple API key (starts with
   `appl_`). That key is public by design, so pasting it in chat is fine.

## 4. Check the widgets on your iPhone (5 minutes)

This PC has no Mac, so the iOS widget can only be seen on a real iPhone.

1. Install the Rotawise build from the **TestFlight** app (Claude sends you the invite).
2. Open Rotawise, pick your rotation, then add both widgets: touch and hold the home screen,
   Edit, Add Widget, search Rotawise, add **Today** and **Next 7 days**.
3. Take a screenshot of the home screen and send it to Claude. Check again the next morning
   that the date moved on by itself.

## 5. Submit for review (1 click, when you are happy)

Tell Claude "submit Rotawise". Claude prepares everything; the final **Add for Review /
Submit** button is yours to click.

## 6. The website (2 minutes)

1. On GitHub, create a new **public** repository named `rotawise` (no README). Click Create.
2. Tell Claude "rotawise repo created". Claude pushes the code and turns on GitHub Pages.
   The site goes live at https://tjcraw6589.github.io/rotawise/ (free).
3. Department pages: open `site\departments.csv` in Excel. For each department you have
   confirmed, fix the rotation and anchor date and change `UNVERIFIED` to `VERIFIED`. Add
   more rows the same way. Tell Claude "republish the site". Unverified pages stay hidden
   from Google and carry a warning banner.

## 7. Google Play (later, only if you want Android)

Google requires a one time **$25** fee and verification on an Android phone, which you do
not have yet, so this is on hold. When you are ready:

1. Create a Google Play developer account (play.google.com/console) and verify it on an Android phone.
2. Create the app "Shift Calendar: Rotawise" and a one time product `rotawise_pro_lifetime` for $4.99.
3. Create a service account key for uploads (Claude walks you through it; you download the
   JSON file and save it as `Documents\Platoon\credentials\google-play-service-account.json`).
4. In RevenueCat, add a Google Play app and upload the same service account JSON.

The Android build already compiles on EAS; Claude handles the rest.
