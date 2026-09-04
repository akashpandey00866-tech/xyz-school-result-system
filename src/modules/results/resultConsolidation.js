import {
  isPublished,
  lower,
  makeConsolidatedResult,
  resultType,
  timeValue,
} from "../../utils/studentResultEngine";

import { isResultComplete } from "./resultCompletion";

export function finalConsolidation(results) {
  const published = results.filter(isPublished);

  const annual = published.find((item) => {
    const type = resultType(item);
    return type === "ANNUAL" || type === "FINAL";
  });

  if (annual) {
    return {
      result: annual,
      official: true,
      ready: isResultComplete(annual),
      exams: [],
    };
  }

  const unique = [];
  const seen = new Set();

  published
    .sort(
      (a, b) =>
        timeValue(
          a.publishedAt || a.updatedAt || a.createdAt
        ) -
        timeValue(
          b.publishedAt || b.updatedAt || b.createdAt
        )
    )
    .forEach((item) => {
      const key = lower(
        item.examId ||
          item.examName ||
          item.examinationName ||
          item.name ||
          item.id
      );

      if (!seen.has(key) && unique.length < 3) {
        seen.add(key);
        unique.push(item);
      }
    });

  if (unique.length < 3) {
    return {
      result: null,
      official: false,
      ready: false,
      exams: unique,
    };
  }

  const complete = unique.every(isResultComplete);

  if (!complete) {
    return {
      result: null,
      official: false,
      ready: false,
      exams: unique,
    };
  }

  const consolidated = makeConsolidatedResult(unique);

  return {
    result: consolidated || null,
    official: false,
    ready: Boolean(consolidated),
    exams: unique,
  };
}
