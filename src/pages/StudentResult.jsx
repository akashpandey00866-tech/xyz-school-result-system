import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  collection,
  getDocs,
  limit,
  query,
} from "firebase/firestore";

import {
  auth,
  db,
} from "../config/firebase";

import StudentLayout from "../layouts/StudentLayout";

import {
  belongsToStudent,
  buildQrPdfResult,
  className,
  dateText,
  enrollment,
  isPublished,
  lower,
  makeConsolidatedResult,
  num,
  resultTitle,
  resultType,
  section,
  session,
  studentName,
  timeValue,
  verificationUrl,
  getSubjects,
  summarize,
} from "../utils/studentResultEngine";

/* =========================================================
   THEME
========================================================= */

const THEMES = {
  emerald: {
    primary: "#059669",
    dark: "#064e3b",
    soft: "#ecfdf5",
    text: "#047857",
  },

  blue: {
    primary: "#2563eb",
    dark: "#1e3a8a",
    soft: "#eff6ff",
    text: "#1d4ed8",
  },

  violet: {
    primary: "#7c3aed",
    dark: "#4c1d95",
    soft: "#f5f3ff",
    text: "#6d28d9",
  },

  orange: {
    primary: "#ea580c",
    dark: "#7c2d12",
    soft: "#fff7ed",
    text: "#c2410c",
  },

  rose: {
    primary: "#e11d48",
    dark: "#881337",
    soft: "#fff1f2",
    text: "#be123c",
  },
};

/* =========================================================
   HELPERS
========================================================= */

function safeNumber(value) {
  if (
    typeof value ===
    "number"
  ) {
    return Number.isFinite(
      value
    )
      ? value
      : 0;
  }

  const cleaned =
    String(
      value ?? ""
    )
      .replace(
        /[₹,\s]/g,
        ""
      )
      .replace(
        /[^0-9.-]/g,
        ""
      );

  if (!cleaned) {
    return 0;
  }

  const number =
    Number(cleaned);

  return Number.isFinite(
    number
  )
    ? number
    : 0;
}

/* =========================================================
   RESULT COMPLETENESS
   ---------------------------------------------------------
   PASS/FAIL is NOT shown until all configured
   subject marks are actually available.
========================================================= */

function isResultComplete(
  result
) {
  if (!result) {
    return false;
  }

  const subjects =
    getSubjects(
      result
    );

  if (
    !subjects.length
  ) {
    return false;
  }

  return subjects.every(
    (
      subject
    ) => {
      const maximum =
        safeNumber(
          subject.maxMarks
        );

      const obtained =
        safeNumber(
          subject.obtainedMarks
        );

      /*
       If admin has not configured a maximum,
       this subject is not ready.
      */

      if (
        maximum <= 0
      ) {
        return false;
      }

      /*
       Obtained can legitimately be 0.
       Therefore do not use truthy checks.
      */

      const marksFieldsExist =
        subject.obtainedMarks !==
          undefined &&
        subject.obtainedMarks !==
          null;

      if (
        !marksFieldsExist
      ) {
        return false;
      }

      return (
        obtained >= 0 &&
        obtained <= maximum
      );
    }
  );
}

/* =========================================================
   STATUS
========================================================= */

function statusForResult(
  result
) {
  if (
    !isResultComplete(
      result
    )
  ) {
    return "PENDING";
  }

  const summary =
    summarize(
      result
    );

  return summary.pass
    ? "PASS"
    : "FAIL";
}

/* =========================================================
   GRADE DISPLAY
========================================================= */

function gradeForResult(
  result
) {
  if (
    !isResultComplete(
      result
    )
  ) {
    return "—";
  }

  return (
    summarize(
      result
    ).grade ||
    "—"
  );
}

/* =========================================================
   FINAL CONSOLIDATION
========================================================= */

function finalConsolidation(
  results
) {
  const published =
    results.filter(
      isPublished
    );

  const annual =
    published.find(
      (item) => {
        const type =
          resultType(
            item
          );

        return (
          type ===
            "ANNUAL" ||
          type ===
            "FINAL"
        );
      }
    );

  if (
    annual
  ) {
    return {
      result: annual,
      official: true,
      ready: isResultComplete(
        annual
      ),
      exams: [],
    };
  }

  /*
   Only the first three unique
   published examinations take part
   in final consolidation.
  */

  const unique =
    [];

  const seen =
    new Set();

  published
    .sort(
      (
        a,
        b
      ) =>
        timeValue(
          a.publishedAt ||
            a.updatedAt ||
            a.createdAt
        ) -
        timeValue(
          b.publishedAt ||
            b.updatedAt ||
            b.createdAt
        )
    )
    .forEach(
      (
        item
      ) => {
        const key =
          lower(
            item.examId ||
              item.examName ||
              item.examinationName ||
              item.name ||
              item.id
          );

        if (
          !seen.has(
            key
          ) &&
          unique.length <
            3
        ) {
          seen.add(
            key
          );

          unique.push(
            item
          );
        }
      }
    );

  if (
    unique.length <
    3
  ) {
    return {
      result: null,
      official: false,
      ready: false,
      exams: unique,
    };
  }

  const complete =
    unique.every(
      isResultComplete
    );

  if (
    !complete
  ) {
    return {
      result: null,
      official: false,
      ready: false,
      exams: unique,
    };
  }

  const consolidated =
    makeConsolidatedResult(
      unique
    );

  return {
    result:
      consolidated ||
      null,

    official:
      false,

    ready:
      Boolean(
        consolidated
      ),

    exams:
      unique,
  };
}

/* =========================================================
   CARD
========================================================= */

function Card({
  children,
  className: cls = "",
}) {
  return (
    <section
      className={`rounded-3xl border border-slate-200 bg-white shadow-sm ${cls}`}
    >
      {children}
    </section>
  );
}

/* =========================================================
   STAT
========================================================= */

function Stat({
  label,
  value,
  tone = "slate",
}) {
  const tones = {
    slate:
      "bg-slate-50 text-slate-900",

    green:
      "bg-emerald-50 text-emerald-900",

    blue:
      "bg-blue-50 text-blue-900",

    violet:
      "bg-violet-50 text-violet-900",

    amber:
      "bg-amber-50 text-amber-900",

    red:
      "bg-red-50 text-red-900",

    pending:
      "bg-amber-50 text-amber-900",
  };

  return (
    <div
      className={`rounded-2xl p-4 ${
        tones[
          tone
        ] ||
        tones.slate
      }`}
    >
      <p className="text-[9px] font-black uppercase tracking-wider opacity-60">
        {label}
      </p>

      <p className="mt-1 break-words text-xl font-black">
        {value}
      </p>
    </div>
  );
}

/* =========================================================
   STATUS BADGE
========================================================= */

function StatusBadge({
  status,
}) {
  const normalized =
    String(
      status ||
        "PENDING"
    ).toUpperCase();

  if (
    normalized ===
    "PASS"
  ) {
    return (
      <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[9px] font-black text-emerald-700">
        PASS
      </span>
    );
  }

  if (
    normalized ===
    "FAIL"
  ) {
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

/* =========================================================
   RESULT TABLE
========================================================= */

function ResultTable({
  result,
  consolidated = false,
}) {
  const summary =
    consolidated
      ? result
      : summarize(
          result
        );

  const status =
    statusForResult(
      result
    );

  return (
    <div className="overflow-x-auto rounded-3xl border border-slate-200">
      <table className="w-full min-w-[1000px] border-collapse">
        <thead>
          <tr className="bg-slate-950 text-left text-[9px] font-black uppercase tracking-wider text-white">
            <th className="px-5 py-4">
              Subject
            </th>

            {consolidated ? (
              result.sourceExams?.map(
                (exam) => (
                  <th
                    key={
                      exam.id
                    }
                    className="px-4 py-4 text-center"
                  >
                    {
                      exam.title
                    }
                  </th>
                )
              )
            ) : (
              <>
                <th className="px-4 py-4 text-center">
                  Theory
                </th>

                <th className="px-4 py-4 text-center">
                  Practical
                </th>
              </>
            )}

            <th className="px-4 py-4 text-center">
              Total
            </th>

            <th className="px-4 py-4 text-center">
              %
            </th>

            <th className="px-4 py-4 text-center">
              Grade
            </th>

            <th className="px-4 py-4 text-center">
              Status
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {summary.subjects.map(
            (
              subject
            ) => {
              const rowStatus =
                subject.passed
                  ? "PASS"
                  : isResultComplete(
                      result
                    )
                    ? "FAIL"
                    : "PENDING";

              return (
                <tr
                  key={
                    subject.id
                  }
                  className="hover:bg-slate-50"
                >
                  <td className="px-5 py-4">
                    <div>
                      <p className="text-xs font-black text-slate-800">
                        {
                          subject.name
                        }
                      </p>

                      {subject.code && (
                        <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-1 text-[8px] font-black text-slate-500">
                          {
                            subject.code
                          }
                        </span>
                      )}
                    </div>
                  </td>

                  {consolidated ? (
                    subject.examRows?.map(
                      (
                        row
                      ) => (
                        <td
                          key={
                            row.examId
                          }
                          className="px-4 py-4 text-center"
                        >
                          <div className="text-[10px] font-black text-slate-700">
                            {
                              row.obtainedMarks
                            }
                            /
                            {
                              row.maxMarks
                            }
                          </div>

                          <div className="mt-1 text-[8px] font-bold text-slate-400">
                            {
                              row.grade
                            }
                          </div>
                        </td>
                      )
                    )
                  ) : (
                    <>
                      <td className="px-4 py-4 text-center text-[10px] font-bold text-slate-600">
                        {subject.theoryMax
                          ? `${subject.theory}/${subject.theoryMax}`
                          : "—"}
                      </td>

                      <td className="px-4 py-4 text-center text-[10px] font-bold text-slate-600">
                        {subject.practicalMax
                          ? `${subject.practical}/${subject.practicalMax}`
                          : "—"}
                      </td>
                    </>
                  )}

                  <td className="px-4 py-4 text-center">
                    <span className="text-sm font-black text-slate-900">
                      {
                        subject.obtainedMarks
                      }
                      /
                      {
                        subject.maxMarks
                      }
                    </span>
                  </td>

                  <td className="px-4 py-4 text-center text-xs font-black text-blue-700">
                    {isResultComplete(
                      result
                    )
                      ? `${safeNumber(
                          subject.percentage
                        ).toFixed(
                          2
                        )}%`
                      : "—"}
                  </td>

                  <td className="px-4 py-4 text-center">
                    {isResultComplete(
                      result
                    ) ? (
                      <span
                        className={`rounded-full px-2.5 py-1 text-[9px] font-black ${
                          subject.grade ===
                            "F" ||
                          !subject.passed
                            ? "bg-red-50 text-red-700"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {
                          subject.grade
                        }
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[9px] font-black text-amber-700">
                        —
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-4 text-center">
                    <StatusBadge
                      status={
                        rowStatus
                      }
                    />
                  </td>
                </tr>
              );
            }
          )}
        </tbody>

        <tfoot>
          <tr className="bg-emerald-50 text-xs font-black text-emerald-900">

            <td
              colSpan={
                consolidated
                  ? 1 +
                    (
                      result.sourceExams
                        ?.length ||
                      0
                    )
                  : 3
              }
              className="px-5 py-4"
            >
              GRAND TOTAL
            </td>

            <td className="px-4 py-4 text-center">
              {isResultComplete(
                result
              )
                ? `${num(
                    summary.obtainedMarks
                  )}/${num(
                    summary.maxMarks
                  )}`
                : "—"}
            </td>

            <td className="px-4 py-4 text-center">
              {isResultComplete(
                result
              )
                ? `${num(
                    summary.percentage
                  ).toFixed(
                    2
                  )}%`
                : "—"}
            </td>

            <td className="px-4 py-4 text-center">
              {gradeForResult(
                result
              )}
            </td>

            <td className="px-4 py-4 text-center">
              <StatusBadge
                status={
                  status
                }
              />
            </td>

          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/* =========================================================
   MAIN
========================================================= */

export default function StudentResult() {
  const navigate =
    useNavigate();

  const [student, setStudent] =
    useState(null);

  const [results, setResults] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [selectedId, setSelectedId] =
    useState("");

  const [mode, setMode] =
    useState("INDIVIDUAL");

  const [search, setSearch] =
    useState("");

  const [
    themeName,
    setThemeName,
  ] = useState(
    () =>
      localStorage.getItem(
        "studentResultTheme"
      ) ||
      "emerald"
  );

  const theme =
    THEMES[
      themeName
    ] ||
    THEMES.emerald;

  /* =======================================================
     THEME
  ======================================================= */

  useEffect(
    () => {
      localStorage.setItem(
        "studentResultTheme",
        themeName
      );

      document.documentElement.style.setProperty(
        "--student-primary",
        theme.primary
      );

      document.documentElement.style.setProperty(
        "--student-dark",
        theme.dark
      );

      document.documentElement.style.setProperty(
        "--student-soft",
        theme.soft
      );
    },
    [
      themeName,
      theme,
    ]
  );

  /* =======================================================
     LOAD AUTHENTICATED STUDENT + RESULTS
  ======================================================= */

  useEffect(
    () => {
      let active =
        true;

      async function load() {
        try {
          const user =
            auth.currentUser;

          if (
            !user
          ) {
            navigate(
              "/student-login",
              {
                replace:
                  true,
              }
            );

            return;
          }

          const studentSnapshot =
            await getDocs(
              query(
                collection(
                  db,
                  "students"
                ),
                limit(
                  1000
                )
              )
            );

          const profile =
            studentSnapshot.docs
              .map(
                (
                  item
                ) => ({
                  id:
                    item.id,

                  ...item.data(),
                })
              )
              .find(
                (
                  item
                ) =>
                  String(
                    item.uid ||
                      item.authUid ||
                      ""
                  ) ===
                    String(
                      user.uid
                    ) ||
                  lower(
                    item.email ||
                      item.accountEmail
                  ) ===
                    lower(
                      user.email
                    )
              );

          if (
            !profile
          ) {
            throw new Error(
              "Student profile not found."
            );
          }

          const resultSnapshot =
            await getDocs(
              query(
                collection(
                  db,
                  "results"
                ),
                limit(
                  2000
                )
              )
            );

          const owned =
            resultSnapshot.docs
              .map(
                (
                  item
                ) => ({
                  id:
                    item.id,

                  ...item.data(),
                })
              )
              .filter(
                (
                  item
                ) =>
                  belongsToStudent(
                    item,
                    profile
                  )
              )
              .filter(
                isPublished
              )
              .sort(
                (
                  a,
                  b
                ) =>
                  timeValue(
                    b.publishedAt ||
                      b.updatedAt ||
                      b.createdAt
                  ) -
                  timeValue(
                    a.publishedAt ||
                      a.updatedAt ||
                      a.createdAt
                  )
              );

          if (
            !active
          ) {
            return;
          }

          setStudent(
            profile
          );

          setResults(
            owned
          );

          setSelectedId(
            owned[0]?.id ||
              ""
          );
        } catch (
          loadError
        ) {
          console.error(
            "Student result load:",
            loadError
          );

          if (
            active
          ) {
            setError(
              loadError?.message ||
                "Unable to load published results."
            );
          }
        } finally {
          if (
            active
          ) {
            setLoading(
              false
            );
          }
        }
      }

      load();

      return () => {
        active =
          false;
      };
    },
    [
      navigate,
    ]
  );

  /* =======================================================
     SEARCH
  ======================================================= */

  const filteredResults =
    useMemo(
      () => {
        const searchText =
          lower(
            search
          );

        if (
          !searchText
        ) {
          return results;
        }

        return results.filter(
          (
            item
          ) =>
            `${resultTitle(
              item
            )} ${resultType(
              item
            )}`
              .toLowerCase()
              .includes(
                searchText
              )
        );
      },
      [
        results,
        search,
      ]
    );

  /* =======================================================
     INDIVIDUAL
  ======================================================= */

  const individualResult =
    useMemo(
      () =>
        filteredResults.find(
          (
            item
          ) =>
            item.id ===
            selectedId
        ) ||
        filteredResults[0] ||
        null,
      [
        filteredResults,
        selectedId,
      ]
    );

  /* =======================================================
     FINAL RESULT
  ======================================================= */

  const finalModel =
    useMemo(
      () =>
        finalConsolidation(
          results
        ),
      [
        results,
      ]
    );

  const activeResult =
    mode ===
      "CONSOLIDATED"
      ? finalModel.result
      : individualResult;

  const activeSummary =
    activeResult
      ? summarize(
          activeResult
        )
      : null;

  const activeComplete =
    activeResult
      ? isResultComplete(
          activeResult
        )
      : false;

  const activeStatus =
    activeResult
      ? statusForResult(
          activeResult
        )
      : "PENDING";

  /* =======================================================
     QR
  ======================================================= */

  const [qr, setQr] =
    useState("");

  useEffect(
    () => {
      let cancelled =
        false;

      async function createQr() {
        if (
          !student ||
          !activeResult
        ) {
          setQr(
            ""
          );

          return;
        }

        try {
          const url =
            verificationUrl(
              activeResult,
              student
            );

          const module =
            await import(
              "qrcode"
            );

          const QRCode =
            module.default ||
            module;

          const data =
            await QRCode.toDataURL(
              url,
              {
                width:
                  240,

                margin:
                  2,

                errorCorrectionLevel:
                  "M",
              }
            );

          if (
            !cancelled
          ) {
            setQr(
              data
            );
          }
        } catch (
          qrError
        ) {
          console.error(
            "Result QR:",
            qrError
          );

          if (
            !cancelled
          ) {
            setQr(
              ""
            );
          }
        }
      }

      createQr();

      return () => {
        cancelled =
          true;
      };
    },
    [
      student,
      activeResult,
    ]
  );

  /* =======================================================
     ACTIONS
  ======================================================= */

  const downloadPdf =
    async () => {
      if (
        !student ||
        !activeResult
      ) {
        return;
      }

      if (
        !activeComplete
      ) {
        setError(
          "Result PDF is available after all required marks are published."
        );

        return;
      }

      try {
        const url =
          verificationUrl(
            activeResult,
            student
          );

        const pdf =
          await buildQrPdfResult(
            student,
            activeResult,
            url
          );

        pdf.save(
          `result-${enrollment(
            student
          )}-${resultType(
            activeResult
          )
            .replace(
              /\s+/g,
              "-"
            )
            .toLowerCase()}.pdf`
        );
      } catch (
        pdfError
      ) {
        console.error(
          "Result PDF:",
          pdfError
        );

        setError(
          "Unable to create result PDF."
        );
      }
    };

  const verifyOnline =
    () => {
      if (
        !student ||
        !activeResult
      ) {
        return;
      }

      window.open(
        verificationUrl(
          activeResult,
          student
        ),
        "_blank",
        "noopener,noreferrer"
      );
    };

  const printResult =
    async () => {
      if (
        !student ||
        !activeResult ||
        !activeComplete
      ) {
        return;
      }

      try {
        const url =
          verificationUrl(
            activeResult,
            student
          );

        const pdf =
          await buildQrPdfResult(
            student,
            activeResult,
            url
          );

        const blob =
          pdf.output(
            "blob"
          );

        const objectUrl =
          URL.createObjectURL(
            blob
          );

        const popup =
          window.open(
            objectUrl,
            "_blank",
            "width=900,height=1000"
          );

        if (!popup) {
          window.alert(
            "Popup blocked. Allow popups for this portal."
          );

          URL.revokeObjectURL(
            objectUrl
          );

          return;
        }

        popup.onload =
          () => {
            popup.focus();
            popup.print();

            window.setTimeout(
              () =>
                URL.revokeObjectURL(
                  objectUrl
                ),
              5000
            );
          };
      } catch (
        printError
      ) {
        console.error(
          "Print result:",
          printError
        );

        setError(
          "Unable to prepare result for printing."
        );
      }
    };

  /* =======================================================
     LOADING
  ======================================================= */

  if (
    loading
  ) {
    return (
      <StudentLayout>
        <div className="flex min-h-[75vh] items-center justify-center bg-slate-50">
          <div className="text-center">

            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600" />

            <p className="mt-4 text-sm font-black text-slate-800">
              Loading Academic Records
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Preparing published results…
            </p>

          </div>
        </div>
      </StudentLayout>
    );
  }

  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <StudentLayout>

      <div className="min-h-screen bg-slate-50">

        <div className="mx-auto max-w-[1500px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">

          {/* HEADER */}

          <section className="overflow-hidden rounded-[30px] bg-[var(--student-dark)] p-6 text-white shadow-xl sm:p-8">

            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">

              <div className="min-w-0">

                <span className="inline-flex rounded-full bg-white/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider">
                  Academic Records • Secure
                </span>

                <h1 className="mt-4 text-3xl font-black sm:text-4xl">
                  Result Centre
                </h1>

                <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-200">
                  Each published examination remains separate.
                  The final result is consolidated only after
                  three complete examinations or an official
                  Annual/Final result is published.
                </p>

                {student && (
                  <div className="mt-5 flex flex-wrap gap-2">

                    <span className="rounded-xl bg-white/10 px-3 py-2 text-[10px] font-bold">
                      🎓{" "}
                      {studentName(
                        student
                      )}
                    </span>

                    <span className="rounded-xl bg-white/10 px-3 py-2 text-[10px] font-bold">
                      🪪{" "}
                      {enrollment(
                        student
                      )}
                    </span>

                    <span className="rounded-xl bg-white/10 px-3 py-2 text-[10px] font-bold">
                      📚{" "}
                      {className(
                        student
                      )}{" "}
                      -{" "}
                      {section(
                        student
                      )}
                    </span>

                    <span className="rounded-xl bg-white/10 px-3 py-2 text-[10px] font-bold">
                      📅{" "}
                      {session(
                        student
                      )}
                    </span>

                  </div>
                )}

              </div>

              <div className="flex flex-wrap gap-2">

                <select
                  value={
                    themeName
                  }
                  onChange={(
                    event
                  ) =>
                    setThemeName(
                      event.target
                        .value
                    )
                  }
                  className="rounded-xl border border-white/10 bg-white/10 px-3 py-3 text-xs font-black text-white outline-none backdrop-blur"
                >
                  <option
                    value="emerald"
                    className="text-slate-900"
                  >
                    Emerald
                  </option>

                  <option
                    value="blue"
                    className="text-slate-900"
                  >
                    Blue
                  </option>

                  <option
                    value="violet"
                    className="text-slate-900"
                  >
                    Violet
                  </option>

                  <option
                    value="orange"
                    className="text-slate-900"
                  >
                    Orange
                  </option>

                  <option
                    value="rose"
                    className="text-slate-900"
                  >
                    Rose
                  </option>
                </select>

                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      "/student-dashboard"
                    )
                  }
                  className="rounded-xl bg-white px-5 py-3 text-xs font-black text-slate-900"
                >
                  ← Dashboard
                </button>

              </div>

            </div>

          </section>

          {/* ERROR */}

          {error && (
            <section className="rounded-2xl border border-red-200 bg-red-50 p-4">

              <p className="text-sm font-black text-red-800">
                Result Centre
              </p>

              <p className="mt-1 text-xs text-red-700">
                {
                  error
                }
              </p>

            </section>
          )}

          {!results.length ? (
            <Card>

              <div className="p-14 text-center">

                <div className="text-5xl">
                  📄
                </div>

                <h2 className="mt-4 text-xl font-black text-slate-800">
                  No Published Result Found
                </h2>

                <p className="mx-auto mt-2 max-w-lg text-xs leading-5 text-slate-500">
                  Your result will appear automatically after
                  the school publishes it.
                </p>

              </div>

            </Card>
          ) : (
            <>
              {/* RESULT CONTROLS */}

              <Card cls="p-5">

                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">

                  <div>

                    <p className="text-[9px] font-black uppercase tracking-[.2em] text-[var(--student-primary)]">
                      Result Views
                    </p>

                    <h2 className="mt-1 text-xl font-black text-slate-900">
                      Choose Examination
                    </h2>

                  </div>

                  <div className="flex flex-col gap-2 lg:flex-row">

                    <div className="flex rounded-xl bg-slate-100 p-1">

                      <button
                        type="button"
                        onClick={() =>
                          setMode(
                            "INDIVIDUAL"
                          )
                        }
                        className={`rounded-lg px-4 py-2 text-[10px] font-black ${
                          mode ===
                          "INDIVIDUAL"
                            ? "bg-white text-[var(--student-primary)] shadow-sm"
                            : "text-slate-500"
                        }`}
                      >
                        Individual Exams
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setMode(
                            "CONSOLIDATED"
                          )
                        }
                        disabled={
                          !finalModel.result
                        }
                        className={`rounded-lg px-4 py-2 text-[10px] font-black ${
                          mode ===
                          "CONSOLIDATED"
                            ? "bg-white text-[var(--student-primary)] shadow-sm"
                            : "text-slate-500"
                        } disabled:cursor-not-allowed disabled:opacity-40`}
                      >
                        Final Result
                      </button>

                    </div>

                    <input
                      value={
                        search
                      }
                      onChange={(
                        event
                      ) =>
                        setSearch(
                          event.target
                            .value
                        )
                      }
                      placeholder="Search examination…"
                      className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold outline-none focus:border-[var(--student-primary)]"
                    />

                    {mode ===
                      "INDIVIDUAL" && (
                      <select
                        value={
                          selectedId
                        }
                        onChange={(
                          event
                        ) =>
                          setSelectedId(
                            event.target
                              .value
                          )
                        }
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black outline-none"
                      >
                        {filteredResults.map(
                          (
                            item
                          ) => (
                            <option
                              key={
                                item.id
                              }
                              value={
                                item.id
                              }
                            >
                              {
                                resultTitle(
                                  item
                                )
                              }{" "}
                              •{" "}
                              {
                                resultType(
                                  item
                                )
                              }
                            </option>
                          )
                        )}
                      </select>
                    )}

                  </div>

                </div>

                {/* 3 EXAM STATUS */}

                {mode ===
                  "CONSOLIDATED" &&
                  !finalModel.official && (
                    <div className="mt-4 rounded-2xl bg-[var(--student-soft)] p-4">

                      <p className="text-[9px] font-black uppercase tracking-[.2em] text-[var(--student-text)]">
                        Final Consolidation
                      </p>

                      <p className="mt-1 text-sm font-black text-slate-900">
                        {finalModel.exams.length}
                        /3 examinations published
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">

                        {finalModel.exams.map(
                          (
                            exam
                          ) => (
                            <span
                              key={
                                exam.id
                              }
                              className="rounded-full bg-white px-3 py-1.5 text-[9px] font-black text-slate-700 shadow-sm"
                            >
                              {
                                resultTitle(
                                  exam
                                )
                              }
                            </span>
                          )
                        )}

                      </div>

                      {!finalModel.ready && (
                        <p className="mt-3 text-[10px] font-bold text-amber-700">
                          Final PASS/FAIL, total and percentage will
                          remain PENDING until all three examinations
                          are complete and published.
                        </p>
                      )}

                    </div>
                  )}

              </Card>

              {/* RESULT */}

              {activeResult &&
              activeSummary ? (
                <>
                  <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">

                    <Stat
                      label="Examination"
                      value={resultTitle(
                        activeResult
                      )}
                      tone="green"
                    />

                    <Stat
                      label="Type"
                      value={
                        mode ===
                        "CONSOLIDATED"
                          ? "FINAL"
                          : resultType(
                              activeResult
                            )
                      }
                      tone="blue"
                    />

                    <Stat
                      label="Total Marks"
                      value={
                        activeComplete
                          ? `${num(
                              activeSummary.obtainedMarks
                            )}/${num(
                              activeSummary.maxMarks
                            )}`
                          : "PENDING"
                      }
                      tone={
                        activeComplete
                          ? "slate"
                          : "pending"
                      }
                    />

                    <Stat
                      label="Percentage"
                      value={
                        activeComplete
                          ? `${num(
                              activeSummary.percentage
                            ).toFixed(
                              2
                            )}%`
                          : "PENDING"
                      }
                      tone="violet"
                    />

                    <Stat
                      label="Overall Grade"
                      value={
                        activeComplete
                          ? activeSummary.grade
                          : "PENDING"
                      }
                      tone="green"
                    />

                    <Stat
                      label="Overall Rank"
                      value={
                        activeComplete
                          ? activeResult.rank ||
                            "—"
                          : "PENDING"
                      }
                      tone="amber"
                    />

                  </section>

                  {/* PENDING BANNER */}

                  {!activeComplete && (
                    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">

                      <div className="flex gap-3">

                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white">
                          ⏳
                        </div>

                        <div>

                          <p className="text-sm font-black text-amber-900">
                            Result Pending
                          </p>

                          <p className="mt-1 text-[10px] leading-5 text-amber-800">
                            All required marks for this examination
                            have not been completely published yet.
                            Until then PASS/FAIL, final grade and
                            percentage will remain pending.
                          </p>

                        </div>

                      </div>

                    </section>
                  )}

                  <Card cls="p-6">

                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">

                      <div>

                        <p className="text-[9px] font-black uppercase tracking-[.2em] text-[var(--student-primary)]">
                          Structured Mark Sheet
                        </p>

                        <h2 className="mt-1 text-2xl font-black text-slate-900">
                          {
                            resultTitle(
                              activeResult
                            )
                          }
                        </h2>

                        <p className="mt-1 text-xs text-slate-500">
                          {
                            studentName(
                              student
                            )
                          }{" "}
                          •{" "}
                          {
                            className(
                              student
                            )
                          }{" "}
                          -{" "}
                          {
                            section(
                              student
                            )
                          }{" "}
                          •{" "}
                          {
                            session(
                              student
                            )
                          }
                        </p>

                      </div>

                      <div className="flex flex-wrap gap-2">

                        <StatusBadge
                          status={
                            activeStatus
                          }
                        />

                        {activeComplete && (
                          <>
                            <button
                              type="button"
                              onClick={
                                verifyOnline
                              }
                              className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-[10px] font-black text-violet-700"
                            >
                              🔐 Verify
                            </button>

                            <button
                              type="button"
                              onClick={
                                printResult
                              }
                              className="rounded-xl bg-slate-900 px-4 py-3 text-[10px] font-black text-white"
                            >
                              🖨️ Print
                            </button>

                            <button
                              type="button"
                              onClick={
                                downloadPdf
                              }
                              className="rounded-xl bg-[var(--student-primary)] px-4 py-3 text-[10px] font-black text-white"
                            >
                              ⬇️ Download PDF
                            </button>
                          </>
                        )}

                      </div>

                    </div>

                    <div className="mt-6">

                      <ResultTable
                        result={
                          activeResult
                        }
                        consolidated={
                          mode ===
                          "CONSOLIDATED"
                        }
                      />

                    </div>

                  </Card>

                  {/* COMPONENT TOTALS */}

                  <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

                    <Stat
                      label="Theory"
                      value={
                        activeComplete
                          ? `${num(
                              activeSummary.theoryObtained
                            )}/${num(
                              activeSummary.theoryMaximum
                            )}`
                          : "PENDING"
                      }
                    />

                    <Stat
                      label="Practical"
                      value={
                        activeComplete
                          ? `${num(
                              activeSummary.practicalObtained
                            )}/${num(
                              activeSummary.practicalMaximum
                            )}`
                          : "PENDING"
                      }
                      tone="blue"
                    />

                    <Stat
                      label="Internal"
                      value={
                        activeComplete
                          ? `${num(
                              activeSummary.internalObtained
                            )}/${num(
                              activeSummary.internalMaximum
                            )}`
                          : "PENDING"
                      }
                      tone="violet"
                    />

                    <Stat
                      label="Project"
                      value={
                        activeComplete
                          ? `${num(
                              activeSummary.projectObtained
                            )}/${num(
                              activeSummary.projectMaximum
                            )}`
                          : "PENDING"
                      }
                      tone="amber"
                    />

                  </section>

                  {/* VERIFICATION */}

                  <section className="grid gap-6 lg:grid-cols-[1fr_320px]">

                    <Card cls="p-6">

                      <p className="text-[9px] font-black uppercase tracking-[.2em] text-[var(--student-primary)]">
                        Result Information
                      </p>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">

                        <Stat
                          label="Division"
                          value={
                            activeComplete
                              ? activeSummary.division
                              : "PENDING"
                          }
                        />

                        <Stat
                          label="Passed Subjects"
                          value={
                            activeComplete
                              ? activeSummary.passedSubjects
                              : "PENDING"
                          }
                          tone="green"
                        />

                        <Stat
                          label="Failed Subjects"
                          value={
                            activeComplete
                              ? activeSummary.failedSubjects.length
                              : "PENDING"
                          }
                          tone={
                            activeComplete &&
                            activeSummary
                              .failedSubjects
                              .length
                              ? "red"
                              : "green"
                          }
                        />

                        <Stat
                          label="Result Status"
                          value={
                            activeComplete
                              ? activeStatus
                              : "PENDING"
                          }
                          tone={
                            activeComplete
                              ? activeStatus ===
                                "PASS"
                                ? "green"
                                : "red"
                              : "pending"
                          }
                        />

                      </div>

                    </Card>

                    <Card cls="p-5 text-center">

                      <p className="text-[9px] font-black uppercase tracking-[.2em] text-violet-600">
                        Document Verification
                      </p>

                      {activeComplete &&
                      qr ? (
                        <img
                          src={
                            qr
                          }
                          alt="Result verification QR"
                          className="mx-auto mt-4 h-44 w-44 rounded-xl border border-slate-200 bg-white p-2"
                        />
                      ) : (
                        <div className="mx-auto mt-4 flex h-44 w-44 items-center justify-center rounded-xl bg-slate-50 text-[10px] font-black text-slate-400">
                          {activeComplete
                            ? "Generating QR…"
                            : "QR available after completion"}
                        </div>
                      )}

                      <p className="mt-3 text-[9px] leading-4 text-slate-500">
                        The QR opens the verification record
                        for this published result.
                      </p>

                    </Card>

                  </section>
                </>
              ) : (
                <Card>

                  <div className="p-12 text-center">

                    <div className="text-5xl">
                      ⏳
                    </div>

                    <h2 className="mt-4 text-xl font-black text-slate-800">
                      Final Result Pending
                    </h2>

                    <p className="mx-auto mt-2 max-w-xl text-xs leading-5 text-slate-500">
                      Three complete examinations are required
                      before the consolidated result is generated,
                      unless the school publishes an official
                      Annual/Final result.
                    </p>

                  </div>

                </Card>
              )}

            </>
          )}

        </div>
      </div>

    </StudentLayout>
  );
}