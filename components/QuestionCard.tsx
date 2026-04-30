import { Question } from "@/src/types";

const letters = ["א", "ב", "ג", "ד"];

interface QuestionCardProps {
  question?: Question;
  onAnswer: (index: number) => void;
  disabled: boolean;
  selectedIndex?: number | null;
  correctIndex?: number;
  revealResult: boolean;
  onNext: () => void;
  onPrevious: () => void;
  canNext: boolean;
  canPrevious: boolean;
}

export default function QuestionCard({
  question,
  onAnswer,
  disabled,
  selectedIndex,
  correctIndex,
  revealResult,
  onNext,
  onPrevious,
  canNext,
  canPrevious
}: QuestionCardProps) {
  if (!question) return null;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-zinc-900 p-6">
        <div className="whitespace-pre-line leading-8 text-zinc-100">{question.question}</div>
      </div>
      <div className="grid gap-3">
        {question.answers.map((answer, index) => {
          const isCorrect = revealResult && index === correctIndex;
          const isWrong = revealResult && selectedIndex === index && selectedIndex !== correctIndex;
          const isSelected = !revealResult && selectedIndex === index;
          const classes = isCorrect
            ? "border-cyan-400 bg-cyan-500/10"
            : isWrong
              ? "border-red-400 bg-red-500/10"
              : isSelected
                ? "border-violet-400 bg-zinc-800"
                : "border-white/10 bg-zinc-900 hover:border-violet-400 hover:bg-zinc-800";

          return (
            <button
              key={index}
              onClick={() => onAnswer(index)}
              disabled={disabled}
              className={`flex w-full items-center gap-3 rounded-xl border px-4 py-4 text-right transition ${classes} disabled:cursor-default`}
            >
              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-white/10 bg-zinc-800 text-xs">
                {letters[index]}
              </span>
              <span>{answer}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {canPrevious ? (
          <button onClick={onPrevious} className="rounded-full border border-white/10 px-5 py-2 text-zinc-300">
            שאלה קודמת
          </button>
        ) : null}
        {canNext ? (
          <button onClick={onNext} className="rounded-full bg-violet-500 px-5 py-2 text-white">
            שאלה הבאה
          </button>
        ) : null}
      </div>
    </div>
  );
}
