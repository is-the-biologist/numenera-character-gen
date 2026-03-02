# Numenera Character Generator

A step-by-step character creation wizard for **Numenera 2E** (Discovery + Destiny). Walks you through the full build process — Type, Descriptor, Focus, stat allocation, abilities, equipment — and exports a downloadable PDF character sheet.

Built for private use by a small TTRPG group.

## Features

- **7-step guided wizard**: Type, Descriptor, Focus, Pool Allocation, Abilities, Skills, Review & Export
- **Complete SRD data**: 6 Types (Glaive, Nano, Jack, Arkus, Delve, Wright), 96 Descriptors, 30+ Foci
- **Automatic stat calculation**: Pools, Edge, skills, and inabilities computed from your choices
- **Conflict resolution**: Overlapping trained skills upgrade to specialized; descriptor inabilities applied correctly
- **PDF export**: Generates a filled character sheet you can save or print
- **Persistent state**: Your in-progress character is saved to localStorage — close the tab and come back later
- **Desktop app**: Available as a native Mac or Windows application via Tauri

## Download the Desktop App

Pre-built desktop installers are available from GitHub Actions. No terminal, Node.js, or developer tools needed.

### Step 1: Go to the latest build

Go to the **Actions** tab on GitHub:

https://github.com/is-the-biologist/numenera-character-gen/actions

Click the most recent successful **"Build Desktop App"** run (green checkmark).

### Step 2: Download your platform's artifact

Scroll to the **Artifacts** section at the bottom of the run page. Download the one for your platform:

| Artifact | Platform | What's inside |
|----------|----------|---------------|
| `binaries-macos-latest-0` | Mac (Apple Silicon — M1/M2/M3/M4) | `.dmg` installer |
| `binaries-macos-latest-1` | Mac (Intel) | `.dmg` installer |
| `binaries-windows-latest-2` | Windows | `.exe` NSIS installer + `.msi` installer |

### Step 3: Install and run

**Mac:**
1. Unzip the downloaded file.
2. Open the `.dmg` file.
3. Drag **Numenera Character Generator** to your Applications folder.
4. Double-click to launch.
5. If macOS says the app is from an unidentified developer: go to **System Settings > Privacy & Security**, scroll down, and click **Open Anyway**.

**Windows:**
1. Unzip the downloaded file.
2. Run the `.exe` installer (or `.msi` if you prefer).
3. Follow the install prompts.
4. Launch **Numenera Character Generator** from the Start Menu or Desktop shortcut.

## Run in a Browser (no install)

If you don't want the desktop app, you can run it locally in your browser:

```bash
cd numenera-chargen
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI | React 19, TypeScript 5, Tailwind CSS 4 |
| State | Zustand with localStorage persistence |
| PDF | @react-pdf/renderer (client-side) |
| Build | Vite 7 |
| Desktop | Tauri 2.x |
| Tests | Vitest |
| CI | GitHub Actions (builds Mac + Windows on tag push) |

## Project Structure

```
numenera-chargen/
  src/
    components/
      wizard/        # 7 wizard step components + WizardShell
      sheet/         # PDF character sheet generation
    engine/          # Pure functions: pool calc, skill resolver, assembler
    data/            # Static JSON game data (types, descriptors, foci)
    types/           # TypeScript interfaces
    store/           # Zustand store
  src-tauri/         # Tauri desktop wrapper (Rust)
  scripts/           # SRD scraping utilities
```

## Development

```bash
cd numenera-chargen
npm install
npm run dev          # Start Vite dev server
npm run test         # Run tests (14 tests)
npm run build        # Production build to dist/
```

## Triggering a New Desktop Build

Desktop builds are automated via GitHub Actions. To create new installers:

```bash
git tag v0.2.0
git push origin v0.2.0
```

The workflow builds for Mac (ARM + Intel) and Windows. Download the artifacts from the Actions tab when the run completes (~6 minutes).

## License

Private use only. Game content sourced from the Numenera 2E SRD.
