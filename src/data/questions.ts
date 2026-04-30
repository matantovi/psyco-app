export const QUESTION_PROMPTS: Record<string, (levelLabel: string) => string> = {
  verbal_analogies: (lv) => `צור שאלת אנלוגיה בסגנון הפסיכומטרי הישראלי. רמה: ${lv}.`,
  verbal_inference: (lv) => `צור שאלת הבנה והסקה בסגנון הפסיכומטרי הישראלי. רמה: ${lv}.`,
  verbal_reading: (lv) => `צור קטע קריאה קצר בעברית ואז שאלה אחת. רמה: ${lv}.`,
  verbal_completion: (lv) => `צור פסקה עם חלקים חסרים ו-4 אפשרויות. רמה: ${lv}.`,
  math_algebra: (lv) => `צור שאלת אלגברה בסגנון הפסיכומטרי הישראלי. רמה: ${lv}.`,
  math_percentages: (lv) => `צור שאלה על אחוזים/יחסים/ממוצע. רמה: ${lv}.`,
  math_geometry: (lv) => `צור שאלת גיאומטריה. רמה: ${lv}.`,
  math_probability: (lv) => `צור שאלת הסתברות. רמה: ${lv}.`,
  math_word_problems: (lv) => `צור בעיה מילולית כמותית. רמה: ${lv}.`,
  math_sequences: (lv) => `צור שאלת סדרות ודפוסים. רמה: ${lv}.`,
  math_graph: (lv) => `צור שאלת הסקה מנתונים. רמה: ${lv}.`,
  math_logic: (lv) => `צור שאלת חשיבה לוגית כמותית. רמה: ${lv}.`,
  english_sentence_completion: (lv) => `Create a psychometric sentence completion question. Level: ${lv}.`,
  english_restatement: (lv) => `Create a psychometric restatement question. Level: ${lv}.`,
  english_reading: (lv) => `Create a short reading passage and one question. Level: ${lv}.`,
  english_vocabulary: (lv) => `Create a psychometric vocabulary question. Level: ${lv}.`
};
