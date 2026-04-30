"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { config } from "@/src/data/config";
import { QUESTION_PROMPTS } from "@/src/data/questions";
import { newSessionId, saveSession } from "@/src/data/history";
import {
  Level,
  Mode,
  Question,
  Screen,
  SessionItem,
  StudySession,
  Subject,
  Topic
} from "@/src/types";

function toClock(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

interface UseQuizArgs {
  apiKey: string;
}

export function useQuiz({ apiKey }: UseQuizArgs) {
  // ── Selection state (config the user chooses on the home screen) ──
  const [mode, setMode] = useState<Mode>("practice");
  const [selectedSubject, setSelectedSubject] = useState<Subject>("verbal");
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [level, setLevel] = useState<Level>("easy");

  // ── Lifecycle state ──
  const [screen, setScreen] = useState<Screen>("home");
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

  // ── Refs ──
  const questionStartRef = useRef(Date.now());
  const questionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chapterTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Set when a quiz starts; cleared after the StudySession is persisted.
  // Acts as a single-fire dedup for the results-screen save effect.
  const sessionRef = useRef<{ id: string; startedAt: number } | null>(null);

  // ── Derived ──
  const totalQuestions =
    mode === "simulation" ? config.chapters[selectedSubject].length : config.practiceTotal;
  const currentQuestion = questions[currentQ];
  const selectedAnswer = userAnswers[currentQ];

  const timer = useMemo(() => {
    if (mode === "simulation") {
      return { value: toClock(chapterTimeLeft), urgent: chapterTimeLeft <= 60 };
    }
    return {
      value: revealResult ? "—" : toClock(questionTimeLeft),
      urgent: questionTimeLeft <= 20
    };
  }, [mode, chapterTimeLeft, questionTimeLeft, revealResult]);

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

  // ── Cleanup timers on unmount ──
  useEffect(
    () => () => {
      if (questionTimerRef.current) clearInterval(questionTimerRef.current);
      if (chapterTimerRef.current) clearInterval(chapterTimerRef.current);
    },
    []
  );

  // ── Per-question timer (practice mode only) ──
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, mode, revealResult, currentQ, practiceLocked]);

  // ── Chapter timer (simulation mode only) ──
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

  // ── On question change: reset reveal state, kick off load ──
  useEffect(() => {
    if (screen !== "quiz") return;
    setRevealResult(Boolean(mode === "practice" && practiceLocked[currentQ]));
    if (mode === "practice" && !practiceLocked[currentQ]) {
      setQuestionTimeLeft(currentQ === furthestQ ? liveTimeLeft : config.questionDuration);
    }
    questionStartRef.current = Date.now();
    loadQuestion(currentQ);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, currentQ, mode]);

  // ── Save StudySession when entering results (deduped via sessionRef) ──
  useEffect(() => {
    if (screen !== "results") return;
    const sess = sessionRef.current;
    if (!sess) return;

    const completedAt = Date.now();
    const durationSeconds = Math.max(0, Math.round((completedAt - sess.startedAt) / 1000));

    const itemBreakdown: SessionItem[] = [];
    for (let i = 0; i < totalQuestions; i += 1) {
      const q = questions[i];
      if (!q) continue;
      const a = userAnswers[i];
      const itemTopic = (q._topic as Topic | undefined) ?? selectedTopic ?? undefined;
      const itemLevel = (q._difficulty as Level | undefined) ?? level;
      if (!itemTopic) continue; // shouldn't happen — defensive
      itemBreakdown.push({
        topic: itemTopic,
        level: itemLevel,
        answered: a !== null && a !== undefined,
        correct: a !== null && a !== undefined && a === q.correct
      });
    }

    const session: StudySession = {
      id: sess.id,
      startedAt: sess.startedAt,
      completedAt,
      durationSeconds,
      mode,
      subject: selectedSubject,
      topic: mode === "practice" ? selectedTopic ?? undefined : undefined,
      level: mode === "practice" ? level : undefined,
      totalQuestions,
      correct: scoreData.correct,
      wrong: scoreData.wrong,
      skipped: scoreData.skipped,
      score: scoreData.score,
      itemBreakdown
    };

    saveSession(session);
    sessionRef.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  // ── Helpers ──
  function buildPrompt(topic: Topic, difficulty: Level, subject: Subject) {
    const lv = config.levels[difficulty];
    const key = `${subject}_${topic}`;
    const promptBuilder = QUESTION_PROMPTS[key];
    const prompt = promptBuilder
      ? promptBuilder(lv)
      : `Create a psychometric question on topic: ${topic}. Level: ${lv}.`;
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

    const blueprint =
      mode === "simulation"
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
          messages: [
            {
              role: "user",
              content: buildPrompt(
                blueprint.topic as Topic,
                blueprint.difficulty as Level,
                selectedSubject
              )
            }
          ]
        })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const raw = data.content
        .map((item: { text?: string }) => item.text || "")
        .join("")
        .replace(/^```json\s*/, "")
        .replace(/```$/, "")
        .trim();
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
    sessionRef.current = null;
  }

  function startPractice() {
    if (!selectedTopic) return;
    setMode("practice");
    resetQuizState();
    sessionRef.current = { id: newSessionId(), startedAt: Date.now() };
    setScreen("quiz");
  }

  function startSimulation(subjectKey: Subject) {
    setMode("simulation");
    setSelectedSubject(subjectKey);
    resetQuizState();
    sessionRef.current = { id: newSessionId(), startedAt: Date.now() };
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
    if (mode === "practice" && !practiceLocked[currentQ] && currentQ === furthestQ) {
      setLiveTimeLeft(questionTimeLeft);
    }
    setCurrentQ((prev) => prev - 1);
  }

  function nextQuestion() {
    if (mode === "practice" && !practiceLocked[currentQ] && currentQ === furthestQ) {
      setLiveTimeLeft(questionTimeLeft);
    }
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

  function goHome() {
    setScreen("home");
  }

  function goReview() {
    setScreen("review");
  }

  function goResults() {
    setScreen("results");
  }

  function retryLoad() {
    loadQuestion(currentQ);
  }

  // ── Display values for results screen ──
  const chapterTimeUsed = config.chapterDuration - chapterTimeLeft;
  const avgQuestionTime = questionTimes.length
    ? Math.round(questionTimes.reduce((a, b) => a + b, 0) / questionTimes.length)
    : 0;

  return {
    // selection
    mode,
    setMode,
    selectedSubject,
    setSelectedSubject,
    selectedTopic,
    setSelectedTopic,
    level,
    setLevel,

    // lifecycle
    screen,
    questions,
    currentQ,
    userAnswers,
    practiceLocked,
    questionTimes,
    totalQuestions,
    currentQuestion,
    selectedAnswer,

    // status
    loadingQuestion,
    error,
    revealResult,

    // computed
    timer,
    scoreData,
    chapterTimeUsed,
    avgQuestionTime,

    // actions
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
  };
}

export type UseQuizReturn = ReturnType<typeof useQuiz>;
