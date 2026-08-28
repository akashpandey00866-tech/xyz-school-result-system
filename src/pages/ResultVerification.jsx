import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  doc,
  getDoc,
} from "firebase/firestore";

import { db } from "../config/firebase";
import StudentLayout from "../layouts/StudentLayout";
import {
  dateValue,
  enrollment,
  className,
  section,
  session,
  studentName,
  examTitle,
  resultType,
  summarize,
} from "../utils/studentResultEngine";

export default function ResultVerification() {
  const [params] =
    useSearchParams();

  const resultId =
    params.get("result");

  const [data, setData] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        if (!resultId) {
          throw new Error(
            "Invalid verification link."
          );
        }

        const snap =
          await getDoc(
            doc(
              db,
              "results",
              resultId
            )
          );

        if (!snap.exists()) {
          throw new Error(
            "Published result record not found."
          );
        }

        if (!active) return;

        setData({
          id: snap.id,
          ...snap.data(),
        });
      } catch (err) {
        console.error(
          "Result verification:",
          err
        );

        if (active) {
          setError(
            err?.message ||
              "Unable to verify this result."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [resultId]);

  if (loading) {
    return (
      <StudentLayout>
        <div className="flex min-h-[75vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600" />
            <p className="mt-4 text-sm font-black">
              Verifying Document
            </p>
          </div>
        </div>
      </StudentLayout>
    );
  }

  if (error || !data) {
    return (
      <StudentLayout>
        <div className="mx-auto max-w-2xl p-6">
          <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center">
            <div className="text-4xl">
              ⚠️
            </div>
            <h1 className="mt-3 text-xl font-black text-red-800">
              Verification Failed
            </h1>
            <p className="mt-2 text-xs text-red-700">
              {error}
            </p>
          </div>
        </div>
      </StudentLayout>
    );
  }

  const summary =
    summarize(data);

  return (
    <StudentLayout>
      <div className="min-h-screen bg-slate-50 px-4 py-8">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-[30px] bg-gradient-to-br from-emerald-800 to-teal-900 p-8 text-center text-white shadow-xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl">
              ✓
            </div>

            <p className="mt-4 text-[9px] font-black uppercase tracking-[.25em] text-emerald-200">
              Document Verification
            </p>

            <h1 className="mt-2 text-3xl font-black">
              Result Verified
            </h1>

            <p className="mt-2 text-sm text-emerald-100">
              This result record exists in the school database.
            </p>
          </div>

          <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                [
                  "Student",
                  studentName(
                    data
                  ),
                ],
                [
                  "Enrollment",
                  enrollment(
                    data
                  ),
                ],
                [
                  "Class",
                  `${className(
                    data
                  )} - ${section(
                    data
                  )}`,
                ],
                [
                  "Session",
                  session(
                    data
                  ),
                ],
                [
                  "Examination",
                  examTitle(
                    data
                  ),
                ],
                [
                  "Type",
                  resultType(
                    data
                  ),
                ],
                [
                  "Percentage",
                  `${summary.percentage.toFixed(
                    2
                  )}%`,
                ],
                [
                  "Grade",
                  summary.grade,
                ],
              ].map(
                ([label, value]) => (
                  <div
                    key={label}
                    className="rounded-2xl bg-slate-50 p-4"
                  >
                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                      {label}
                    </p>
                    <p className="mt-1 text-sm font-black text-slate-800">
                      {value}
                    </p>
                  </div>
                )
              )}
            </div>

            <div className="mt-5 rounded-2xl bg-emerald-50 p-4">
              <p className="text-xs font-black text-emerald-800">
                Verification Status: AUTHENTIC RECORD
              </p>

              <p className="mt-1 text-[10px] text-slate-500">
                Published on{" "}
                {dateValue(
                  data.publishedAt ||
                    data.updatedAt ||
                    data.createdAt
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}
