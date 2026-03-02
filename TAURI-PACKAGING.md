# TASK: Package Numenera Character Generator as a Desktop App with Tauri

> **CONTEXT**: The Numenera Character Generator is a **fully built and working** React + TypeScript + Vite web application. It runs via `npm run dev` and builds via `npm run build` to a static `dist/` folder. **Do not modify, rebuild, or refactor the existing application code.** Your only task is to wrap it in Tauri so it runs as a native desktop executable.

> **GOAL**: Produce double-click desktop executables for **Windows** (`.exe`) and **Mac** (`.app`/`.dmg`). No terminal, no browser, no `npm run dev` — the user double-clicks an icon and the app opens in a native window.

---

## 1. WHAT THE EXISTING APP LOOKS LIKE

The project is a standard Vite + React app. The relevant details are:

| Item | Value |
|------|-------|
| Dev server command | `npm run dev` |
| Dev server URL | `http://localhost:5173` |
| Build command | `npm run build` (or `tsc && vite build`) |
| Build output directory | `dist/` (relative to project root) |
| Framework | React 18+ with TypeScript |
| Styling | Tailwind CSS |
| State | Zustand (persists to localStorage) |
| PDF generation | @react-pdf/renderer (client-side, uses `URL.createObjectURL` for download) |

**You do not need to understand the app's internals.** Treat it as a black box that Vite builds into a static `dist/` folder.

---

## 2. TECHNOLOGY: TAURI 2.x

Use **Tauri 2.x** (not Tauri 1.x — the APIs and config format differ).

Tauri wraps a web app in a native OS window using the platform's built-in web renderer (WebView2 on Windows, WebKit on Mac). The result is a small (~5-10MB) native executable.

**Why Tauri over Electron:** No bundled Chromium. Much smaller binary. The app has no need for Node.js APIs or native OS features beyond a window, so Tauri's lighter approach is ideal.

---

## 3. STEP-BY-STEP INSTRUCTIONS

### Step 1: Prerequisites

Ensure the following are installed on the build machine:

**All platforms:**
- Node.js (already installed — the app builds with npm)
- Rust: Install via https://rustup.rs/
  ```bash
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
  ```

**Windows additionally:**
- Microsoft Visual Studio C++ Build Tools: https://visualstudio.microsoft.com/visual-cpp-build-tools/
- WebView2 Runtime: https://developer.microsoft.com/en-us/microsoft-edge/webview2/ (pre-installed on Windows 10 version 1803+ and Windows 11)

**Mac additionally:**
- Xcode Command Line Tools:
  ```bash
  xcode-select --install
  ```

### Step 2: Install Tauri CLI

From the project root:

```bash
npm install -D @tauri-apps/cli@latest @tauri-apps/api@latest
```

### Step 3: Initialize Tauri

```bash
npx tauri init
```

When prompted:
- **App name**: `Numenera Character Generator`
- **Window title**: `Numenera Character Generator`
- **Frontend dev URL**: `http://localhost:5173`
- **Frontend build command**: `npm run build`
- **Frontend dev command**: `npm run dev`
- **Frontend dist directory**: `../dist`

This creates a `src-tauri/` directory in the project root.

### Step 4: Configure `src-tauri/tauri.conf.json`

After initialization, verify and update the config to match this exactly. The `init` command will have generated most of it, but ensure these values are set:

```json
{
  "build": {
    "beforeBuildCommand": "npm run build",
    "beforeDevCommand": "npm run dev",
    "devUrl": "http://localhost:5173",
    "frontendDist": "../dist"
  },
  "app": {
    "title": "Numenera Character Generator",
    "windows": [
      {
        "title": "Numenera Character Generator",
        "width": 1280,
        "height": 800,
        "minWidth": 900,
        "minHeight": 600,
        "resizable": true,
        "fullscreen": false
      }
    ]
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "identifier": "com.numenera.chargen",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ]
  }
}
```

**Key settings explained:**
- `frontendDist: "../dist"` — tells Tauri where Vite puts the built files (relative to `src-tauri/`).
- `beforeBuildCommand` — Tauri runs this before packaging so the `dist/` folder is fresh.
- `width/height` — the app's wizard layout is designed for ~1280×800 minimum.
- `identifier` — reverse-domain bundle ID required for Mac `.app` signing.

### Step 5: Add npm Scripts

Add these to `package.json` under `"scripts"`. **Do not modify existing scripts** — only add new ones:

```json
{
  "scripts": {
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build"
  }
}
```

The existing `"dev"` and `"build"` scripts must remain unchanged — Tauri calls them internally.

### Step 6: Generate App Icon

Create or provide a 1024×1024 PNG image as the app icon. Place it at `src-tauri/app-icon.png`, then run:

```bash
npx tauri icon src-tauri/app-icon.png
```

This generates all required icon sizes for both platforms into `src-tauri/icons/`.

**If no custom icon is available:** Create a simple placeholder — a dark background square with a stylized "N" or a cyan/teal glyph. It can be replaced later. The icon generator needs *some* PNG to work.

### Step 7: Test in Development Mode

```bash
npm run tauri:dev
```

**Expected behavior:**
- Tauri starts the Vite dev server automatically (`npm run dev`).
- A native OS window opens showing the app.
- Hot reload works — editing source files updates the app in the window.
- The wizard navigation, stat calculations, and all UI interactions work identically to the browser version.
- **Test PDF download specifically**: Click "Download Character Sheet" at the end of the wizard. The OS native file save dialog should appear (not the browser's download bar). Save the file and verify the PDF opens correctly.

### Step 8: Build Release Executables

```bash
npm run tauri:build
```

**Expected output locations:**

| Platform | Output Path (relative to project root) | File Type |
|----------|----------------------------------------|-----------|
| Windows | `src-tauri/target/release/bundle/nsis/Numenera Character Generator_X.X.X_x64-setup.exe` | NSIS installer |
| Windows | `src-tauri/target/release/bundle/msi/Numenera Character Generator_X.X.X_x64_en-US.msi` | MSI installer |
| Mac | `src-tauri/target/release/bundle/dmg/Numenera Character Generator_X.X.X_aarch64.dmg` | DMG disk image |
| Mac | `src-tauri/target/release/bundle/macos/Numenera Character Generator.app` | App bundle |

### Step 9: Verify the Built Executable

1. **Close all dev servers and terminals.**
2. Navigate to the output directory from Step 8.
3. Double-click the installer/executable.
4. **Verify**: The app opens in a native window. No browser. No terminal.
5. **Verify**: Walk through the full wizard (select Type → Descriptor → Focus → allocate pools → choose abilities → review → download PDF).
6. **Verify**: PDF downloads via native save dialog and opens correctly.
7. **Verify**: localStorage persistence works — close the app, reopen it, and the in-progress character should still be there.

---

## 4. CROSS-PLATFORM BUILD NOTES

Tauri can only build for the **platform it is running on**. You cannot build a Windows `.exe` from a Mac or vice versa.

### Option A: Build on Each Machine (Simplest)

1. Copy the project folder to a Windows machine. Run `npm install`, then `npm run tauri:build`. Collect the `.exe`.
2. Copy the project folder to a Mac. Run `npm install`, then `npm run tauri:build`. Collect the `.dmg`.

### Option B: GitHub Actions CI/CD (Automated)

Create `.github/workflows/build.yml` in the project:

```yaml
name: Build Desktop App

on:
  push:
    tags:
      - 'v*'

jobs:
  build-tauri:
    strategy:
      fail-fast: false
      matrix:
        include:
          - platform: 'macos-latest'
            args: '--target aarch64-apple-darwin'
          - platform: 'macos-latest'
            args: '--target x86_64-apple-darwin'
          - platform: 'windows-latest'
            args: ''

    runs-on: ${{ matrix.platform }}
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: lts/*

      - name: Install Rust stable
        uses: dtolnay/rust-toolchain@stable
        with:
          targets: ${{ matrix.platform == 'macos-latest' && 'aarch64-apple-darwin,x86_64-apple-darwin' || '' }}

      - name: Install dependencies
        run: npm install

      - name: Build Tauri app
        uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          args: ${{ matrix.args }}

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: binaries-${{ matrix.platform }}
          path: |
            src-tauri/target/release/bundle/**/*.exe
            src-tauri/target/release/bundle/**/*.msi
            src-tauri/target/release/bundle/**/*.dmg
            src-tauri/target/release/bundle/**/*.app
```

**How to use:** Push a git tag like `v1.0.0`. GitHub Actions builds for Windows and Mac (Intel + Apple Silicon), and the executables appear as downloadable artifacts on the Actions run.

---

## 5. PDF DOWNLOAD BEHAVIOR IN TAURI

The existing app uses `URL.createObjectURL(blob)` with a programmatic `<a>` click to trigger PDF downloads. Inside Tauri's webview, this triggers the **native OS file save dialog** instead of the browser's download bar. This works out of the box with no code changes.

**If for any reason the download does not trigger natively**, the fallback is to use Tauri's `dialog` and `fs` APIs:

```typescript
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';

async function downloadPDF(blob: Blob, defaultName: string) {
  const path = await save({ defaultPath: defaultName, filters: [{ name: 'PDF', extensions: ['pdf'] }] });
  if (path) {
    const buffer = await blob.arrayBuffer();
    await writeFile(path, new Uint8Array(buffer));
  }
}
```

**Only use this fallback if the `URL.createObjectURL` approach fails in testing.** The simpler approach should work.

---

## 6. RESULTING PROJECT STRUCTURE

After completing all steps, the project will have these new additions (existing files unchanged):

```
numenera-chargen/
├── src-tauri/                    # NEW — Tauri desktop wrapper
│   ├── Cargo.toml                # Rust dependencies (Tauri managed, do not edit)
│   ├── Cargo.lock                # Rust lock file (auto-generated)
│   ├── tauri.conf.json           # App config (Step 4)
│   ├── build.rs                  # Build script (auto-generated by init)
│   ├── icons/                    # App icons (Step 6)
│   │   ├── 32x32.png
│   │   ├── 128x128.png
│   │   ├── 128x128@2x.png
│   │   ├── icon.icns             # Mac icon
│   │   └── icon.ico              # Windows icon
│   ├── src/
│   │   └── main.rs               # Tauri entry point (boilerplate, do not modify)
│   └── target/                   # Build output (gitignored)
│       └── release/
│           └── bundle/           # Platform-specific executables
│
├── .github/                      # NEW (optional) — CI/CD workflow
│   └── workflows/
│       └── build.yml
│
├── src/                          # UNCHANGED — existing React app
├── package.json                  # MODIFIED — two new scripts added
└── ...                           # Everything else unchanged
```

---

## 7. CHECKLIST

The task is complete when ALL of these are true:

- [ ] `src-tauri/` directory exists with valid `tauri.conf.json`
- [ ] `npm run tauri:dev` opens the app in a native window with working hot reload
- [ ] `npm run tauri:build` produces platform-specific executables without errors
- [ ] The built executable opens by double-clicking — no terminal or browser required
- [ ] Full wizard flow works inside the Tauri window (all 7 steps)
- [ ] PDF download triggers a native save dialog and produces a valid PDF
- [ ] localStorage persistence works across app close/reopen
- [ ] App icon is present (placeholder is acceptable)
- [ ] Existing `npm run dev` and `npm run build` still work unchanged for browser use
- [ ] No existing application code was modified

---

## 8. THINGS NOT TO DO

- **Do not modify any files in `src/`**. The app is complete and working.
- **Do not change the Vite config** unless absolutely required for Tauri compatibility (unlikely).
- **Do not add Tauri-specific code to the React app** unless the PDF download fallback (§5) is needed.
- **Do not change existing npm scripts** — only add new `tauri:*` scripts.
- **Do not attempt to build for a platform you are not running on.** Tauri cross-compilation is not supported. Use Option A or B from §4 for multi-platform builds.
