##  Air Quality 
### API Rest implementation with a simple template for displaying data of each city available

**Live demo (static version):** https://kenserikawa.github.io/airQuality/

#### Static version (GitHub Pages)
The `docs/` folder holds a backend-free replica that calls the aqicn.org API directly from the browser. GitHub Pages publishes it from `master` → `/docs`.

Run it locally:
```
python3 -m http.server 8000 --directory docs
```
Then open `http://127.0.0.1:8000/`.

- Logic tests: `node --test tests/js/*.test.mjs`
- Regenerate the city list: `python3 scripts/build-cities.py`

#### Symfony version
1. Clone repo 
2. Launch server:
```
# Native php server
php -S 127.0.0.1:8000 public/
# Web server bundle
bin/console server:start
```
3. Once you get into the route `http://127.0.0.1:8000/` try typing your city on the input and submit it.
