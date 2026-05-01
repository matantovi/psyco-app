# Project Handoff — psyco (Hebrew Psychometric Prep App)

> **Purpose of this file:** a complete context snapshot for handing off to a new chat session, a new agent, or a future-you. Paste this at the start of a fresh conversation and the assistant will load with everything it needs without re-discovering the project.
>
> **Canonical reference:** `CLAUDE.md` at project root. This handoff is supplementary — it captures workflow setup, recent decisions, gotchas, and recommended next steps that don't belong in CLAUDE.md.

## What this is

Hebrew RTL psychometric prep app. Next.js 15 (App Router) + React 19 + TypeScript (non-strict) + Tailwind v4. BYOK pattern — user pastes Anthropic API key into localStorage and the browser calls `api.anthropic.com` directly to generate questions.

## Where things live

- **Local:** `C:\dev\psyco` (moved out of OneDrive — see Gotchas)
- **GitHub:** `github.com/matantovi/psyco-app` (private)
- **Live:** `psyco-app.vercel.app` (Vercel auto-deploys `main` on every push)
- **Latest verified commit at time of writing:** `7caf314`, build green on Vercel

## What got built in the refactor session

1. **Workflow:** initialized git, pushed to GitHub, connected Vercel for auto-build verification.
2. **`CLAUDE.md` rewritten** with inline Subjects/Levels/Topics enumeration, Single Source of Truth file mapping, anti-rot maintenance rules.
3. **Refactor — extracted `useQuiz` hook** (`src/hooks/useQuiz.ts`, ~460 lines): owns mode/subject/topic/level, screen state, questions, answers, timers (per-question + chapter), loading/error, scoring, navigation, restart, and save-on-results. `app/page.tsx` reduced 478 → 255 lines.
4. **Headless history persistence:**
   - `StudySession`, `SessionItem`, `Screen` types added to `src/types/index.ts`.
   - `src/data/history.ts`: `loadSessions`, `saveSession`, `clearSessions`, `topicStats`, `subjectStats`, `newSessionId`, `STUDY_SESSION_VERSION = 1`, validator that drops malformed entries.
   - Save effect inside `useQuiz` fires when `screen === "results"`, deduped via `sessionRef`.
   - localStorage key: `psych_history`.
   - **No UI yet** — sessions accumulate silently, verifiable in DevTools → Application → Local Storage.
5. **`tsconfig.json`:** added `"ignoreDeprecations": "6.0"` to silence the `baseUrl` warning. Compile is fully clean.

## Critical gotchas (read before any git work)

1. **Never put a git repo in OneDrive.** OneDrive sync collides with `.git/index` writes and corrupts the index. The project was moved from `C:\Users\matnt\OneDrive\מסמכים\Claude\Projects\psyco` to `C:\dev\psyco` to fix this.
2. **Sandbox mount sync lag:** files written via the assistant's Write tool sometimes appear truncated to bash a few seconds later. Workaround: re-write via bash heredoc if compile errors point to characters past the visible end of the file.
3. **`npm run build` cannot run from the assistant's sandbox** (proxy blocks `npmjs.org`, `node_modules` has Windows SWC binary, sandbox is Linux x64). **Vercel is the build verifier** — push to `main`, watch the green/red status.
4. **Cursor "out of AI usage" ≠ Cursor unusable.** Editor and terminal still work for free; only the AI chat is gated. Use Cursor's terminal for git commands.

## Open stability findings (not yet fixed)

In priority order:

1. `Sidebar.subjectTopics` is hardcoded in `components/Sidebar.tsx` — drift risk vs `data/questions.json`. Should derive from config.
2. `Question._topic` / `_difficulty` typed as `string` but always `Topic`/`Level` at runtime. Re-type and drop the `_` prefix.
3. No React error boundary around `<main>` — uncaught throws blank the whole screen.
4. API key validation is only `startsWith("sk-")`. Could ping a 1-token request on save to verify.
5. `max_tokens: 1000` is risky for `verbal_reading` (long passages → truncated JSON → parse fail).
6. No retry on fetch failure — sim mode dead-ends on one bad question.

## Recommended next step: HistorySidebar UI

Data layer is in place and saving silently. Completing the feature is the highest user-value-per-line work right now.

### Component shape (pre-designed)

```tsx
interface HistorySidebarProps {
  sessions: StudySession[];
  onClear: () => void;
}
```

### Layout sections

- **Header:** "היסטוריה" + (N) count + clear button (with confirm).
- **Aggregate stats card:** total sessions, overall accuracy %, total time studied.
- **Recent sessions list** (last 10, newest first): relative time, mode badge, subject + topic, score, thin accuracy bar (cyan ≥70%, amber 40-70%, red <40%).
- **Per-topic accuracy table** (collapsed by default), uses `topicStats(sessions)` from `src/data/history.ts`.

### Open decision before building — layout placement on home screen

- **Option A:** third column on grid (`360px | 1fr | 320px`) — visible by default.
- **Option B:** full-width row below the existing grid.
- **Option C:** collapsible drawer that slides in from the side.

Default recommendation: **third column on desktop, stacking below on mobile.**

### Data wiring

`app/page.tsx` adds:

```tsx
const [sessions, setSessions] = useState<StudySession[]>([]);
useEffect(() => setSessions(loadSessions()), []);
```

Refresh after each save — either via a `historyVersion` ticker returned from `useQuiz`, or by reloading from localStorage every time `screen === "home"`.

## Conventions

- RTL throughout, Hebrew UI strings (English only for English-subject question prompts).
- Path alias `@/*` → repo root.
- State in hooks, not components — components stay presentational.
- Zinc/violet/cyan dark theme; urgent timer = `text-red-400 animate-pulse`.
- No external state lib (no Redux/Zustand).

## Read first

**`CLAUDE.md`** at project root — canonical project memory: stack, file map, source-of-truth tables, propagation checklists, anti-rot rules.
