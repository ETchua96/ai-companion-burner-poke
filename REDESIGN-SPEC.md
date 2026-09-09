# Token Companion redesign specification

## Understanding summary

- Same-Wi-Fi multiplayer only for this release; no accounts or external service.
- Trading and battling use a six-digit code and the local relay.
- Inventory contains every owned Pokémon instance, including duplicates.
- Pokédex is a separate read-only progress catalog of discovered and missing species.
- Battle teams are a saved, separate selection of one to six inventory Pokémon.
- The active companion remains independent from the battle team.
- The window needs a responsive, aligned retro Pokédex interface.

## Assumptions

- The relay host remains open while friends use the same Wi-Fi network.
- Existing saved Pokémon and teams migrate to Inventory without data loss.
- English and Simplified Chinese remain supported and persistent.

## Final design

The app uses five tabs: Home, Inventory, Pokédex, Battle, and Trade. Home contains the active companion, eggs, token activity, and settings. Inventory is instance-based and owns team assignment, trade selection, duplicate release, and Pokémon details. Pokédex is species-based only, rendered in searchable/paginated batches. Battle provides six saved team slots and explicit create/join battle panels. Trade provides host, create, join, offer review, confirmation, and status panels without browser prompts.

The UI uses a retro Pokédex treatment with cream backgrounds, deep brown text, burnt-orange calls to action, pixel sprites, and compact hard-offset shadows. Grid items use responsive minimum widths, wrapped actions, overflow-safe text, and no unbounded scroll containers.

## Error handling and validation

In-panel messages cover unavailable relays, invalid/expired/occupied codes, incomplete teams, and unavailable offers. Code expiration remains ten minutes. Validation covers syntax, trade create/join/confirm, battle create/join, saved-team limits, duplicate-release protection, plus wide and narrow visual checks.

## Decision log

| Decision | Alternatives | Reason |
| --- | --- | --- |
| Single-window tabs | Patch mixed page; separate windows | Clear responsibilities without desktop clutter. |
| Inventory separate from Pokédex | One combined collection | Makes ownership, duplicates, and completion unambiguous. |
| Explicit multiplayer screens | Prompt dialogs | Gives visible progress and recoverable errors. |
| Same-Wi-Fi relay | Internet service | Matches current scope without account or hosting work. |
| Retro Pokédex UI | Preserve dark mixed UI | Matches the companion theme and resolves alignment with a coherent system. |
