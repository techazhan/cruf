# Cruf — Publishing Guide

## Your Cruf project is complete and ready to share.
Here's how to get it onto the internet so anyone can download it.

---

## ⚡ Quickest: Share the Self-Contained Installer

The file **`install-cruf.ps1`** (481 KB) is a single file that contains the entire Cruf project. Share it however you like:

- **Email** it as an attachment
- **Drop it in Slack/Discord**
- **Upload to Google Drive / Dropbox**
- **Share on a USB drive**

Anyone receiving it just runs:
```powershell
powershell -ExecutionPolicy Bypass -File install-cruf.ps1
```

That's it. Node.js + npm get installed automatically if missing.

---

## 📦 Publish to npm (Recommended)

This lets people install with `npm install -g cruf`.

**Step 1:** Create an npm account
```
https://www.npmjs.com/signup
```

**Step 2:** Login from your terminal
```bash
npm login
```

**Step 3:** Publish
```powershell
.\scripts\publish-npm.ps1
```

Or manually:
```bash
npm publish
```

**After publishing:**
```bash
npm install -g cruf
cruf
```

---

## 🐙 Publish to GitHub

**Step 1:** Create a GitHub Personal Access Token
- Go to https://github.com/settings/tokens
- Generate a classic token with `public_repo` scope

**Step 2:** Run the publish script
```powershell
.\scripts\publish-github.ps1 -Token "your-token-here"
```

Or manually:
```bash
git remote add origin https://github.com/YOUR_USER/cruf.git
git push -u origin master
```

**After pushing:**
```bash
git clone https://github.com/YOUR_USER/cruf.git
cd cruf
npm install
npm link
cruf
```

---

## 📎 Share the ZIP

The file **`cruf-v1.0.0.zip`** (350 KB) is a standard ZIP containing the full source.

Anyone can:
1. Download and extract
2. Open terminal in the folder
3. Run:
```bash
npm install
npm link
cruf
```

---

## 🌐 Web Installer (After GitHub/npm)

After publishing to GitHub or npm, update these files:
- `scripts/bootstrap-installer.ps1` — set `$CRUF_GITHUB_REPO` to your repo URL
- `scripts/bootstrap-installer.sh` — set `CRUF_GITHUB_REPO` to your repo URL
- `install.sh` — update the download URL
- `install.ps1` — update the download URL

Then anyone can install with a one-liner:
```bash
# macOS/Linux
curl -fsSL https://YOUR_SITE/install.sh | bash

# Windows
iwr -useb https://YOUR_SITE/install.ps1 | iex
```

---

## Project Structure

```
C:\Users\Usmani Sir\cruf\
├── bin\cruf.js                    # CLI entry point
├── src\                           # Source code (providers, tools, agents, utils)
├── scripts\                       # Publishing and installer scripts
│   ├── publish-github.ps1         # GitHub publisher
│   ├── publish-npm.ps1            # npm publisher
│   ├── generate-installer.ps1     # Build self-contained installer
│   ├── bootstrap-installer.ps1    # Small web installer (Windows)
│   └── bootstrap-installer.sh     # Small web installer (Unix)
├── install-cruf.ps1               # Self-contained installer (481 KB)
├── install.ps1                    # Standalone Windows installer
├── install.sh                     # Standalone Unix installer
├── cruf-v1.0.0.zip                # Release ZIP (350 KB)
├── .cruf.json                     # Default config
├── package.json                   # npm package
└── README.md                      # Documentation
```
