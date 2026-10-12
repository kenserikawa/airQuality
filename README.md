##  Air Quality 
### See the air around you — a sky that changes color with the Air Quality Index

**Live demo:** https://kenserikawa.github.io/airQuality/

AirQuality opens on the air quality of the station nearest to you (browser geolocation, with an IP-based fallback) and paints the whole sky in the color of its AQI category. Search any city or station, check the 6-day forecast, each pollutant, the weather at the station and a map with the official AQI layer. Data comes straight from the [World Air Quality Index Project](https://aqicn.org/) API; there is no backend.

#### Stack
- [Vite](https://vite.dev/) + vanilla JavaScript modules + [Tailwind CSS](https://tailwindcss.com/) v4
- [Leaflet](https://leafletjs.com/) (loaded on demand) with OpenStreetMap tiles and the WAQI AQI overlay
- [Vitest](https://vitest.dev/) + jsdom for tests
- Visual design explored in Google Stitch — references in `design/stitch/`
- Deployed to GitHub Pages by GitHub Actions (`.github/workflows/pages.yml`), only if the tests pass

#### Development
```
cd web
npm install
npm run dev        # http://localhost:5173/airQuality/
npm test           # unit + UI tests
npm run build      # production build in web/dist
npm run preview    # serve the production build
```

Design spec and implementation plan: `superpowers/specs/2026-10-12-atmospheric-redesign-design.md` and `superpowers/plans/2026-10-12-atmospheric-redesign.md`.

#### Symfony version (original)
The original server-rendered app is still in the repository root.
1. Clone repo 
2. Launch server:
```
# Native php server
php -S 127.0.0.1:8000 public/
# Web server bundle
bin/console server:start
```
3. Once you get into the route `http://127.0.0.1:8000/` try typing your city on the input and submit it.
