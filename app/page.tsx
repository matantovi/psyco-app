"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Timer from "@/components/Timer";
import QuestionCard from "@/components/QuestionCard";
import { config } from "@/src/data/config";
import { useQuiz } from "@/src/hooks/useQuiz";
import { Level, Topic } from "@/src/types";

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

  useEffect(() => {
    try {
      const saved = localStorage.getItem(API_STORAGE_KEY);
      if (saved) {
        setApiKey(saved);
        setHasApiKey(true);
      }
    } catch {
      // ignore (e.g. Safari Private throws on getItem)
    }
  }, []);

  function saveApiKey() {
    if (!apiInput.startsWith("sk-")) {
      alert("מפתח לא תקין");
      return;
    }
    try {
      localStorage.setItem(API_STORAGE_KEY, apiInput);
    } catch {
      // ignore
    }
    setApiKey(apiInput);
    setHasApiKey(true);
  }

  const quiz = useQuiz({ apiKey });

  const {
    mode,
    setMode,
    selectedSubject,
    setSelectedSubject,
    selectedTopic,
    setSelectedTopic,
    level,
    setLevel,
    screen,
    questions,
    currentQ,
    userAnswers,
    totalQuestions,
    currentQuestion,
    selectedAnswer,
    loadingQuestion,
    error,
    revealResult,
    timer,
    scoreData,
    chapterTimeUsed,
    avgQuestionTime,
    startPractice,
    startSimulation,
    selectAnswer,
    nextQuestion,
    prevQuestion,
    restartSame,
    goHome,
    goReview,
    goResults,
    retryLoad
  } = quiz;

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
          <div><div className="text-2xl font-bold text-violet-400">{mode === "simulation" ? toClock(chapterTimeUsed) : `${avgQuestionTime}ש`}</div><div className="text-sm text-zinc-400">{mode === "simulation" ? "זמן כולל" : "זמן ממוצע"}</div></div>
        </div>
        <div className="flex justify-center gap-2">
          <button onClick={restartSame} className="rounded-full border border-violet-500 px-5 py-2 text-violet-300">עוד סיבוב</button>
          <button onClick={goHome} className="rounded-full border border-violet-500 px-5 py-2 text-violet-300">חזרה לתפריט</button>
          {mode === "simulation" ? <button onClick={goReview} className="rounded-full border border-violet-500 px-5 py-2 text-violet-300">סקירת שאלות</button> : null}
        </div>
      </main>
    );
  }

  if (screen === "review") {
    return (
      <main className="mx-auto min-h-screen max-w-4xl px-6 py-8">
        <div className="mb-5 flex items-center justify-between border-b border-white/10 pb-3">
          <h2 className="text-xl font-semibold">סקירת שאלות</h2>
          <button className="rounded-full border border-violet-500 px-4 py-2 text-violet-300" onClick={goResults}>חזרה לסיכום</button>
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
                    שאלה {index + 1} · {q._topic ? config.topicLabels[q._topic as Topic] : ""} · {q._difficulty ? config.levels[q._difficulty as Level] : ""}
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
            <Timer value={timer.value} urgent={timer.urgent} />
          </div>

          <div className="mb-6 h-1 rounded bg-white/10">
            <div className="h-1 rounded bg-gradient-to-r from-violet-500 to-cyan-400 transition-all" style={{ width: `${(currentQ / totalQuestions) * 100}%` }} />
          </div>

          {loadingQuestion ? (
            <div className="rounded-2xl border border-white/10 bg-zinc-900 p-10 text-center text-zinc-400">מייצר שאלה...</div>
          ) : error ? (
            <div className="rounded-2xl border border-red-400/40 bg-red-500/10 p-10 text-center">
              <div className="mb-3">{error}</div>
              <button className="rounded-full border border-violet-500 px-4 py-2 text-violet-300" onClick={retryLoad}>נסה שוב</button>
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
