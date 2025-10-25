Quest Journal

“questjournal; if your life had a progress bar.”
Site: https://quest-journal-aa356.web.app/
A small, fast, gamified personal productivity app. Build quests, earn XP, unlock achievements & perks, keep a journal and story, plan with a calendar, and play focus music—all offline-first, with optional Firebase cloud sync. Built with Vite + React, ships as Web/PWA, Windows desktop (Electron), and Android (Capacitor).

Features

Quests & Lists: Main, side, contracts, inbox; fast add/edit, completion rewards.

XP, Levels, Perks & Achievements: Earn XP per task, level up, perks apply effects; achievements hall and celebration animations.

Daily & Weekly Challenges: Templates, today/week state, and progress payouts.

Calendar & Planning: Calendar tab to visualize and manage scheduled work.

Journal & Story tabs: Capture notes and a personal narrative alongside tasks.

Music / Ambient: Built-in player and a “Tavern” vibe with Lottie animations.

Guided Tour: Non-intrusive hints via react-joyride.

Offline-first PWA: Service worker registered only in production; long-term caching for assets.

Cloud Sync: Firebase-backed auth/storage logic is modularized in sync/* and wired with useCloudSync.


## Quick Start
```bash
npm install
npm run dev           # http://localhost:5173

Build
npm run build         # outputs to /dist
npm run preview
