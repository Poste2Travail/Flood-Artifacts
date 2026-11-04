# Flood Tuber Package Builder

A static tool to prepare a PNGTuber avatar for [Flood Tuber](https://floodtechlab.com/). Drop in the sprite images for each state, check their alignment, fill in the settings, then download a ZIP ready to import.

Everything runs in the browser. No images or data are sent to a server.

## Features

- Drop sprites into named slots (drag and drop or click): `idle.png` (required), `blink.png`, `action.png`, `talk_a/b/c.png`, and their `talk_*_blink.png` variants
- Accepted formats: PNG, GIF, APNG, WebP
- Stacked layer preview with:
  - a global opacity slider
  - difference blend mode (`mix-blend-mode: difference`) to spot misalignments
  - show/hide toggles for each layer
- Settings form whose fields map one-to-one to the keys in `settings.ini`
- ZIP export containing an `<avatar name>/` folder with the images and `settings.ini`
- Interface in French by default, with switching to English, Turkish, Japanese and Chinese

## Usage

1. Open `index.html` in a recent browser.
2. Enter the avatar name.
3. Drop at least `idle.png`. All other slots are optional.
4. Check the alignment in the preview.
5. Fill in the settings.
6. Click the download button to get the ZIP.

## Repository layout

| File | Role |
| --- | --- |
| `index.html` | Page structure and drop slots |
| `app.js` | Logic: file loading, preview, translations, `settings.ini` and ZIP generation |
| `style.css` | Layout and theme |
| `assets/logo.png` | Logo shown in the header |
| `LICENSE` | MIT license |

## Deploying on GitHub Pages

1. Push `index.html`, `style.css`, `app.js` and the `assets/` folder to the repository root.
2. In *Settings → Pages*, choose *Deploy from a branch*, then the `main` branch and the `/ (root)` folder.

## Dependencies

- [JSZip](https://stuk.github.io/jszip/) 3.10.1, loaded from jsDelivr. ZIP generation does not work offline unless the library is vendored into the repository.
- Inter and Orbitron fonts, loaded from Google Fonts.

No build step, package manager or framework is required.

## Development

1. Clone the repository and open `index.html` in a browser, or run a local server:
   ```
   node server.js 8001
   ```
   then open `http://localhost:8001/index.html`. On Windows, `lancer-serveur.bat` does the same.
2. Edit the files and reload the page. The local server sends `Cache-Control: no-store`, so reloads always show the latest code.
3. There are no tests or linter. Check your changes by hand in the browser.

### Architecture

- `index.html` — markup only. Each block has an HTML comment describing its role.
- `app.js` — all behaviour, organised in sections. The header comment explains the data model: slots are keyed by file name, and `files`, `images` and `slots` hold the state.
- `style.css` — layout and theme. Colours are CSS custom properties on `:root`.

### Adding a language

1. Copy the `en` block in `translations` (in `app.js`) and translate every key.
2. Add a `<button data-lang="xx" class="lang-btn">` in the `.lang-switcher` of `index.html`.

### Changing the file names or settings

The file names (`idle.png`, `talk_a.png`, …) and the `settings.ini` keys are read by Flood Tuber. Change them only if Flood Tuber changes too. Renaming a slot means updating three places: the `data-name` in `index.html`, the `order` array in `updatePreview()`, and the file name used in the ZIP.
