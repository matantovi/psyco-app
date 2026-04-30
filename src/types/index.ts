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
