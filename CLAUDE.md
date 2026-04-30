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
  layout.js           # root layout, lang="he" dir="rtl"
  page.tsx            # 478-line main app — all state & flow lives here
  globals.css         # tailwind entry
components/
  Sidebar.tsx         # left nav: subject, topic, level, mode
  QuestionCard.tsx    # question + 4 answers + reveal feedback + nav
  Timer.tsx           # countdown display (urgent state when low)
data/
  questions.json      # config: practiceTotal, durations, labels (HE), chapter blueprints per subject
src/
  types/index.ts      # Question, Mode, Subject, Level, Topic, ChapterItem, AppConfig
  data/
    config.ts         # typed wrapper around questions.json
    questions.ts      # QUESTION_PROMPTS: per-(subject,topic) prompt builders sent to Claude
psychometric-prep.html # legacy single-file version, kept for reference; not part of build
```

## Domain model

- **Subjects:** `verbal` | `math` | `english`
- **Modes:**
  - `practice` — single topic, `config.practiceTotal` questions, per-question timer (`questionDuration`), each question locks once answered or time expires.
  - `simulation` — full chapter for the chosen subject, single chapter timer (`chapterDuration`), no per-question lock.
- **Screens:** `home` → `quiz` → `results` → `review`.
- **Topics:** enumerated in `src/types/index.ts`. Each has a Hebrew label in `questions.json#topicLabels` and a prompt builder in `src/data/questions.ts` keyed `${subject}_${topic}`.

## Question generation flow

`buildPrompt(topic, difficulty, subject)` → wraps the per-topic prompt with strict JSON schema instructions → POST to `/v1/messages` with `model: "claude-sonnet-4-5"` → parse `data.content[].text` (stripping ```json fences) → cast to `Question`.

Each generated question is stored in `questions[index]` along with `_topic` and `_difficulty` for review-screen breakdowns.

## Conventions

- **RTL throughout.** All UI strings are Hebrew except English-subject question prompts.
- **Path alias:** `@/*` maps to repo root. Use `@/components/...`, `@/src/types`, `@/src/data/config`.
- **No external state lib.** All state is `useState` inside `app/page.tsx`. Refs for timers (`questionTimerRef`, `chapterTimerRef`).
- **Tailwind palette:** zinc/violet/cyan dark theme. Urgent state = `text-red-400 animate-pulse`.
- **Components are presentational.** All logic stays in `page.tsx`. If logic grows, prefer a custom hook in `src/hooks/` over moving it into a component.

## Run

```
npm install
npm run dev      # dev server on :3000
npm run build    # production build (use as baseline check before/after changes)
npm run lint     # next lint
```

## Workflow notes

- The project lives inside OneDrive (`C:\Users\matnt\OneDrive\מסמכים\Claude\Projects\psyco`). OneDrive sync occasionally collides with git index writes. If `git` reports `index file corrupt` or a stuck `.git/index.lock`, the user has to delete those from a Windows terminal — the Linux sandbox can't override OneDrive locks. Long-term consider moving to a non-synced folder.
- The user runs the dev server locally in Cursor. Claude verifies changes with `npm run build` (TypeScript + Next compile) rather than running the dev server.

## Known gaps / TODOs

- No automated tests yet.
- No persistence of practice results across sessions (would be next obvious feature: localStorage history of attempts per topic).
- `app/page.tsx` is the entire app — at ~480 lines it's the natural seam for refactoring into hooks (`useQuiz`, `useTimers`, `useQuestionLoader`).
- API key is sent from browser. Acceptable for a personal prep tool, not for production. A `/api/generate` route would be the future-proof path.

## Update policy

When the project changes meaningfully (new screen, new subject, refactor of `page.tsx`, new dependency), update the relevant section here. Keep total length under ~150 lines.
