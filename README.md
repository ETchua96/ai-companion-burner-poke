# Token Companion for Windows

Windows-native Pokémon-style companion for local AI usage. It watches Codex, Claude Code/Cowork, and Antigravity logs, then turns new tokens into XP for a companion selected from the player’s egg inventory.

The portable app and tray now use the original pixel-art device icon in `assets/token-companion-pokedex.ico`.

## What is included

- Windows tray app and desktop dashboard
- Read-only daily parsing of Codex, Claude Code/Cowork, and Antigravity local logs, with a per-provider summary beneath Recent activity
- Input, cache, output, and per-turn token summaries
- Persistent egg inventory: one new egg every 12 hours, hatched only when the player chooses
- Real non-final evolution families selected from the national Pokédex; final forms never evolve again
- National Pokédex index with collected and remaining counts, levels capped at 100, teams of up to six, and automatic battles using the full type chart
- Persistent Common/Uncommon/Rare/Epic/Legendary egg rolls plus an independent 1-in-4,096 shiny roll
- Six-digit two-party trades, player auto-battles, and active-companion trade evolutions with an included same-Wi-Fi relay
- Desktop notifications for new eggs and Pokédex graduation
- Optional Windows sign-in launch and configurable 15s–5min refresh interval
- English and Simplified Chinese UI; the selected language is saved locally until changed by the user
- PokéAPI-hosted animated sprites fetched at runtime (nothing Pokémon-related is packaged)
- No telemetry, API key, prompt, or response collection

## Run

```powershell
npm install
npm start
```

## Package for Windows

```powershell
npm run package
```

The app’s state lives in Electron’s Windows user-data directory. `Start over` clears only this app’s companion state, never Codex data.

## Trade relay

For laptop-to-laptop trades, host the bundled relay where both players can reach it:

```powershell
node trade-relay.js 48080
```

Enter its URL in the trade prompt, for example `http://192.168.1.25:48080` on the same Wi-Fi network. One player creates a six-digit code; the other joins with that code and chooses an offered Pokémon. Both players enter the same code again to confirm. A trade expires after 10 minutes and no accounts or QR codes are used.

## Limitations of this first Windows version

It focuses on Codex rather than every provider supported by PokeTokenBar. The activity parser uses the documented local `token_count` events and deliberately ignores all prompt/response content. It uses a same-day event fingerprint to avoid replaying obvious duplicate records, but it does not yet replicate PokeTokenBar’s complete fork/rollout reconciliation or official 5-hour/weekly limit integration.

## Legal

Copyright © 2026. All rights reserved; see [LICENSE](LICENSE).

Token Companion is an unofficial, non-commercial fan companion. It is not
affiliated with, endorsed by, sponsored by, or approved by Nintendo, Game
Freak, The Pokémon Company, OpenAI, Anthropic, Google, or JetBrains. Pokémon
names, characters, and related marks remain the property of Nintendo, Game
Freak, and The Pokémon Company. See [NOTICE.md](NOTICE.md) for details.
