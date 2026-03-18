# OSLab

User-friendly OSL/IRSL data processing for archaeological luminescence dating.

**Live app:** https://yelly.github.io/oslab/

---

## What it does

OSLab processes output files from the SUERC portable OSL reader running the SAR (Single Aliquot Regeneration) protocol. It takes `.sum` summary files and produces a depth-sorted table of measurements with all derived metrics and a depth profile plot.

### Processing pipeline

1. **Upload** one or more `.sum` files from a single drill site
2. **Review** samples — the app checks each label against the naming convention and flags any that don't match for you to rename, mark as a test sample, or drop
3. **Results** — replicates are averaged, all metrics are displayed in a table and a depth profile plot, and data can be exported as CSV

### Naming convention

Sample labels follow the format `{SitePrefix}{RunDepth}_{Offset}{Replicate}`, e.g.:

| Label          | Site  | Run depth | Offset | Total depth | Replicate |
| -------------- | ----- | --------- | ------ | ----------- | --------- |
| `BED40150_40a` | BED40 | 150 cm    | 40 cm  | 190 cm      | a         |
| `BED40150_40b` | BED40 | 150 cm    | 40 cm  | 190 cm      | b         |
| `BED40300_10a` | BED40 | 300 cm    | 10 cm  | 310 cm      | a         |

When multiple files from the same site are loaded, the site name is detected automatically from the common prefix of the run names. For a single file it can be entered manually.

### Computed metrics

For each sample (rows r1–r7: DARK, S1, S1, DARK, S2, S2, DARK):

| Metric         | Formula                           |
| -------------- | --------------------------------- |
| IRSL Net       | `r2 + r3 − 2·r1 − 2·r4`           |
| IRSL Front     | `r2 − r3`                         |
| IRSL Depletion | `(r2 − r1 − r4) / (r3 − r1 − r4)` |
| OSL Net        | `r5 + r6 − 2·r4 − 2·r7`           |
| OSL Front      | `r5 − r6`                         |
| OSL Depletion  | `(r5 − r4 − r7) / (r6 − r4 − r7)` |
| IRSL/OSL       | `IRSL Net / OSL Net`              |

Errors are propagated analytically. Negative dark counts are corrected by interpolation between the surrounding dark measurements before any calculations are performed. All replicates at the same depth are averaged (simple mean of values and errors).

---

## Usage

### Web

Open https://yelly.github.io/oslab/ — no installation required.

### Desktop (offline)

Download the latest release for your platform from the [Releases](../../releases) page.

### Run locally

```bash
npm install
npm run dev
```

Then open http://localhost:5173/oslab/.

---

## Development

### Commands

| Command                  | Description                      |
| ------------------------ | -------------------------------- |
| `npm run dev`            | Start dev server                 |
| `npm test`               | Run tests                        |
| `npm run build`          | Build for web (GitHub Pages)     |
| `npm run electron:dev`   | Run Electron in dev mode         |
| `npm run electron:build` | Build distributable Electron app |

### Stack

- **React 18 + TypeScript + Vite** — web app
- **Tailwind CSS** — styling
- **Recharts** — depth profile plot
- **Vitest + Testing Library** — tests
- **Electron + electron-builder** — desktop app

### Project structure

```
src/
  lib/
    parser.ts       # .sum file parsing and dark count correction
    processor.ts    # SAR metric calculations with error propagation
    naming.ts       # Sample name parsing, site detection, depth calculation
    export.ts       # CSV generation
  components/
    FileUpload.tsx
    SampleReview.tsx
    ResultsTable.tsx
    DepthPlot.tsx
electron/           # Electron main process
```

### CI/CD

- **CI** (`ci.yml`): tests + build on every push and pull request
- **Deploy** (`deploy.yml`): deploys to GitHub Pages on push to `main`

---

## Licence

MIT
