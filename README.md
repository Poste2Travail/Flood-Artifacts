# Flood Tuber Package Builder

A static tool to prepare a PNGTuber avatar for [Flood Tuber](https://floodtechlab.com/). Drop in the sprite images for each state, check their alignment, fill in the settings, then download a ZIP ready to import.

Everything runs in the browser. No images or data are sent to a server.

## Features

- Drop sprites into named slots (drag and drop or click): `idle` (required), `blink`, `action`, `talk_a` to `talk_c`, and their `talk_*_blink` variants
- Optional extra talk images `talk_d`, `talk_e`, `talk_f` (and their `_blink` variants), shown by the "Extra talk images" option
- Stacked layer preview with:
  - a global opacity slider
  - a difference view that highlights the pixels that differ from `idle`
  - show/hide toggles for each layer
- "Simulate pattern" to preview talking, blinking, actions and motion
- Image editor for still images: magic wand, eraser and magic eraser to remove a background, and a difference eraser to bring an image back to a model
- Choice of the target plugin version: Flood Tuber 1.3.0 or 1.4.0
- Settings form for every key of `settings.ini`, with the plugin's ranges
- ZIP export containing an `<avatar name>/` folder with the images and `settings.ini`
- Interface in English by default, with switching to French, Turkish, Japanese and Chinese

## Target plugin version

The "Flood Tuber version" list sets what the package contains. Flood Tuber 1.4.0 is selected by default. 1.3.0 remains available for the previous plugin, which only opens `.png` names.

| | 1.3.0 | 1.4.0 |
| --- | --- | --- |
| Image files | `.png` only | `.png`, `.apng`, `.gif`, `.webp` |
| Talk images | A to C | A to F |
| `settings.ini` | without `talking_speed`, `mouth_mode`, `mouth_range`, `reference_height` | every key |

With 1.3.0 selected:

- a GIF or WebP is exported as a still `.png` (first frame of an animation), and the Builder warns about it;
- the D, E, F slots and the 1.4.0 settings are hidden. Images already dropped in D, E, F are kept but not exported.

The sections below describe the 1.4.0 package.

## Image formats

Each image keeps its real format in the ZIP. The slot gives the name, the content gives the extension: a GIF dropped into `blink` is written as `blink.gif`.

| Dropped file | Written as |
| --- | --- |
| PNG | `.png` |
| APNG | `.apng` |
| GIF | `.gif` |
| WebP | `.webp` |
| JPEG, BMP and other images | converted to `.png` |
| Any image edited with the magic wand | `.png` (first frame only for an animation) |

- The format is read from the file signature, not from the original extension. A GIF, a WebP and an APNG keep that extension in the ZIP.
- There is one file per name. Flood Tuber 1.4.0 looks for `.png`, then `.apng`, `.gif`, then `.webp`, and uses the first one found. It plays an APNG from the file contents, including one saved as `.png`. A GIF animates only when the name ends in `.gif`.
- PNG, APNG, GIF and WebP files are copied byte for byte.

### Talk images

`talk_a`, `talk_b` and `talk_c` are the base. `talk_d`, `talk_e` and `talk_f` are optional. The talk cycle runs from A to the last image provided. A missing step shows the previous image, and the Builder warns about it.

### Animated images

Flood Tuber turns every frame of an animation into a full-size texture in video memory. The Builder shows a warning when an animated file exceeds a limit of the plugin, or reaches 80 % of it:

- an APNG whose decoded frame (width × height × 4 bytes) exceeds 256 MB is refused;
- an animation is cut beyond 1 GB in total (width × height × 4 bytes × number of frames).

## Editing an image

The wand button of a slot opens the editor. It works on still images and saves a PNG. It is not offered for a GIF or an animated file (APNG, animated WebP): edit those with a third-party tool such as [ezgif.com](https://ezgif.com/).

### Difference eraser

Images made separately, for example by an AI generator, often drift from one another. The difference eraser brings an image back to a model:

1. Open the image to fix and choose the model in the "Model" list (`idle` by default).
2. Select "Difference eraser". The pixels that differ from the model are tinted.
3. Brush over the differences you do not want. Under the brush, each differing pixel takes the model's pixel. Pixels the brush does not touch are left as they are, so wanted differences (mouth, eyes) stay.
4. The tolerance slider sets how far a pixel must be from the model to count as different.

The model sets the size. When the image has another size, it is scaled to the model's size; if its shape differs, the leftover margins stay transparent. Applying then saves the image at the model's size.

Remove a plain background with the magic wand first: once transparent, it no longer counts as a difference.

## `settings.ini`

Text values stay in English whatever the interface language.

| Section | Key | Type | Default | Range or values |
| --- | --- | --- | --- | --- |
| General | `name` | text | avatar name | |
| General | `author` | text | empty | not read by the plugin |
| General | `mirror` | `true` / `false` | `false` | |
| Audio | `threshold` | decimal (dB) | `-30.0` | -60 to 0 |
| Audio | `release_delay` | integer (ms) | `200` | 0 to 2000 |
| Audio | `talking_speed` | decimal (s) | `0.10` | 0.01 to 1.0 |
| Audio | `mouth_mode` | text | `Cycle` | `Cycle` or `Volume` |
| Audio | `mouth_range` | integer (dB) | `20` | 1 to 60 |
| Blink | `duration` | integer (ms) | `150` | |
| Blink | `interval_min` | integer (ms) | `2000` | |
| Blink | `interval_max` | integer (ms) | `8000` | |
| Action | `duration` | integer (ms) | `4000` | |
| Action | `interval_min` | integer (ms) | `60000` | |
| Action | `interval_max` | integer (ms) | `120000` | |
| Motion | `type` | text | `Shake` | `None`, `Bounce`, `Shake`, `Oscillating` |
| Motion | `speed` | integer | `100` | 0 to 500 |
| Motion | `strength` | integer | `1` | 0 to 50 |
| Motion | `reference_height` | integer (px) | `512` | 64 to 4096 |

- Values outside a range are brought back into it.
- The export is refused when `interval_min` is greater than `interval_max`.
- `mirror` and the three `Motion` keys `type`, `speed` and `strength` are always written.

## Avatar name

The avatar name is the folder name. The Builder applies the same rule as the plugin: control characters and `\ / : * ? " < > |` are removed, then spaces and dots at both ends. An empty name is refused. Accents and non-Latin characters are kept.

## Usage

1. Open `index.html` in a recent browser.
2. Enter the avatar name.
3. Drop at least the `idle` image. All other slots are optional.
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
- `app.js` — all behaviour, organised in sections. The header comment explains the data model: slots are keyed by base name (`idle`, `talk_a`, …), and `files`, `formats`, `images` and `slots` hold the state.
- `style.css` — layout and theme. Colours are CSS custom properties on `:root`.

### Adding a language

1. Copy the `en` block in `translations` (in `app.js`) and translate every key.
2. Add a `<button data-lang="xx" class="lang-btn">` in the `.lang-switcher` of `index.html`.

### Changing the file names or settings

The base names (`idle`, `talk_a`, …), the extensions and the `settings.ini` keys are read by Flood Tuber. Change them only if Flood Tuber changes too. Renaming or adding a slot means updating two places: the `data-name` in `index.html` and `SLOT_ORDER` in `app.js`. A new setting needs its field in `index.html`, its line in `generateSettingsIni()` and, for a number, its range in `SETTING_RULES`.
