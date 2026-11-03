Continue Rotawise, my shift calendar app for firefighters, EMS and police, in C:\Users\Tyjcr\Documents\Platoon (folder keeps the old name Platoon on purpose). Start by reading REPORT.md, RELEASE_STEPS.md, STORE_LISTING.md and your memory note "rotawise-app-project". Plain language please, minimal effort from me.

Where it stands: Expo SDK 58 app with iOS and Android home screen widgets, all tests passing (tsc, eslint, 183 Jest, 3 Playwright). TestFlight build 4 is in my "Rotawise testers" group. App Store Connect app "Shift Calendar: Rotawise" exists (Apple ID 6829975398). Uploads now run with no prompts: eas build -p ios --profile production --non-interactive --no-wait --auto-submit. I chose to keep RevenueCat, so the privacy label is "Purchase History, not linked, App Functionality".

Use my new plugins where they help: Mobile App Design (iOS) to review the onboarding, Pro paywall, settings and widget screens against Apple's conventions; the design plugin for UX writing and an accessibility check; the SEO plugin for the landing site in site/; the Expo plugin if it is installed.

Do these in order, telling me only the steps I must do myself:
1. Ask me for a screenshot of the widgets on my iPhone. Do not claim the widgets work until I confirm they render and roll over at midnight.
2. Review the main screens with the iOS design plugin, fix what it finds, keep every test green, and send a new TestFlight build.
3. Walk me through RevenueCat (login captiancraw@gmail.com): I upload the .p8 key myself; you set up product rotawise_pro_lifetime, entitlement pro and offering default, put the public appl_ key in app.json, rebuild for TestFlight, and help me test a sandbox purchase and Restore purchases.
4. Fill the App Store Connect listing from STORE_LISTING.md in the browser pane after I sign in. I click the age rating, content rights and App Privacy confirmations and drag in the screenshots.
5. When I have created a public GitHub repo named rotawise, push the code, turn on GitHub Pages (the workflow is in .github/workflows/pages.yml) and run an SEO check on the site.

Rules: no hyphens in any user facing text. Never spend money or start anything billable without asking me first. Never submit for App Review or release without my click (TestFlight is fine). Never type or paste passwords, .p8 keys or secret keys; I enter those. Commit with git -c user.name=Tyjcr -c user.email=tyjcraw@gmail.com and end messages with the current Co-Authored-By line. Finish with a short plain report of what was tested and what was not.
