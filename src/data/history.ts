import { StudySession, SessionItem, Subject, Topic } from "@/src/types";

export const HISTORY_STORAGE_KEY = "psych_history";

/**
 * Bump when StudySession's required field set changes. Old entries that
 * fail isValidSession are silently dropped on load — see CLAUDE.md
 * "Update policy" for the migration playbook.
 */
export const STUDY_SESSION_VERSION = 1;

const MAX_HISTORY = 100;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function isValidSessionItem(value: unknown): value is SessionItem {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.topic === "string" &&
    typeof v.level === "string" &&
    typeof v.answered === "boolean" &&
    typeof v.correct === "boolean"
  );
}

function isValidSession(value: unknown): value is StudySession {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (
    typeof v.id !== "string" ||
    typeof v.startedAt !== "number" ||
    typeof v.completedAt !== "number" ||
    typeof v.durationSeconds !== "number" ||
    (v.mode !== "practice" && v.mode !== "simulation") ||
    typeof v.subject !== "string" ||
    typeof v.totalQuestions !== "number" ||
    typeof v.correct !== "number" ||
    typeof v.wrong !== "number" ||
    typeof v.skipped !== "number" ||
    typeof v.score !== "number"
  ) {
    return false;
  }
  if (v.itemBreakdown !== undefined) {
    if (!Array.isArray(v.itemBreakdown)) return false;
    if (!v.itemBreakdown.every(isValidSessionItem)) return false;
  }
  return true;
}

export function loadSessions(): StudySession[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidSession);
  } catch {
    return [];
  }
}

export function saveSession(session: StudySession): StudySession[] {
  if (!isBrowser()) return [];
  const existing = loadSessions();
  // de-dupe by id (in case the same attempt is saved twice)
  const filtered = existing.filter((s) => s.id !== session.id);
  const updated = [session, ...filtered].slice(0, MAX_HISTORY);
  try {
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore quota errors
  }
  return updated;
}

export function clearSessions(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(HISTORY_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export interface TopicStat {
  topic: Topic;
  attempts: number;
  totalQuestions: number;
  correct: number;
  accuracy: number; // 0..1
}

export function topicStats(sessions: StudySession[]): TopicStat[] {
  const map = new Map<Topic, TopicStat>();
  for (const session of sessions) {
    if (session.mode !== "practice" || !session.topic) continue;
    const cur = map.get(session.topic) ?? {
      topic: session.topic,
      attempts: 0,
      totalQuestions: 0,
      correct: 0,
      accuracy: 0
    };
    cur.attempts += 1;
    cur.totalQuestions += session.totalQuestions;
    cur.correct += session.correct;
    cur.accuracy = cur.totalQuestions ? cur.correct / cur.totalQuestions : 0;
    map.set(session.topic, cur);
  }
  return Array.from(map.values()).sort((a, b) => b.attempts - a.attempts);
}

export interface SubjectStat {
  subject: Subject;
  attempts: number;
  totalQuestions: number;
  correct: number;
  accuracy: number;
}

export function subjectStats(sessions: StudySession[]): SubjectStat[] {
  const map = new Map<Subject, SubjectStat>();
  for (const session of sessions) {
    const cur = map.get(session.subject) ?? {
      subject: session.subject,
      attempts: 0,
      totalQuestions: 0,
      correct: 0,
      accuracy: 0
    };
    cur.attempts += 1;
    cur.totalQuestions += session.totalQuestions;
    cur.correct += session.correct;
    cur.accuracy = cur.totalQuestions ? cur.correct / cur.totalQuestions : 0;
    map.set(session.subject, cur);
  }
  return Array.from(map.values()).sort((a, b) => b.attempts - a.attempts);
}

export function newSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
