# Resume-Focused Roadmap

This file tracks the work needed to turn Spotify Playlist Manager into a stronger resume project.

## Goal

Build a polished, technically credible personal project that demonstrates:
- product thinking
- thoughtful UX decisions
- clean application architecture
- persistence and mutation workflows
- resilient Spotify integration patterns

## Workstreams

### 1. Strengthen The Product Story

- [ ] Tighten the review workflow from playlist selection to confirm
- [ ] Improve empty, loading, and error states across view/review/summary modes
- [ ] Make summary and post-confirm behavior feel intentional and complete
- [ ] Refine playback and hotkey interactions so they feel reliable
- [ ] Improve visual consistency across rail, review stage, and summary

### 2. Add Standout Technical Features

- [ ] Build a dedicated review history / session history view
- [ ] Add playlist cleanup analytics and outcome insights
- [ ] Surface stronger reconciliation reporting after confirm
- [ ] Improve duplicate-target / already-in-playlist handling UX
- [ ] Expand session recovery / resume behavior

### 3. Improve Architecture Quality

- [ ] Clarify API boundaries between UI state, persistence, and Spotify writes
- [ ] Reduce coupling between review UI and confirm/write logic
- [ ] Standardize typed request/response contracts
- [ ] Document the persistence model and confirm pipeline
- [ ] Review DB schema for future extensibility

### 4. Improve Documentation

- [ ] Rewrite README around product problem, solution, and technical highlights
- [ ] Add architecture overview and flow diagram
- [ ] Add screenshots / walkthrough of key states
- [ ] Add setup instructions for auth, database, and local development
- [ ] Add a short “engineering decisions and tradeoffs” section

### 5. Add Credibility Signals

- [ ] Add focused tests around confirm / retry / reconciliation logic
- [ ] Improve structured logging and diagnostic surfaces
- [ ] Verify lint / formatting / migration workflow is clean and repeatable
- [ ] Add safer guards around failure cases in confirm and resume flows
- [ ] Review keyboard accessibility and interaction predictability

---

## Brainstorm: Strengthen The Product Story

This section is intentionally broader than the checklist above. We can use it to decide what to implement first.

### A. Make the user flow feel more complete

- Add a clearer “why review this playlist” framing in the viewer header
- Show a lightweight stats strip before review starts:
  - total tracks
  - already reviewed count for resumed sessions
  - how many tracks were loaded so far
- Make the transition from view mode to review mode feel more deliberate
- Add a clearer final success state after confirm instead of immediately dropping the user back into normal browsing

### B. Improve trust and clarity while reviewing

- Make the active track’s current decision more visually obvious
- Show whether the current track is still undecided
- Add a lightweight “selected targets” summary while in add-to-playlist mode
- Surface when a selected target already contains the track
- Make undo behavior easier to understand with clearer history messaging

### C. Improve progress visibility

- Add a stronger review progress indicator:
  - current track number
  - reviewed count
  - remaining undecided count
- Show separate counts for keep / remove / add as the session evolves
- Make resume state more obvious when reopening an in-progress session

### D. Improve result quality at the end

- Make the summary screen feel more like a true review report
- Highlight what actually changed versus what was left untouched
- Show the most recent confirm attempt more prominently than older attempts
- Add a “what happened on Spotify” section using reconciliation results

### E. Improve rough edges that make the project feel less finished

- Smooth out playback timing behavior and fallback messaging
- Make load-more behavior feel less mechanical while reviewing
- Improve error copy so it explains what the user should do next
- Standardize component spacing, density, and typography across modes

---

## Candidate Priorities For Product Story Work

If we want the highest impact first, a good order is:

1. Review progress / trust improvements
2. Better summary / post-confirm completion state
3. Stronger add-to-playlist clarity
4. Better empty/loading/error UX polish
5. Visual consistency pass

---

## Progress Log

- [x] Created resume-focused roadmap and checklist
- [ ] Selected the first “Strengthen The Product Story” improvements to implement
