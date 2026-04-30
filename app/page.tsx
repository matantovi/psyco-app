"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Timer from "@/components/Timer";
import QuestionCard from "@/components/QuestionCard";
import { config } from "@/src/data/config";
import { QUESTION_PROMPTS } from "@/src/data/questions";
import { Level, Mode, Question, Subject, Topic } from "@/src/types";

const API_STORAGE_KEY = "psych_api_key";

function toClock(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function escapeHtml(s?: string) {
  if (!s) return "";
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export default function Home() {
  const [apiKey, setApiKey] = useState("");
  const [apiInput, setApiInput] = useState("");
  const [hasApiKey, setHasApiKey] = useState(false);

  const [mode, setMode] = useState<Mode>("practice");
  const [selectedSubject, setSelectedSubject] = useState<Subject>("verbal");
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [level, setLevel] = useState<Level>("easy");

  const [screen, setScreen] = useState<"home" | "quiz" | "results" | "review">("home");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [userAnswers, setUserAnswers] = useState<(number | null | undefined)[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [furthestQ, setFurthestQ] = useState(0);
  const [practiceLocked, setPracticeLocked] = useState<boolean[]>([]);
  const [liveTimeLeft, setLiveTimeLeft] = useState(config.questionDuration);
  const [questionTimeLeft, setQuestionTimeLeft] = useState(config.questionDuration);
  const [chapterTimeLeft, setChapterTimeLeft] = useState(config.chapterDuration);
  const [questionTimes, setQuestionTimes] = useState<number[]>([]);
  const [loadingQuestion, setLoadingQuestion] = useState(false);
  const [error, setError] = useState("");
  const [revealResult, setRevealResult] = useState(false);

  const questionStartRef = useRef(Date.now());
  const questionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chapterTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalQuestions = mode === "simulation" ? config.chapters[selectedSubject].length : config.practiceTotal;
  const currentQuestion = questions[currentQ];
  const selectedAnswer = userAnswers[currentQ];

  const timerValue = mode === "simulation" ? toClock(chapterTimeLeft) : (revealResult ? "—" : toClock(questionTimeLeft));
  const timerUrgent = mode === "simulation" ? chapterTimeLeft <= 60 : questionTimeLeft <= 20;

  const scoreData = useMemo(() => {
    let score = 0;
    let correct = 0;
    let wrong = 0;
    let skipped = 0;
    for (let i = 0; i < totalQuestions; i += 1) {
      const q = questions[i];
      const a = userAnswers[i];
      if (!q || a === null || a === undefined) skipped += 1;
      else if (a === q.correct) {
        correct += 1;
        score += 10;
      } else wrong += 1;
    }
    return { score, correct, wrong, skipped };
  }, [questions, totalQuestions, userAnswers]);

  useEffect(() => {
    const saved = localStorage.getItem(API_STORAGE_KEY);
    if (saved) {
      setApiKey(saved);
      setHasApiKey(true);
    }
  }, []);

  useEffect(() => () => {
    if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    if (chapterTimerRef.current) clearInterval(chapterTimerRef.current);
  }, []);

  useEffect(() => {
    if (screen !== "quiz" || mode !== "practice" || revealResult || practiceLocked[currentQ]) return;
    if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    questionTimerRef.current = setInterval(() => {
      setQuestionTimeLeft((prev) => {
        if (prev <= 1) {
          if (questionTimerRef.current) clearInterval(questionTimerRef.current);
          timeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    };
  }, [screen, mode, revealResult, currentQ, practiceLocked]);

  useEffect(() => {
    if (screen !== "quiz" || mode !== "simulation") return;
    if (chapterTimerRef.current) clearInterval(chapterTimerRef.current);
    chapterTimerRef.current = setInterval(() => {
      setChapterTimeLeft((prev) => {
        if (prev <= 1) {
          if (chapterTimerRef.current) clearInterval(chapterTimerRef.current);
          setScreen("results");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (chapterTimerRef.current) clearInterval(chapterTimerRef.current);
    };
  }, [screen, mode]);

  function saveApiKey() {
    if (!apiInput.startsWith("sk-")) {
      alert("מפתח לא תקין");
      return;
    }
    localStorage.setItem(API_STORAGE_KEY, apiInput);
    setApiKey(apiInput);
    setHasApiKey(true);
  }

  function resetQuizState() {
    setQuestions([]);
    setUserAnswers([]);
    setCurrentQ(0);
    setFurthestQ(0);
    setPracticeLocked([]);
    setLiveTimeLeft(config.questionDuration);
    setQuestionTimeLeft(config.questionDuration);
    setChapterTimeLeft(config.chapterDuration);
    setQuestionTimes([]);
    setRevealResult(false);
    setError("");
  }

  function buildPrompt(topic: Topic, difficulty: Level, subject: Subject) {
    const lv = config.levels[difficulty];
    const key = `${subject}_${topic}`;
    const promptBuilder = QUESTION_PROMPTS[key];
    const prompt = promptBuilder ? promptBuilder(lv) : `Create a psychometric question on topic: ${topic}. Level: ${lv}.`;
    return `${prompt}
Return ONLY valid JSON:
{
  "question": "...",
  "answers": ["...", "...", "...", "..."],
  "correct": 0,
  "explanation": "..."
}`;
  }

  async function loadQuestion(index: number) {
    if (questions[index]) return;
    setLoadingQuestion(true);
    setError("");

    const blueprint = mode === "simulation"
      ? config.chapters[selectedSubject][index]
      : { topic: selectedTopic, difficulty: level };

    if (!blueprint?.topic || !blueprint?.difficulty) {
      setError("בחר נושא כדי להתחיל");
      setLoadingQuestion(false);
      return;
    }

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true"
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 1000,
          messages: [{ role: "user", content: buildPrompt(blueprint.topic, blueprint.difficulty, selectedSubject) }]
        })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const raw = data.content.map((item: { text?: string }) => item.text || "").join("").replace(/^```json\s*/, "").replace(/```$/, "").trim();
      const q = JSON.parse(raw) as Question;
      q._topic = blueprint.topic;
      q._difficulty = blueprint.difficulty;
      setQuestions((prev) => {
        const next = [...prev];
        next[index] = q;
        return next;
      });
    } catch (e) {
      const err = e as Error;
      setError(err.message || "שגיאה בטעינת שאלה");
    } finally {
      setLoadingQuestion(false);
    }
  }

  useEffect(() => {
    if (screen !== "quiz") return;
    setRevealResult(Boolean(mode === "practice" && practiceLocked[currentQ]));
    if (mode === "practice" && !practiceLocked[currentQ]) {
      setQuestionTimeLeft(currentQ === furthestQ ? liveTimeLeft : config.questionDuration);
    }
    questionStartRef.current = Date.now();
    loadQuestion(currentQ);
  }, [screen, currentQ, mode]);

  function startPractice() {
    if (!selectedTopic) return;
    setMode("practice");
    resetQuizState();
    setScreen("quiz");
  }

  function startSimulation(subjectKey: Subject) {
    setMode("simulation");
    setSelectedSubject(subjectKey);
    resetQuizState();
    setScreen("quiz");
  }

  function timeUp() {
    if (mode !== "practice" || practiceLocked[currentQ]) return;
    setPracticeLocked((prev) => {
      const next = [...prev];
      next[currentQ] = true;
      return next;
    });
    setRevealResult(true);
    setUserAnswers((prev) => {
      const next = [...prev];
      next[currentQ] = null;
      return next;
    });
    setQuestionTimes((prev) => {
      const next = [...prev];
      next[currentQ] = config.questionDuration;
      return next;
    });
    setLiveTimeLeft(config.questionDuration);
  }

  function selectAnswer(index: number) {
    const q = questions[currentQ];
    if (!q) return;
    if (mode === "practice") {
      if (practiceLocked[currentQ]) return;
      setPracticeLocked((prev) => {
        const next = [...prev];
        next[currentQ] = true;
        return next;
      });
      setRevealResult(true);
      if (questionTimerRef.current) clearInterval(questionTimerRef.current);
      const elapsed = Math.round((Date.now() - questionStartRef.current) / 1000);
      setQuestionTimes((prev) => {
        const next = [...prev];
        next[currentQ] = elapsed;
        return next;
      });
      setUserAnswers((prev) => {
        const next = [...prev];
        next[currentQ] = index;
        return next;
      });
      setLiveTimeLeft(config.questionDuration);
    } else {
      setUserAnswers((prev) => {
        const next = [...prev];
        next[currentQ] = index;
        return next;
      });
    }
  }

  function prevQuestion() {
    if (currentQ === 0) return;
    if (mode === "practice" && !practiceLocked[currentQ] && currentQ === furthestQ) setLiveTimeLeft(questionTimeLeft);
    setCurrentQ((prev) => prev - 1);
  }

  function nextQuestion() {
    if (mode === "practice" && !practiceLocked[currentQ] && currentQ === furthestQ) setLiveTimeLeft(questionTimeLeft);
    const next = currentQ + 1;
    if (next > furthestQ) setFurthestQ(next);
    if (next >= totalQuestions) {
      setScreen("results");
      return;
    }
    setCurrentQ(next);
  }

  function restartSame() {
    if (mode === "simulation") startSimulation(selectedSubject);
    else startPractice();
  }

  if (!hasApiKey) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl items-center justify-center px-6">
        <div className="w-full rounded-3xl border border-white/10 bg-zinc-900 p-8 text-center">
          <div className="mb-3 text-xs tracking-[0.2em] text-zinc-500">מכינון פסיכומטרי</div>
          <h1 className="mb-3 text-2xl font-bold">הכנס את מפתח ה-API</h1>
          <p className="mb-4 text-sm text-zinc-400">המפתח נשמר רק בדפדפן שלך.</p>
          <input
            type="password"
            value={apiInput}
            onChange={(e) => setApiInput(e.target.value)}
            placeholder="sk-ant-..."
            className="mb-3 w-full rounded-xl border border-white/10 bg-zinc-800 px-4 py-3 text-left"
            dir="ltr"
          />
          <button className="w-full rounded-full bg-violet-500 py-3 font-medium" onClick={saveApiKey}>
            המשך
          </button>
        </div>
      </main>
    );
  }

  if (screen === "results") {
    const avg = questionTimes.length ? Math.round(questionTimes.reduce((a, b) => a + b, 0) / questionTimes.length) : 0;
    const used = config.chapterDuration - chapterTimeLeft;
    return (
      <main className="mx-auto min-h-screen max-w-4xl px-6 py-10 text-center">
        <div className="mx-auto mb-6 flex h-36 w-36 flex-col items-center justify-center rounded-full border-4 border-violet-500">
          <div className="text-4xl font-bold text-violet-400">{scoreData.score}</div>
          <div className="text-xs text-zinc-400">נקודות</div>
        </div>
        <div className="mb-6 flex justify-center gap-8">
          <div><div className="text-2xl font-bold text-cyan-300">{scoreData.correct}</div><div className="text-sm text-zinc-400">נכון</div></div>
          <div><div className="text-2xl font-bold text-red-400">{scoreData.wrong}</div><div className="text-sm text-zinc-400">שגוי</div></div>
          {mode === "simulation" ? <div><div className="text-2xl font-bold text-zinc-400">{scoreData.skipped}</div><div className="text-sm text-zinc-400">דילגת</div></div> : null}
          <div><div className="text-2xl font-bold text-violet-400">{mode === "simulation" ? toClock(used) : `${avg}ש`}</div><div className="text-sm text-zinc-400">{mode === "simulation" ? "זמן כולל" : "זמן ממוצע"}</div></div>
        </div>
        <div className="flex justify-center gap-2">
          <button onClick={restartSame} className="rounded-full border border-violet-500 px-5 py-2 text-violet-300">עוד סיבוב</button>
          <button onClick={() => setScreen("home")} className="rounded-full border border-violet-500 px-5 py-2 text-violet-300">חזרה לתפריט</button>
          {mode === "simulation" ? <button onClick={() => setScreen("review")} className="rounded-full border border-violet-500 px-5 py-2 text-violet-300">סקירת שאלות</button> : null}
        </div>
      </main>
    );
  }

  if (screen === "review") {
    return (
      <main className="mx-auto min-h-screen max-w-4xl px-6 py-8">
        <div className="mb-5 flex items-center justify-between border-b border-white/10 pb-3">
          <h2 className="text-xl font-semibold">סקירת שאלות</h2>
          <button className="rounded-full border border-violet-500 px-4 py-2 text-violet-300" onClick={() => setScreen("results")}>חזרה לסיכום</button>
        </div>
        <div className="space-y-3">
          {questions.map((q, index) => {
            const userIdx = userAnswers[index];
            const isSkipped = userIdx === null || userIdx === undefined;
            const isCorrect = !isSkipped && userIdx === q.correct;
            return (
              <div key={index} className="rounded-2xl border border-white/10 bg-zinc-900 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-sm font-semibold">
                    שאלה {index + 1} · {q._topic ? config.topicLabels[q._topic] : ""} · {q._difficulty ? config.levels[q._difficulty] : ""}
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs ${isSkipped ? "bg-zinc-800 text-zinc-400" : isCorrect ? "bg-cyan-400/20 text-cyan-300" : "bg-red-500/20 text-red-300"}`}>
                    {isSkipped ? "דילגת" : isCorrect ? "נכון" : "שגוי"}
                  </span>
                </div>
                <div className="mb-2 whitespace-pre-line">{q.question}</div>
                <div className="grid gap-1">
                  {q.answers.map((ans, i) => {
                    const cls = i === q.correct ? "border-cyan-400/60 bg-cyan-500/10" : (i === userIdx && !isCorrect ? "border-red-400/60 bg-red-500/10" : "border-white/10");
                    return (
                      <div key={i} className={`rounded-lg border p-2 text-sm ${cls}`} dangerouslySetInnerHTML={{ __html: `${["א", "ב", "ג", "ד"][i]} - ${escapeHtml(ans)}` }} />
                    );
                  })}
                </div>
                <div className="mt-2 border-t border-white/10 pt-2 text-sm text-zinc-400">{q.explanation}</div>
              </div>
            );
          })}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-5 py-6">
      {screen === "home" ? (
        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <Sidebar
            mode={mode}
            setMode={setMode}
            selectedSubject={selectedSubject}
            setSelectedSubject={setSelectedSubject}
            selectedTopic={selectedTopic}
            setSelectedTopic={setSelectedTopic}
            level={level}
            setLevel={setLevel}
            onStartPractice={startPractice}
            onStartSimulation={startSimulation}
          />
          <section className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-zinc-900 p-8 text-center">
            <div className="mb-4 text-xs tracking-[0.2em] text-zinc-500">מכינון פסיכומטרי</div>
            <h1 className="mb-2 text-5xl font-bold leading-tight">תתכונן<br />כמו שצריך</h1>
            <p className="text-zinc-400">בחר מצב, נושא ורמה והתחל לענות.</p>
          </section>
        </div>
      ) : (
        <section className="mx-auto max-w-4xl">
          <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="rounded-full bg-violet-500/20 px-3 py-1 text-violet-300">
                {mode === "simulation" ? `הדמיית פרק ${config.subjectLabels[selectedSubject]}` : (selectedTopic ? config.topicLabels[selectedTopic] : "")}
              </span>
              {mode === "simulation" ? (
                <span className="rounded-full bg-zinc-800 px-2 py-1 text-zinc-400">
                  {config.levels[config.chapters[selectedSubject][currentQ]?.difficulty]}
                </span>
              ) : null}
              <span className="text-zinc-400">שאלה {currentQ + 1} מתוך {totalQuestions}</span>
            </div>
            <Timer value={timerValue} urgent={timerUrgent} />
          </div>

          <div className="mb-6 h-1 rounded bg-white/10">
            <div className="h-1 rounded bg-gradient-to-r from-violet-500 to-cyan-400 transition-all" style={{ width: `${(currentQ / totalQuestions) * 100}%` }} />
          </div>

          {loadingQuestion ? (
            <div className="rounded-2xl border border-white/10 bg-zinc-900 p-10 text-center text-zinc-400">מייצר שאלה...</div>
          ) : error ? (
            <div className="rounded-2xl border border-red-400/40 bg-red-500/10 p-10 text-center">
              <div className="mb-3">{error}</div>
              <button className="rounded-full border border-violet-500 px-4 py-2 text-violet-300" onClick={() => loadQuestion(currentQ)}>נסה שוב</button>
            </div>
          ) : (
            <>
              <QuestionCard
                question={currentQuestion}
                onAnswer={selectAnswer}
                disabled={mode === "practice" ? revealResult : false}
                selectedIndex={selectedAnswer}
                correctIndex={currentQuestion?.correct}
                revealResult={mode === "practice" ? revealResult : false}
                onNext={nextQuestion}
                onPrevious={prevQuestion}
                canPrevious={currentQ > 0}
                canNext={mode === "simulation" || revealResult}
              />
              {mode === "practice" && revealResult ? (
                <div className="mt-4 rounded-xl border border-white/10 bg-zinc-800 p-4">
                  <div className={`mb-1 text-sm font-semibold ${selectedAnswer === currentQuestion?.correct ? "text-cyan-300" : "text-red-300"}`}>
                    {selectedAnswer === currentQuestion?.correct ? "✓ נכון!" : "✗ לא נכון"}
                  </div>
                  <div className="text-sm text-zinc-300">{currentQuestion?.explanation}</div>
                </div>
              ) : null}
            </>
          )}
        </section>
      )}
    </main>
  );
}
