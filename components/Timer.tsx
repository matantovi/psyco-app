interface TimerProps {
  value: string;
  urgent: boolean;
}

export default function Timer({ value, urgent }: TimerProps) {
  return (
    <div className={`text-3xl font-bold transition-colors ${urgent ? "text-red-400 animate-pulse" : "text-cyan-300"}`}>
      {value}
    </div>
  );
}
