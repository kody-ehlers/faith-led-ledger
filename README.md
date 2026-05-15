# Faith-Led Ledger

A local React + Tauri finance app built with Vite, TypeScript, Tailwind CSS, and Zustand.

## Windows Setup

### Prerequisites

- Git
- Node.js 18+ (recommended 20+)
- pnpm
- Rust toolchain
- Visual Studio 2022 / Build Tools with "Desktop development with C++"

### Install prerequisites on Windows

1. Install Git:
   - https://git-scm.com/download/win

2. Install Node.js:
   - https://nodejs.org/
   - Use the LTS or current release.

3. Install pnpm:

```powershell
npm install -g pnpm
```

4. Install Rust and Cargo:

```powershell
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

5. Install Visual Studio Build Tools:
   - Install the "Desktop development with C++" workload.
   - Ensure MSVC, Windows SDK, and C++ CMake tools are selected.

## Clone the repository

```powershell
git clone <YOUR_REPO_URL>
cd faith-led-ledger
```

## Install dependencies

```powershell
pnpm install
```

## Run in development mode

```powershell
pnpm dev
```

This starts the Vite development server for the web app.

## Run the desktop app in development mode

```powershell
pnpm tauri dev
```

This opens the Tauri desktop app and reloads on changes.

## Build the web production bundle

```powershell
pnpm build
```

The output is placed in `dist/`.

## Build the Windows installer

```powershell
pnpm tauri build
```

This command builds the Tauri desktop application and creates a Windows installer.

If you need a specific target, you can also run:

```powershell
pnpm tauri build --target x86_64-pc-windows-msvc
```

## Useful commands

- `pnpm dev` — start Vite development server
- `pnpm build` — build production web assets
- `pnpm tauri dev` — launch the desktop app in dev mode
- `pnpm tauri build` — package the Windows desktop app installer
- `pnpm lint` — run ESLint

## Notes

- This repo uses `pnpm` because it includes `pnpm-lock.yaml`.
- `src-tauri/` contains the Tauri native configuration and Rust integration.
- Use PowerShell on Windows for the commands above.

## Troubleshooting

- If `pnpm` is not found, confirm it is installed globally and restart your terminal.
- If `cargo` is not found, ensure the Rust toolchain is installed and added to your PATH.
- If Tauri build fails on Windows, verify Visual Studio Build Tools and the Windows SDK are installed.

---

## Project technologies

- Vite
- React
- TypeScript
- Tailwind CSS
- Tauri
- Zustand
- Radix UI
- React Router
- date-fns
- Recharts
