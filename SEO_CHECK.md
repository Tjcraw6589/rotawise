# Rotawise site: SEO check

Checked on 3 Nov 2026 against the local build of `site/` (22 pages), then again on the live
site https://tjcraw6589.github.io/rotawise/ after it was published the same evening. Live
result: all 12 sitemap pages load, titles and descriptions match the table below, structured
data is present, all 25 internal links load, and the department pages carry noindex.

Target searches: "firefighter shift calendar app" for the home page, and
"24/48 shift calendar 2027", "Kelly schedule calendar", "Pitman schedule" and so on for the
nine rotation pages. The ten department pages are unverified examples, so they are hidden
from search engines on purpose.

## Score (indexed pages)

| Area | Before | Now |
|---|---|---|
| Titles | 6 of 10 too long (up to 68 characters) | All 42 to 57 characters, all unique |
| Descriptions | 6 of 10 too long (up to 195 characters) | All 119 to 159 characters, all unique |
| Headings | One H1 each; every platoon had two headings in a row | One H1 each, one heading per calendar |
| Content | Clear intro and full year calendars | Same |
| Internal links | 7 to 26 per page | Plus a breadcrumb on rotation pages |
| Images | Every image has alt text or is decorative | Same |
| Web addresses | Short, lowercase, readable | Same |
| Structured data | None | Home: WebSite and MobileApplication. Rotation pages: BreadcrumbList |
| Sharing | Title, description, image | Plus site name, page address and a summary card |
| Sitemap and robots | 12 indexed pages listed, departments left out | Same |

## Fixed in this pass

- Shorter titles and descriptions, and the build now fails if a future page is too long.
- "Kelly schedule" and "3 twelves" are capitalized in titles and headings.
- "Used by fire and ems agencies" now keeps EMS and Kelly capitalized.
- Structured data, breadcrumbs and sharing tags added.
- Safari's "Open in App Store" banner turns on by itself once `appStoreUrl` is set in `site/config.json`.

## Still open

1. **Now that the site is live:** add it to Google Search Console and submit `sitemap.xml`. That needs your Google sign in.
2. **When the app is live:** put the App Store link in `site/config.json` so the "coming soon" buttons become real links.
3. **Home page heading** is the slogan "Your rotation, on your home screen." The title already carries "Shift Calendar for Firefighters, EMS and Police", so this was left as your brand line.
4. **Rotation pages are mostly calendars.** A short "How the 24/48 works" section with two or three common questions would help them rank for question searches.
5. **Department pages** stay hidden until you mark rows VERIFIED in `site/departments.csv`.
6. **Web addresses** use hyphens, such as `rotations/24-48/`, which is the web standard. They are not page text. Say so if you want them changed before the site goes live.
