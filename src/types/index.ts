export interface Question {
  question: string;
  answers: string[];
  correct: number;
  explanation: string;
  _topic?: string;
  _difficulty?: string;
}

export type Mode = "practice" | "simulation";
export type Subject = "verbal" | "math" | "english";
export type Level = "easy" | "medium" | "hard";
export type Screen = "home" | "quiz" | "results" | "review";

export type Topic =
  | "analogies"
  | "inference"
  | "reading"
  | "completion"
  | "algebra"
  | "percentages"
  | "geometry"
  | "probability"
  | "word_problems"
  | "sequences"
  | "graph"
  | "logic"
  | "sentence_completion"
  | "restatement"
  | "vocabulary";

export interface ChapterItem {
  topic: Topic;
  difficulty: Level;
}

export interface AppConfig {
  practiceTotal: number;
  chapterDuration: number;
  questionDuration: number;
  levels: Record<Level, string>;
  topicLabels: Record<Topic, string>;
  subjectLabels: Record<Subject, string>;
  subjectColors: Record<Subject, string>;
  chapters: Record<Subject, ChapterItem[]>;
}

export interface StudySession {
  id: string;
  startedAt: number;
  completedAt: number;
  durationSeconds: number;
  mode: Mode;
  subject: Subject;
  topic?: Topic;
  level?: Level;
  totalQuestions: number;
  correct: number;
  wrong: number;
  skipped: number;
  score: number;
  itemBreakdown?: SessionItem[];
}

export interface SessionItem {
  topic: Topic;
  level: Level;
  answered: boolean;
  correct: boolean;
}
