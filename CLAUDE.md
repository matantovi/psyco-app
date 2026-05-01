# CLAUDE.md — Project Memory

Hebrew RTL psychometric (פסיכומטרי) prep app. This file is loaded into every Claude session — keep it accurate, terse, and updated when the architecture changes.

## Stack

- Next.js 15 (App Router) + React 19
- TypeScript (non-strict; `strict: false` in tsconfig)
- Tailwind CSS v4 (PostCSS plugin)
- No backend. Question generation calls `api.anthropic.com` directly from the browser via `anthropic-dangerous-direct-browser-access: true`.
- BYOK: user pastes their Anthropic API key, stored in `localStorage` under key `psych_api_key`.

## File map

```
app/
  layout.js              # root layout, lang="he" dir="rtl"
  page.tsx               # screen routing + API-key gate; quiz logic lives in useQuiz
  globals.css            # tailwind entry
components/
  Sidebar.tsx            # left nav: subject, topic, level, mode
  QuestionCard.tsx       # question + 4 answers + reveal feedback + nav
  Timer.tsx              # countdown display (urgent state when low)
data/
  questions.json         # config: practiceTotal, durations, labels (HE), chapter blueprints per subject
src/
  hooks/
    useQuiz.ts           # quiz lifecycle: state, timers, loadQuestion, scoring, StudySession save
  types/index.ts         # Question, Mode, Subject, Level, Topic, Screen, ChapterItem, AppConfig, StudySession
  data/
    config.ts            # typed wrapper around questions.json
    questions.ts         # QUESTION_PROMPTS: per-(subject,topic) prompt builders sent to Claude
    history.ts           # localStorage-backed StudySession persistence + per-topic/subject stats
psychometric-prep.html   # legacy single-file version, kept for reference; not part of build
```

## Source of Truth — domain values

```
Subjects:        verbal | math | english
Levels:          easy | medium | hard
Modes:           practice | simulation
Screens:         home | quiz | results | review

Topics by subject:
  verbal  → analogies, inference, reading, completion
  math    → algebra, percentages, geometry, probability,
            word_problems, sequences, graph, logic
  english → sentence_completion, restatement, reading, vocabulary
```

Modes:
- `practice` — single topic, `config.practiceTotal` questions, per-question timer (`questionDuration`). A question locks the moment it's answered or its timer expires.
- `simulation` — full chapter blueprint for the chosen subject, one shared `chapterDuration` timer, no per-question lock; user can navigate freely until time runs out.

## Single Source of Truth — where each value lives

| Concept | Canonical location |
|---|---|
| `Subject` / `Level` / `Topic` / `Mode` / `Screen` union types | `src/types/index.ts` |
| Hebrew display labels (subjects, topics, levels) | `data/questions.json` |
| Per-(subject,topic) prompt builders | `src/data/questions.ts` (`QUESTION_PROMPTS`) |
| Chapter blueprints for simulation mode | `data/questions.json#chapters` |
| `StudySession` shape (history persistence) | `src/types/index.ts` + `src/data/history.ts` |

**Adding a new Topic** requires updating ALL of:
1. `Topic` union in `src/types/index.ts`
2. `topicLabels` in `data/questions.json`
3. `QUESTION_PROMPTS` map in `src/data/questions.ts` (key: `` `${subject}_${topic}` ``)
4. `Sidebar.subjectTopics` in `components/Sidebar.tsx` (currently hardcoded — drift risk; eventual fix: derive from config)
5. If applicable: add to `chapters[<subject>]` in `data/questions.json` for simulation mode

**Adding a new Subject** additionally requires:
- `subjectLabels` and `subjectColors` entries in `questions.json`
- A `chapters[<subject>]` blueprint in `questions.json`
- Topic prompt builders for every topic the subject covers

## Quiz flow

`useQuiz({ apiKey })` owns mode/subject/topic/level selection plus the entire lifecycle: question loading, timers, scoring, navigation, and StudySession persistence. `app/page.tsx` is reduced to the API-key gate, screen routing, and JSX rendering.

`buildPrompt(topic, difficulty, subject)` → wraps the per-topic prompt with strict JSON schema instructions → POST to `/v1/messages` with `model: "claude-sonnet-4-5"` → parse `data.content[].text` (stripping ```json fences) → cast to `Question`.

Each generated question is stored in `questions[index]` along with `_topic` and `_difficulty` for review-screen breakdowns.

When `screen` becomes `"results"`, the hook saves a `StudySession` to `localStorage` under key `psych_history` (see `src/data/history.ts`). Save is dedup'd via a `sessionRef` so revisiting results doesn't double-save.

## Conventions

- **RTL throughout.** All UI strings are Hebrew except English-subject question prompts.
- **Path alias:** `@/*` maps to repo root. Use `@/components/...`, `@/src/types`, `@/src/data/config`, `@/src/hooks/useQuiz`.
- **State lives in hooks, not components.** `useQuiz` owns quiz state; components are presentational.
- **Tailwind palette:** zinc/violet/cyan dark theme. Urgent state = `text-red-400 animate-pulse`.
- **No external state lib** (no Redux/Zustand/etc).

## Run

```
npm install
npm run dev      # dev server on :3000
npm run build    # production build (use as baseline check before/after changes)
npm run lint     # next lint
```

The user runs the dev server locally in Cursor. Claude verifies changes with `npm run build` (TypeScript + Next compile) rather than running the dev server.

## Update policy (anti-rot rules)

- **Update CLAUDE.md in the same change as the architectural shift it describes.** Don't defer.
- **Keep the "Source of Truth" tables current.** When a new topic/subject/screen is added, update both the inline enumeration AND the propagation checklist below it.
- **When a schema persisted to localStorage changes** (e.g. `StudySession`): bump a version in `src/data/history.ts`, update the validator to drop entries that fail the new shape, and document the migration here.
- **When `app/page.tsx` is refactored** (logic moved into hooks/components), rewrite the File Map and the Quiz Flow sections in the same commit.
- **Keep total length under ~150 lines.** If a section grows beyond ~25 lines, split it into a sub-doc under `docs/<topic>.md` and link.
- **Don't list known TODOs as commitments** — keep the Known Gaps section terse and prune as items ship.

## Known gaps / TODOs

- No automated tests yet.
- `Sidebar.subjectTopics` is hardcoded — drift risk vs `topicLabels` in `questions.json`. Should derive from config.
- `Question._topic` and `_difficulty` are typed `string` but always `Topic` / `Level` at runtime. Tighten when going strict.
- API key is sent from browser. Acceptable for a personal prep tool; a `/api/generate` proxy would harden this.
- No error boundary — uncaught throws blank the screen.
- History UI (`HistorySidebar`) is not yet built; persistence works headlessly via `useQuiz`.

## Session handoffs

For workflow setup, recent decisions, gotchas (OneDrive vs git, Vercel auto-build, etc.), and the next-step plan for unbuilt features, see `docs/handoff.md`. Update it when wrapping a long working session so the next agent loads with context.
