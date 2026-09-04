import { getSubjects, summarize } from "../../utils/studentResultEngine";

export function safeNumber(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const cleaned = String(value ?? "")
    .replace(/[₹,\s]/g, "")
    .replace(/[^0-9.-]/g, "");

  if (!cleaned) return 0;

  const number = Number(cleaned);
  return Number.isFinite(number) ? number : 0;
}

export function isResultComplete(result) {
  if (!result) return false;

  const subjects = getSubjects(result);
  if (!subjects.length) return false;

  return subjects.every((subject) => {
    const maximum = safeNumber(subject.maxMarks);
    const obtained = safeNumber(subject.obtainedMarks);

    if (maximum <= 0) return false;

    const marksExist =
      subject.obtainedMarks !== undefined &&
      subject.obtainedMarks !== null;

    if (!marksExist) return false;

    return obtained >= 0 && obtained <= maximum;
  });
}

export function statusForResult(result) {
  if (!isResultComplete(result)) return "PENDING";

  return summarize(result).pass ? "PASS" : "FAIL";
}

export function gradeForResult(result) {
  if (!isResultComplete(result)) return "—";
  return summarize(result).grade || "—";
}
