export default function ResultStatusBadge({ status }) {
  const normalized = String(status || "PENDING").toUpperCase();

  if (normalized === "PASS") {
    return (
      <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[9px] font-black text-emerald-700">
        PASS
      </span>
    );
  }

  if (normalized === "FAIL") {
    return (
      <span className="rounded-full bg-red-50 px-3 py-1.5 text-[9px] font-black text-red-700">
        FAIL
      </span>
    );
  }

  return (
    <span className="rounded-full bg-amber-50 px-3 py-1.5 text-[9px] font-black text-amber-700">
      PENDING
    </span>
  );
}
