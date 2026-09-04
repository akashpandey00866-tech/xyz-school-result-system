export default function ResultStat({
  label,
  value,
  tone = "slate",
}) {
  const tones = {
    slate: "bg-slate-50 text-slate-900",
    green: "bg-emerald-50 text-emerald-900",
    blue: "bg-blue-50 text-blue-900",
    violet: "bg-violet-50 text-violet-900",
    amber: "bg-amber-50 text-amber-900",
    red: "bg-red-50 text-red-900",
    pending: "bg-amber-50 text-amber-900",
  };

  return (
    <div className={`rounded-2xl p-4 ${tones[tone] || tones.slate}`}>
      <p className="text-[9px] font-black uppercase tracking-wider opacity-60">
        {label}
      </p>
      <p className="mt-1 break-words text-xl font-black">
        {value}
      </p>
    </div>
  );
}
