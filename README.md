# DataFill

Text tools and fake data generator. Generates lorem ipsum, character/word counts, email, name, address, phone number, and password. The UI is available in English and Turkish.

## Requirements

- [Node.js](https://nodejs.org/) 20.9 or later (Next.js 16 requires >= 20.9)
- [pnpm](https://pnpm.io/) (recommended; `pnpm-lock.yaml` is used)

If pnpm is not installed:

```bash
npm install -g pnpm
```

## Installation

```bash
cd datafill
pnpm install
```

## Running

Development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_SITE_URL` | Canonical site address; generates absolute URLs for Open Graph, `sitemap.xml`, and `robots.txt` | `http://localhost:3000` |

In production (GitHub Pages), the deploy workflow sets `NEXT_PUBLIC_SITE_URL=https://sevilayerkan.github.io/DataFill`.

## Other commands

| Command | Description |
|--------|-------------|
| `pnpm build` | Production static export (writes to `out/`) |
| `pnpm start` | Serve the `out/` folder after a build |
| `pnpm lint` | ESLint |

If you prefer not to use pnpm, `npm install` and `npm run dev` work too.

## `ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION`

pnpm 11 refuses to install packages that were freshly published to npm (default ~24 hours). This can interrupt `pnpm install` / `pnpm dev` / `pnpm build`.

`minimumReleaseAge: 0` is defined in `pnpm-workspace.yaml` in this project. If you still get the error:

```bash
pnpm install
```

pnpm 11 asks for approval for Next.js's `sharp` package build script. Approval is granted via `allowBuilds.sharp` in the workspace file. If it is missing:

```bash
pnpm approve-builds sharp
```

## Features

- Lorem ipsum text generation (character count, whitespace/special-character options)
- Character, word, and line counter
- Email, name, address, phone number, and password generation
- Light / dark theme
- English / Turkish language support

## Project structure

A Next.js (App Router) app. `@/` points to the root directory (`paths` in `tsconfig.json`).

```
datafill/
├── app/                         # Pages and shell
│   ├── layout.tsx               # HTML shell, font, metadata (tab title)
│   ├── page.tsx                 # Home page → DataFillUI
│   └── globals.css
├── components/                  # UI
│   ├── DataFillUI.tsx           # Main screen (tabs, theme, generate)
│   ├── EmailGenerator.tsx
│   ├── NameGenerator.tsx
│   ├── AddressGenerator.tsx
│   ├── PhoneNumberGenerator.tsx
│   ├── PasswordGenerator.tsx
│   ├── MiscGenerator.tsx
│   └── ui/                      # shadcn components (button, tab, input)
├── data/en and data/tr         # Name, email, address lists
├── locales/                     # en.json / tr.json — on-screen strings
├── hooks/                       # useTranslation, toast, etc.
├── lib/utils.ts                 # className merging (cn)
├── public/                      # Static files (icons, svg)
├── package.json                 # Package name and scripts
└── README.md
```

Flow: `app/layout.tsx` → `app/page.tsx` → `DataFillUI` → tabs and generators.

## Renaming the project

The name lives in three (or four) separate places; the result depends on which one you change.

### 1. npm / pnpm package name

The `"name"` field in `package.json` (currently `datafill`). It must be lowercase with no spaces. It does not change what is shown in the browser.

```json
"name": "datafill"
```

### 2. Browser tab title

The `metadata` in `app/layout.tsx`. Example:

```ts
export const metadata = {
  title: "DataFill",
  description: "Text tools and fake data generator",
}
```

### 3. Product name shown on screen

The header in `DataFillUI.tsx` uses `t("textTools")`. The strings are in the `textTools` key in `locales/en.json` and `locales/tr.json`.

- EN: `"textTools": "DataFill"`
- TR: `"textTools": "DataFill"` (brand name is not translated)

Since these are `"DataFill"`, the brand name is shown in the header.

### 4. Folder name

Renaming the folder is enough; the code does not use folder-name-dependent imports. Also update the `cd datafill` line in this README.
