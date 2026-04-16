# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev              # Start Vite dev server at http://localhost:5173/oslab/
npm test                 # Run all tests (vitest run)
npm run test:watch       # Run tests in watch mode
npm run lint             # ESLint on src/
npm run format           # Prettier write
npm run build            # Web build (dist/web/, base /oslab/)
npm run electron:dev     # Run Electron in dev mode
npm run electron:build   # Build distributable Electron app
```

To run a single test file:

```bash
npx vitest run src/__tests__/parser.test.ts
```

## Architecture

### Data flow

The app is a 3-step wizard managed entirely in `src/App.tsx`:

1. **Upload** (`FileUpload`) — accepts `.sum` files, calls `parseSumFile()` from `lib/parser.ts`
2. **Review** (`SampleReview`) — user assigns an action to each sample: `'include'`, `'drop'`, `'test'`, or `{ renamed: string }`. The site name is also confirmed/entered here.
3. **Results** (`ResultsTable` + `DepthPlot`) — `processFiles()` in `App.tsx` orchestrates: filter by action → compute metrics → group replicates → average → sort by depth

### Core library modules

- **`lib/parser.ts`** — parses raw `.sum` text into `RawSample[]` (7 rows each). Runs `fixDarkRows()` to correct negative dark counts by interpolating from surrounding darks before any metric calculation.
- **`lib/processor.ts`** — `processSample()` computes all 7 metrics (IRSL net/front/depletion, OSL net/front/depletion, IRSL/OSL ratio) with error propagation via `calcSignalMetrics()`. `averageResults()` takes simple mean across replicates.
- **`lib/naming.ts`** — parses labels of the form `{runName}_{offset}{replicate}` (e.g. `BED40150_40a`). `detectSiteName()` finds the common prefix of all run names to auto-detect the site. `getTotalDepth()` = run depth + offset.
- **`lib/export.ts`** — CSV generation from processed results.

### Dual build targets

`VITE_BUILD_TARGET=electron` switches the Vite `base` from `/oslab/` to `./` for the Electron build. The `IS_ELECTRON` constant in `App.tsx` is derived from this env var. The Electron main process lives in `electron/main.ts` and is compiled separately via esbuild to `dist/compiled/`.

### Testing

Tests are in `src/__tests__/` and run in a Node environment (no DOM). They cover `parser.ts`, `processor.ts`, and `naming.ts` directly — no component tests.

### CI/CD

- `ci.yml` — runs lint, tests, and build on every push/PR
- `deploy.yml` — deploys to GitHub Pages on push to `main`
- `release.yml` — builds Electron distributables for release
