import { Level, Mode, Subject, Topic } from "@/src/types";

interface SidebarProps {
  mode: Mode;
  setMode: (mode: Mode) => void;
  selectedSubject: Subject;
  setSelectedSubject: (subject: Subject) => void;
  selectedTopic: Topic | null;
  setSelectedTopic: (topic: Topic | null) => void;
  level: Level;
  setLevel: (level: Level) => void;
  onStartPractice: () => void;
  onStartSimulation: (subject: Subject) => void;
}

export default function Sidebar({
  mode,
  setMode,
  selectedSubject,
  setSelectedSubject,
  selectedTopic,
  setSelectedTopic,
  level,
  setLevel,
  onStartPractice,
  onStartSimulation
}: SidebarProps) {
  const subjectTopics: Record<Subject, { key: Topic; label: string; icon: string }[]> = {
    verbal: [
      { key: "analogies", label: "אנלוגיות", icon: "🔗" },
      { key: "inference", label: "הבנה והסקה", icon: "🧠" },
      { key: "reading", label: "קטע קריאה", icon: "📄" },
      { key: "completion", label: "השלמת פסקה", icon: "✏️" }
    ],
    math: [
      { key: "algebra", label: "אלגברה", icon: "🔢" },
      { key: "percentages", label: "אחוזים ויחסים", icon: "💯" },
      { key: "geometry", label: "גיאומטריה", icon: "📐" },
      { key: "probability", label: "הסתברות", icon: "🎲" },
      { key: "word_problems", label: "בעיות מילוליות", icon: "📝" },
      { key: "sequences", label: "סדרות ודפוסים", icon: "🔁" },
      { key: "graph", label: "הסקה מנתונים", icon: "📊" },
      { key: "logic", label: "חשיבה לוגית", icon: "⚙️" }
    ],
    english: [
      { key: "sentence_completion", label: "Sentence Completion", icon: "📝" },
      { key: "restatement", label: "Restatement", icon: "🔄" },
      { key: "reading", label: "Reading Comprehension", icon: "📖" },
      { key: "vocabulary", label: "Vocabulary", icon: "📚" }
    ]
  };

  const levelButtons: { key: Level; label: string }[] = [
    { key: "easy", label: "קל" },
    { key: "medium", label: "בינוני" },
    { key: "hard", label: "קשה" }
  ];

  return (
    <aside className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
      <div className="mb-4 text-xs tracking-[0.2em] text-zinc-500">מכינון פסיכומטרי</div>

      <div className="mb-4 flex rounded-full bg-zinc-800 p-1 text-sm">
        <button className={`flex-1 rounded-full py-2 ${mode === "practice" ? "bg-violet-500 text-white" : "text-zinc-400"}`} onClick={() => setMode("practice")}>
          תרגול
        </button>
        <button className={`flex-1 rounded-full py-2 ${mode === "simulation" ? "bg-violet-500 text-white" : "text-zinc-400"}`} onClick={() => setMode("simulation")}>
          הדמיה
        </button>
      </div>

      {mode === "practice" ? (
        <>
          <div className="mb-4 flex flex-wrap gap-2 text-sm">
            {[
              { key: "verbal" as const, label: "📖 עברית" },
              { key: "math" as const, label: "📐 כמותי" },
              { key: "english" as const, label: "🇬🇧 אנגלית" }
            ].map((s) => (
              <button
                key={s.key}
                onClick={() => {
                  setSelectedSubject(s.key);
                  setSelectedTopic(null);
                }}
                className={`rounded-full px-3 py-1.5 ${selectedSubject === s.key ? "bg-violet-500 text-white" : "bg-zinc-800 text-zinc-300"}`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="mb-4 grid grid-cols-1 gap-2">
            {subjectTopics[selectedSubject as Subject].map((t) => (
              <button
                key={t.key}
                onClick={() => setSelectedTopic(t.key)}
                className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-right ${
                  selectedTopic === t.key ? "border-violet-400 bg-zinc-800" : "border-white/10 bg-zinc-950 text-zinc-300"
                }`}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          <div className="mb-4 flex gap-2">
            {levelButtons.map((l) => (
              <button
                key={l.key}
                onClick={() => setLevel(l.key)}
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  level === l.key ? "border-violet-500 bg-violet-500 text-white" : "border-white/10 text-zinc-300"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>

          <button
            disabled={!selectedTopic}
            onClick={onStartPractice}
            className="w-full rounded-full bg-violet-500 px-4 py-3 font-medium text-white disabled:opacity-40"
          >
            התחל אימון
          </button>
        </>
      ) : (
        <div className="space-y-2">
          {[
            { key: "verbal" as const, label: "פרק מילולי" },
            { key: "math" as const, label: "פרק כמותי" },
            { key: "english" as const, label: "פרק אנגלית" }
          ].map((c) => (
            <button
              key={c.key}
              onClick={() => {
                setSelectedSubject(c.key);
                onStartSimulation(c.key);
              }}
              className="w-full rounded-xl border border-white/10 bg-zinc-950 p-3 text-right transition hover:border-violet-400"
            >
              {c.label}
            </button>
          ))}
        </div>
      )}
    </aside>
  );
}
