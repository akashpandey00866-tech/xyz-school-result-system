import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";

import StudentLayout from "../layouts/StudentLayout";
import { auth, db } from "../config/firebase";
import { calculateStudentFees } from "../utils/feeUtils";

/* =========================================================
   STUDENT RESULT + FEE CENTRE
   ---------------------------------------------------------
   FINAL IMPROVED VERSION

   RESULT
   - Uses published results from Admin
   - Individual exams stay separate
   - Annual appears only after 3 complete published exams
   - Annual combines the exact three exam marks
   - No fixed 100-mark assumption
   - Shows subject-wise marks, grade and status
   - Shows theory/practical/internal/project where available
   - QR verification included in UI + PDF
   - Signature and school seal included in PDF
   - Optional school settings are read from Firestore

   FEES
   - Keeps fee summary visible on result page
   - Uses calculateStudentFees()
   - Reads live feePayments
   - Keeps receipt number
   - Professional receipt PDF
   - QR verification on receipt
   - Signature + seal on receipt
========================================================= */

/* =========================================================
   THEME
========================================================= */

const THEMES = {
  emerald: {
    primary: "#059669",
    dark: "#064e3b",
    soft: "#ecfdf5",
    ring: "ring-emerald-200",
  },
  blue: {
    primary: "#2563eb",
    dark: "#1e3a8a",
    soft: "#eff6ff",
    ring: "ring-blue-200",
  },
  violet: {
    primary: "#7c3aed",
    dark: "#4c1d95",
    soft: "#f5f3ff",
    ring: "ring-violet-200",
  },
  orange: {
    primary: "#ea580c",
    dark: "#7c2d12",
    soft: "#fff7ed",
    ring: "ring-orange-200",
  },
  rose: {
    primary: "#e11d48",
    dark: "#881337",
    soft: "#fff1f2",
    ring: "ring-rose-200",
  },
};

const DEFAULT_SCHOOL_SETTINGS = {
  schoolName: "XYZ PUBLIC SCHOOL",
  schoolAddress: "",
  schoolPhone: "",
  schoolEmail: "",
  schoolWebsite: "",
  showQrOnResult: true,
  showQrOnReceipt: true,
  showSignature: true,
  showSeal: true,
  signatureImage: "",
  signatureDataUrl: "",
  sealImage: "",
  sealDataUrl: "",
};

/* =========================================================
   HELPERS
========================================================= */

function text(value, fallback = "—") {
  const result = String(value ?? "").trim();
  return result || fallback;
}

function normalize(value) {
  return text(value, "").toLowerCase();
}

function numberValue(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const cleaned = String(value ?? "")
    .replace(/[₹,\s]/g, "")
    .replace(/[^0-9.-]/g, "");

  if (!cleaned) return 0;

  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function numberText(value) {
  return String(numberValue(value));
}

function money(value) {
  return `₹${numberText(value)}`;
}

function timeValue(value) {
  if (!value) return 0;
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (typeof value?.toDate === "function") return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;

  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function dateText(value) {
  const stamp = timeValue(value);
  if (!stamp) return "—";

  return new Date(stamp).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function dateTimeText(value) {
  const stamp = timeValue(value);
  if (!stamp) return "—";

  return new Date(stamp).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/* =========================================================
   STUDENT
========================================================= */

function studentName(student) {
  return (
    student?.name ||
    student?.fullName ||
    student?.studentName ||
    "Student"
  );
}

function enrollment(student) {
  return (
    student?.enrollmentNo ||
    student?.enrollmentNumber ||
    student?.admissionNo ||
    "—"
  );
}

function className(student) {
  return (
    student?.className ||
    student?.class ||
    student?.grade ||
    "—"
  );
}

function section(student) {
  return (
    student?.section ||
    student?.sectionName ||
    "—"
  );
}

function session(student) {
  return (
    student?.session ||
    student?.sessionName ||
    student?.academicSession ||
    "Current Session"
  );
}

/* =========================================================
   RESULT
========================================================= */

function resultTitle(result) {
  return (
    result?.examName ||
    result?.examinationName ||
    result?.assessmentName ||
    result?.assessment ||
    result?.exam ||
    result?.resultName ||
    result?.title ||
    result?.name ||
    "Examination"
  );
}

function resultType(result) {
  const value = normalize(
    result?.examType ||
      result?.assessmentType ||
      result?.resultType ||
      result?.type ||
      resultTitle(result)
  );

  if (value.includes("annual") || value.includes("final")) {
    return "ANNUAL";
  }

  if (value.includes("half")) return "HALF YEARLY";
  if (value.includes("mid")) return "MID TERM";
  if (value.includes("unit")) return "UNIT TEST";
  if (value.includes("periodic")) return "PERIODIC TEST";
  if (value.includes("term")) return "TERM";

  return resultTitle(result).toUpperCase();
}

function isPublished(result) {
  const status = normalize(
    result?.publishStatus ??
      result?.resultStatus ??
      result?.status ??
      result?.state
  );

  return (
    result?.published === true ||
    result?.publish === true ||
    result?.isPublished === true ||
    ["published", "verified", "locked"].includes(status)
  );
}

function belongsToStudent(result, student) {
  const resultIds = [
    result?.studentId,
    result?.studentUid,
    result?.firebaseUid,
    result?.studentID,
    result?.studentDocId,
    result?.uid,
  ]
    .filter(Boolean)
    .map(String);

  const studentIds = [
    student?.id,
    student?.studentId,
    student?.uid,
    student?.firebaseUid,
    student?.authUid,
  ]
    .filter(Boolean)
    .map(String);

  if (
    resultIds.some((id) =>
      studentIds.includes(id)
    )
  ) {
    return true;
  }

  const recordEnrollment = normalize(
    result?.enrollmentNo ??
      result?.enrollmentNumber ??
      result?.admissionNo
  );

  const studentEnrollment = normalize(
    enrollment(student)
  );

  return Boolean(
    recordEnrollment &&
      studentEnrollment &&
      recordEnrollment === studentEnrollment
  );
}

/* =========================================================
   SUBJECTS
========================================================= */

function subjectSource(result) {
  const source =
    result?.subjects ??
    result?.subjectMarks ??
    result?.marksDetails ??
    result?.markDetails ??
    result?.details ??
    result?.marks ??
    [];

  if (Array.isArray(source)) return source;

  if (
    source &&
    typeof source === "object"
  ) {
    return Object.entries(source).map(
      ([key, value]) => ({
        ...(value &&
        typeof value === "object"
          ? value
          : { marks: value }),
        subjectCode:
          value?.subjectCode ||
          value?.code ||
          key,
        subjectName:
          value?.subjectName ||
          value?.name ||
          value?.subject ||
          key,
      })
    );
  }

  return [];
}

function readFirst(item, keys) {
  for (const key of keys) {
    if (
      item?.[key] !== undefined &&
      item?.[key] !== null &&
      item?.[key] !== ""
    ) {
      return numberValue(
        item[key]
      );
    }
  }

  return 0;
}

function gradeFromPercentage(value) {
  const p = numberValue(value);

  if (p >= 90) return "A+";
  if (p >= 80) return "A";
  if (p >= 70) return "B+";
  if (p >= 60) return "B";
  if (p >= 50) return "C";
  if (p >= 40) return "D";
  return "F";
}

function findSubjectSetup(item, subjectDefinitions = []) {
  const code = normalize(
    item?.subjectCode || item?.code || item?.subjectId
  );
  const name = normalize(
    item?.subjectName || item?.name || item?.subject
  );

  return subjectDefinitions.find((setup) => {
    const setupCode = normalize(setup?.code);
    const setupName = normalize(
      setup?.name || setup?.subjectName
    );

    return (
      (code && setupCode === code) ||
      (name && setupName === name) ||
      (item?.subjectId && String(setup.id) === String(item.subjectId))
    );
  }) || null;
}

function normalizeSubject(item, index, subjectDefinitions = []) {
  const setup = findSubjectSetup(
    item,
    subjectDefinitions
  );

  const theoryMax =
    readFirst(item, [
      "theoryMarks",
      "theoryMax",
      "theoryMaximum",
      "maxTheory",
      "theoryTotal",
    ]) || readFirst(setup, ["theoryMarks"]);

  const practicalMax =
    readFirst(item, [
      "practicalMarks",
      "practicalMax",
      "practicalMaximum",
      "maxPractical",
      "practicalTotal",
    ]) || readFirst(setup, ["practicalMarks"]);

  const internalMax =
    readFirst(item, [
      "internalMarks",
      "internalMax",
      "internalMaximum",
      "maxInternal",
      "internalTotal",
    ]) || readFirst(setup, ["internalMarks"]);

  const projectMax =
    readFirst(item, [
      "projectMarks",
      "projectMax",
      "projectMaximum",
      "maxProject",
      "projectTotal",
    ]) || readFirst(setup, ["projectMarks"]);

  const componentMaximum =
    theoryMax +
    practicalMax +
    internalMax +
    projectMax;

  const directMax =
    readFirst(item, [
      "totalMarks",
      "maxMarks",
      "maximumMarks",
      "fullMarks",
      "totalMaximum",
    ]) || readFirst(setup, ["maxMarks", "totalMarks"]);

  const theory = readFirst(item, [
    "theory",
    "theoryObtained",
    "theoryMarksObtained",
    "obtainedTheory",
  ]);

  const practical = readFirst(item, [
    "practical",
    "practicalObtained",
    "practicalMarksObtained",
    "obtainedPractical",
  ]);

  const internal = readFirst(item, [
    "internal",
    "internalObtained",
    "internalMarksObtained",
    "obtainedInternal",
  ]);

  const project = readFirst(item, [
    "project",
    "projectObtained",
    "projectMarksObtained",
    "obtainedProject",
  ]);

  const directObtained = readFirst(item, [
    "total",
    "obtainedMarks",
    "marksObtained",
    "totalObtained",
    "obtained",
    "marks",
    "score",
  ]);

  const hasComponentMarks =
    item?.theory !== undefined ||
    item?.theoryObtained !== undefined ||
    item?.practical !== undefined ||
    item?.practicalObtained !== undefined ||
    item?.internal !== undefined ||
    item?.internalObtained !== undefined ||
    item?.project !== undefined ||
    item?.projectObtained !== undefined;

  const componentObtained =
    theory + practical + internal + project;

  let maximum =
    componentMaximum > 0
      ? componentMaximum
      : directMax;

  /* FIX: legacy rows with only marks=20 should use Admin's
     subject setup (for example theoryMarks=20), not /100. */
  if (maximum <= 0 && setup) {
    const setupMaximum = readFirst(setup, [
      "maxMarks",
      "totalMarks",
      "theoryMarks",
      "practicalMarks",
      "internalMarks",
      "projectMarks",
    ]);

    if (setupMaximum > 0) {
      maximum = setupMaximum;
    }
  }

  const obtained =
    hasComponentMarks
      ? componentObtained
      : directObtained;

  const hasObtained =
    hasComponentMarks ||
    item?.total !== undefined ||
    item?.obtainedMarks !== undefined ||
    item?.marksObtained !== undefined ||
    item?.obtained !== undefined ||
    item?.marks !== undefined ||
    item?.score !== undefined;

  const passingMarks =
    readFirst(item, [
      "passingMarks",
      "passMarks",
      "minimumMarks",
    ]) || readFirst(setup, ["passingMarks"]);

  const percentage =
    maximum > 0
      ? Math.min(100, Math.max(0, (obtained / maximum) * 100))
      : 0;

  const grade =
    maximum > 0
      ? gradeFromPercentage(percentage)
      : "—";

  const passed =
    item?.passed !== undefined
      ? Boolean(item.passed)
      : maximum > 0
        ? passingMarks > 0
          ? obtained >= passingMarks
          : percentage >= 33
        : false;

  return {
    id:
      item?.id ||
      item?.subjectId ||
      item?.code ||
      setup?.id ||
      `subject-${index + 1}`,

    code:
      item?.subjectCode ||
      item?.code ||
      setup?.code ||
      "",

    name:
      item?.subjectName ||
      item?.name ||
      item?.subject ||
      setup?.name ||
      `Subject ${index + 1}`,

    type:
      item?.type ||
      item?.subjectType ||
      setup?.type ||
      "Core",

    theory,
    theoryMax,
    practical,
    practicalMax,
    internal,
    internalMax,
    project,
    projectMax,

    obtained,
    maximum,
    percentage,
    grade,
    passed,
    hasMaximum: maximum > 0,
    hasObtained,
  };
}

function getSubjects(result, subjectDefinitions = []) {
  return subjectSource(result).map((item, index) =>
    normalizeSubject(item, index, subjectDefinitions)
  );
}

function summarize(result, subjectDefinitions = []) {
  const subjects = getSubjects(result, subjectDefinitions);

  const subjectMaximum =
    subjects.reduce(
      (
        total,
        subject
      ) =>
        total +
        subject.maximum,
      0
    );

  const subjectObtained =
    subjects.reduce(
      (
        total,
        subject
      ) =>
        total +
        subject.obtained,
      0
    );

  const maximum =
    numberValue(
      result?.maximumMarks ??
        result?.totalMaximum ??
        result?.maxMarks ??
        result?.totalMarks
    ) || subjectMaximum;

  const obtained =
    numberValue(
      result?.obtainedMarks ??
        result?.totalObtained ??
        result?.grandTotal ??
        result?.marksObtained
    ) || subjectObtained;

  const percentage =
    maximum > 0
      ? (obtained /
          maximum) *
        100
      : 0;

  const complete =
    subjects.length > 0 &&
    subjects.every(
      (subject) =>
        subject.hasMaximum &&
        subject.hasObtained &&
        subject.obtained >= 0 &&
        subject.obtained <=
          subject.maximum
    );

  const failedSubjects =
    subjects.filter(
      (subject) =>
        subject.passed === false
    );

  return {
    subjects,
    maximum,
    obtained,
    percentage,

    grade:
      result?.overallGrade ||
      result?.grade ||
      (complete
        ? gradeFromPercentage(
            percentage
          )
        : "—"),

    division:
      result?.division ||
      result?.divisionName ||
      (complete
        ? percentage >= 60
          ? "First Division"
          : percentage >= 45
          ? "Second Division"
          : percentage >= 33
          ? "Third Division"
          : "Needs Improvement"
        : "—"),

    passedSubjects:
      subjects.filter(
        (subject) =>
          subject.passed
      ).length,

    failedSubjects,

    complete,

    status:
      complete
        ? failedSubjects.length ===
          0
          ? "PASS"
          : "FAIL"
        : "PENDING",
  };
}

/* =========================================================
   ANNUAL
========================================================= */

function makeAnnualResult(
  exams,
  subjectDefinitions = []
) {
  if (
    exams.length !== 3
  ) {
    return null;
  }

  if (
    !exams.every(
      (exam) =>
        summarize(exam, subjectDefinitions)
          .complete
    )
  ) {
    return null;
  }

  const subjectMap =
    new Map();

  exams.forEach(
    (
      exam
    ) => {
      summarize(
        exam,
        subjectDefinitions
      ).subjects.forEach(
        (
          subject
        ) => {
          const key =
            normalize(
              subject.code ||
                subject.id ||
                subject.name
            );

          if (!key) return;

          if (
            !subjectMap.has(
              key
            )
          ) {
            subjectMap.set(
              key,
              {
                id: key,
                code:
                  subject.code,
                name:
                  subject.name,
                examRows: [],
              }
            );
          }

          subjectMap
            .get(key)
            .examRows.push({
              examId:
                exam.id,
              examName:
                resultTitle(
                  exam
                ),
              maxMarks:
                subject.maximum,
              obtainedMarks:
                subject.obtained,
              percentage:
                subject.percentage,
              grade:
                subject.grade,
              passed:
                subject.passed,
            });
        }
      );
    }
  );

  const subjects =
    Array.from(
      subjectMap.values()
    ).map(
      (
        subject
      ) => {
        const maximum =
          subject.examRows.reduce(
            (
              total,
              row
            ) =>
              total +
              numberValue(
                row.maxMarks
              ),
            0
          );

        const obtained =
          subject.examRows.reduce(
            (
              total,
              row
            ) =>
              total +
              numberValue(
                row.obtainedMarks
              ),
            0
          );

        const percentage =
          maximum > 0
            ? (obtained /
                maximum) *
              100
            : 0;

        return {
          ...subject,
          maximum,
          obtained,
          percentage,
          grade:
            gradeFromPercentage(
              percentage
            ),
          passed:
            percentage >= 33,
        };
      }
    );

  const maximum =
    subjects.reduce(
      (
        total,
        subject
      ) =>
        total +
        subject.maximum,
      0
    );

  const obtained =
    subjects.reduce(
      (
        total,
        subject
      ) =>
        total +
        subject.obtained,
      0
    );

  const percentage =
    maximum > 0
      ? (obtained /
          maximum) *
        100
      : 0;

  const failedSubjects =
    subjects.filter(
      (
        subject
      ) =>
        !subject.passed
    );

  return {
    id:
      `annual-${exams
        .map(
          (
            exam
          ) =>
            exam.id
        )
        .join("-")}`,

    examName:
      "Annual Result",

    examinationName:
      "Annual Result",

    examType:
      "FINAL",

    resultType:
      "FINAL",

    consolidated:
      true,

    dynamicAnnual:
      true,

    sourceExams:
      exams.map(
        (
          exam
        ) => {
          const summary =
            summarize(
              exam
            );

          return {
            id:
              exam.id,
            title:
              resultTitle(
                exam
              ),
            type:
              resultType(
                exam
              ),
            maximum:
              summary.maximum,
            obtained:
              summary.obtained,
            percentage:
              summary.percentage,
            grade:
              summary.grade,
          };
        }
      ),

    subjects,

    maximumMarks:
      maximum,

    totalMaximum:
      maximum,

    obtainedMarks:
      obtained,

    totalObtained:
      obtained,

    grandTotal:
      obtained,

    percentage,

    grade:
      gradeFromPercentage(
        percentage
      ),

    division:
      percentage >= 60
        ? "First Division"
        : percentage >= 45
        ? "Second Division"
        : percentage >= 33
        ? "Third Division"
        : "Needs Improvement",

    passedSubjects:
      subjects.filter(
        (
          subject
        ) =>
          subject.passed
      ).length,

    failedSubjects,

    status:
      failedSubjects.length === 0
        ? "PASS"
        : "FAIL",

    pass:
      failedSubjects.length === 0 &&
      percentage >= 33,

    publish: true,
    published: true,
  };
}

/* =========================================================
   AMOUNT TO WORDS
========================================================= */

function numberToWords(number) {
  const n = Math.floor(
    numberValue(number)
  );

  if (n === 0) return "Zero";

  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
  ];

  const teens = [
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];

  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  function twoDigits(value) {
    if (value < 10) return ones[value];
    if (value < 20) return teens[value - 10];

    return `${tens[
      Math.floor(
        value / 10
      )
    ]}${
      value % 10
        ? ` ${ones[
            value % 10
          ]}`
        : ""
    }`;
  }

  function threeDigits(value) {
    if (value < 100) {
      return twoDigits(
        value
      );
    }

    const hundred =
      Math.floor(
        value / 100
      );

    const remainder =
      value % 100;

    return `${ones[hundred]} Hundred${
      remainder
        ? ` ${twoDigits(
            remainder
          )}`
        : ""
    }`;
  }

  let remaining =
    n;

  const output =
    [];

  const crore =
    Math.floor(
      remaining /
        10000000
    );

  if (crore) {
    output.push(
      `${numberToWords(
        crore
      )} Crore`
    );

    remaining %=
      10000000;
  }

  const lakh =
    Math.floor(
      remaining /
        100000
    );

  if (lakh) {
    output.push(
      `${numberToWords(
        lakh
      )} Lakh`
    );

    remaining %=
      100000;
  }

  const thousand =
    Math.floor(
      remaining /
        1000
    );

  if (thousand) {
    output.push(
      `${numberToWords(
        thousand
      )} Thousand`
    );

    remaining %=
      1000;
  }

  if (remaining) {
    output.push(
      threeDigits(
        remaining
      )
    );
  }

  return output.join(
    " "
  );
}

function amountWords(
  value
) {
  return `Rupees ${numberToWords(
    value
  )} Only`;
}

/* =========================================================
   IMAGE HELPERS
========================================================= */

async function addImageSafely(
  pdf,
  dataUrl,
  x,
  y,
  width,
  height
) {
  if (!dataUrl) return false;

  try {
    const format =
      String(
        dataUrl
      ).includes(
        "image/jpeg"
      )
        ? "JPEG"
        : "PNG";

    pdf.addImage(
      dataUrl,
      format,
      x,
      y,
      width,
      height,
      undefined,
      "FAST"
    );

    return true;
  } catch (error) {
    console.warn(
      "Unable to add image:",
      error
    );

    return false;
  }
}

/* =========================================================
   PDF RESULT
========================================================= */

async function buildResultPdf(
  student,
  result,
  schoolSettings
) {
  const summary =
    summarize(
      result
    );

  if (
    !summary.complete
  ) {
    throw new Error(
      "Result PDF is available only after all required marks are complete."
    );
  }

  const pdf =
    new jsPDF({
      orientation:
        "portrait",
      unit:
        "mm",
      format:
        "a4",
    });

  const annual =
    result?.consolidated ===
    true;

  const schoolName =
    schoolSettings.schoolName ||
    "XYZ PUBLIC SCHOOL";

  /* HEADER */

  pdf.setFillColor(
    6,
    95,
    70
  );

  pdf.rect(
    0,
    0,
    210,
    40,
    "F"
  );

  pdf.setTextColor(
    255,
    255,
    255
  );

  pdf.setFont(
    "helvetica",
    "bold"
  );

  pdf.setFontSize(
    19
  );

  pdf.text(
    schoolName,
    105,
    13,
    {
      align:
        "center",
    }
  );

  pdf.setFontSize(
    10
  );

  pdf.text(
    annual
      ? "FINAL ANNUAL MARKSHEET"
      : "OFFICIAL STUDENT MARKSHEET",
    105,
    21,
    {
      align:
        "center",
    }
  );

  pdf.setFont(
    "helvetica",
    "normal"
  );

  pdf.setFontSize(
    7
  );

  pdf.text(
    `${annual ? "3 Examination Consolidation" : resultType(result)} • ${session(student)}`,
    105,
    29,
    {
      align:
        "center",
    }
  );

  if (
    schoolSettings.schoolAddress
  ) {
    pdf.text(
      String(
        schoolSettings.schoolAddress
      ).slice(
        0,
        100
      ),
      105,
      35,
      {
        align:
          "center",
      }
    );
  }

  /* STUDENT */

  autoTable(
    pdf,
    {
      startY:
        48,

      theme:
        "grid",

      head: [
        [
          "Student Information",
          "Details",
        ],
      ],

      body: [
        [
          "Student Name",
          studentName(
            student
          ),
        ],
        [
          "Enrollment No.",
          enrollment(
            student
          ),
        ],
        [
          "Class / Section",
          `${className(
            student
          )} / ${section(
            student
          )}`,
        ],
        [
          "Academic Session",
          session(
            student
          ),
        ],
        [
          "Examination",
          resultTitle(
            result
          ),
        ],
        [
          "Result Status",
          summary.status,
        ],
      ],

      styles: {
        fontSize:
          8.5,
        cellPadding:
          3,
      },

      headStyles: {
        fillColor: [
          6,
          95,
          70,
        ],
      },
    }
  );

  let y =
    (
      pdf.lastAutoTable
        ?.finalY || 80
    ) +
    8;

  /* SUBJECT TABLE */

  if (
    annual
  ) {
    const head = [
      "Subject",
      ...result.sourceExams.map(
        (
          exam
        ) =>
          exam.title
      ),
      "Annual Total",
      "%",
      "Grade",
      "Status",
    ];

    const body =
      result.subjects.map(
        (
          subject
        ) => [
          subject.name,
          ...result.sourceExams.map(
            (
              exam
            ) => {
              const row =
                subject.examRows.find(
                  (
                    item
                  ) =>
                    item.examId ===
                    exam.id
                );

              return row
                ? `${numberText(
                    row.obtainedMarks
                  )}/${numberText(
                    row.maxMarks
                  )}`
                : "—";
            }
          ),
          `${numberText(
            subject.obtained
          )}/${numberText(
            subject.maximum
          )}`,
          subject.percentage.toFixed(
            2
          ),
          subject.grade,
          subject.passed
            ? "PASS"
            : "FAIL",
        ]
      );

    autoTable(
      pdf,
      {
        startY:
          y,
        theme:
          "grid",

        head: [
          head,
        ],

        body,

        styles: {
          fontSize:
            6.5,
          cellPadding:
            2.2,
          valign:
            "middle",
        },

        headStyles: {
          fillColor: [
            6,
            95,
            70,
          ],
        },
      }
    );
  } else {
    const body =
      summary.subjects.map(
        (
          subject
        ) => [
          subject.code ||
            "—",
          subject.name,
          subject.theoryMax
            ? `${numberText(
                subject.theory
              )}/${numberText(
                subject.theoryMax
              )}`
            : "—",
          subject.practicalMax
            ? `${numberText(
                subject.practical
              )}/${numberText(
                subject.practicalMax
              )}`
            : "—",
          subject.internalMax
            ? `${numberText(
                subject.internal
              )}/${numberText(
                subject.internalMax
              )}`
            : "—",
          subject.projectMax
            ? `${numberText(
                subject.project
              )}/${numberText(
                subject.projectMax
              )}`
            : "—",
          `${numberText(
            subject.obtained
          )}/${numberText(
            subject.maximum
          )}`,
          subject.percentage.toFixed(
            2
          ),
          subject.grade,
          subject.passed
            ? "PASS"
            : "FAIL",
        ]
      );

    autoTable(
      pdf,
      {
        startY:
          y,
        theme:
          "grid",

        head: [
          [
            "Code",
            "Subject",
            "Theory",
            "Practical",
            "Internal",
            "Project",
            "Total",
            "%",
            "Grade",
            "Status",
          ],
        ],

        body,

        styles: {
          fontSize:
            6.4,
          cellPadding:
            2.2,
          valign:
            "middle",
        },

        headStyles: {
          fillColor: [
            6,
            95,
            70,
          ],
        },
      }
    );
  }

  y =
    (
      pdf.lastAutoTable
        ?.finalY || y + 60
    ) +
    8;

  if (
    y >
    215
  ) {
    pdf.addPage();

    y =
      45;
  }

  /* SUMMARY */

  autoTable(
    pdf,
    {
      startY:
        y,

      theme:
        "grid",

      head: [
        [
          "Overall Result Summary",
          "Value",
        ],
      ],

      body: [
        [
          "Obtained Marks",
          numberText(
            summary.obtained
          ),
        ],
        [
          "Maximum Marks",
          numberText(
            summary.maximum
          ),
        ],
        [
          "Percentage",
          `${summary.percentage.toFixed(
            2
          )}%`,
        ],
        [
          "Overall Grade",
          summary.grade,
        ],
        [
          "Division",
          summary.division,
        ],
        [
          "Rank",
          result.rank ||
            "—",
        ],
        [
          "Passed Subjects",
          String(
            summary.passedSubjects
          ),
        ],
        [
          "Failed Subjects",
          String(
            summary.failedSubjects
              .length
          ),
        ],
        [
          "Final Status",
          summary.status,
        ],
      ],

      styles: {
        fontSize:
          8.5,
        cellPadding:
          3,
      },

      headStyles: {
        fillColor: [
          6,
          95,
          70,
        ],
      },
    }
  );

  /* QR */

  let qrAdded = false;

  if (
    schoolSettings.showQrOnResult !==
      false
  ) {
    try {
      const verifyUrl =
        `${window.location.origin}/verify-result?result=${encodeURIComponent(
          result.id ||
            ""
        )}&student=${encodeURIComponent(
          student.id ||
            ""
        )}&enrollment=${encodeURIComponent(
          enrollment(student)
        )}`;

      const qr =
        await QRCode.toDataURL(
          verifyUrl,
          {
            width:
              300,
            margin:
              1,
            errorCorrectionLevel:
              "M",
          }
        );

      qrAdded =
        await addImageSafely(
          pdf,
          qr,
          157,
          234,
          31,
          31
        );

      if (
        qrAdded
      ) {
        pdf.setTextColor(
          100,
          116,
          139
        );

        pdf.setFont(
          "helvetica",
          "bold"
        );

        pdf.setFontSize(
          6
        );

        pdf.text(
          "SCAN TO VERIFY RESULT",
          172.5,
          269,
          {
            align:
              "center",
          }
        );
      }
    } catch (
      error
    ) {
      console.warn(
        "Result QR:",
        error
      );
    }
  }

  /* SIGNATURE */

  const signatureY =
    262;

  pdf.setDrawColor(
    160,
    160,
    160
  );

  pdf.line(
    20,
    signatureY,
    76,
    signatureY
  );

  pdf.line(
    96,
    signatureY,
    140,
    signatureY
  );

  pdf.line(
    151,
    signatureY,
    195,
    signatureY
  );

  if (
    schoolSettings.showSignature !==
      false
  ) {
    await addImageSafely(
      pdf,
      schoolSettings.signatureDataUrl ||
        schoolSettings.signatureImage,
      25,
      signatureY - 17,
      46,
      13
    );
  }

  if (
    schoolSettings.showSeal !==
      false
  ) {
    await addImageSafely(
      pdf,
      schoolSettings.sealDataUrl ||
        schoolSettings.sealImage,
      156,
      signatureY - 21,
      33,
      18
    );
  }

  pdf.setFont(
    "helvetica",
    "normal"
  );

  pdf.setFontSize(
    6.5
  );

  pdf.setTextColor(
    100,
    116,
    139
  );

  pdf.text(
    "Class Teacher",
    48,
    signatureY + 6,
    {
      align:
        "center",
    }
  );

  pdf.text(
    "Principal",
    118,
    signatureY + 6,
    {
      align:
        "center",
    }
  );

  pdf.text(
    "School Seal",
    173,
    signatureY + 6,
    {
      align:
        "center",
    }
  );

  /* FOOTER */

  pdf.setDrawColor(
    226,
    232,
    240
  );

  pdf.line(
    15,
    280,
    195,
    280
  );

  pdf.setFontSize(
    6.5
  );

  pdf.text(
    `Published: ${dateText(
      result.publishedAt ||
        result.updatedAt
    )}`,
    15,
    287
  );

  pdf.text(
    "Computer-generated official academic record.",
    195,
    287,
    {
      align:
        "right",
    }
  );

  return pdf;
}

/* =========================================================
   PROFESSIONAL FEE RECEIPT
========================================================= */

async function buildReceiptPdf(
  student,
  payment,
  fees,
  schoolSettings
) {
  const pdf =
    new jsPDF({
      orientation:
        "portrait",
      unit:
        "mm",
      format:
        "a4",
    });

  const receiptNo =
    payment?.receiptNo ||
    payment?.receiptNumber ||
    "RECEIPT";

  const academicFee =
    numberValue(
      payment?.annualFee ??
        payment?.academicFee ??
        fees?.annualFee ??
        fees?.academicFee
    );

  const transportFee =
    numberValue(
      payment?.transportCharge ??
        payment?.transportFee ??
        fees?.transportCharge ??
        fees?.transportFee
    );

  const tuitionFee =
    numberValue(
      payment?.tuitionFee ??
        fees?.tuitionFee
    );

  const examFee =
    numberValue(
      payment?.examFee ??
        fees?.examFee
    );

  const otherFee =
    numberValue(
      payment?.otherFee ??
        fees?.otherFee
    );

  const currentPayment =
    numberValue(
      payment?.amount
    );

  const totalPaidAfter =
    numberValue(
      payment?.totalPaidAfter ??
        fees?.totalPaid
    );

  const totalDueAfter =
    numberValue(
      payment?.totalDueAfter ??
        Math.max(
          0,
          academicFee +
            transportFee -
            totalPaidAfter
        )
    );

  /* Header */

  pdf.setFillColor(
    6,
    95,
    70
  );

  pdf.rect(
    0,
    0,
    210,
    42,
    "F"
  );

  pdf.setTextColor(
    255,
    255,
    255
  );

  pdf.setFont(
    "helvetica",
    "bold"
  );

  pdf.setFontSize(
    20
  );

  pdf.text(
    schoolSettings.schoolName ||
      "XYZ PUBLIC SCHOOL",
    105,
    14,
    {
      align:
        "center",
    }
  );

  pdf.setFontSize(
    10
  );

  pdf.text(
    "OFFICIAL FEE PAYMENT RECEIPT",
    105,
    23,
    {
      align:
        "center",
    }
  );

  pdf.setFont(
    "helvetica",
    "normal"
  );

  pdf.setFontSize(
    7
  );

  pdf.text(
    schoolSettings.schoolAddress ||
      "Student ERP",
    105,
    31,
    {
      align:
        "center",
    }
  );

  pdf.text(
    `Receipt No: ${receiptNo}`,
    105,
    36,
    {
      align:
        "center",
    }
  );

  autoTable(
    pdf,
    {
      startY:
        49,

      theme:
        "grid",

      head: [
        [
          "Student Information",
          "Details",
        ],
      ],

      body: [
        [
          "Student Name",
          studentName(
            student
          ),
        ],
        [
          "Enrollment No.",
          enrollment(
            student
          ),
        ],
        [
          "Class / Section",
          `${className(
            student
          )} / ${section(
            student
          )}`,
        ],
        [
          "Academic Session",
          session(
            student
          ),
        ],
        [
          "Payment Date",
          payment?.date ||
            dateText(
              payment?.timestamp ||
                payment?.createdAt
            ),
        ],
        [
          "Payment Method",
          payment?.method ||
            payment?.paymentMethod ||
            "—",
        ],
        [
          "Payment Status",
          payment?.status ||
            "SUCCESS",
        ],
      ],

      styles: {
        fontSize:
          8.5,
        cellPadding:
          3,
      },

      headStyles: {
        fillColor: [
          6,
          95,
          70,
        ],
      },
    }
  );

  autoTable(
    pdf,
    {
      startY:
        (
          pdf.lastAutoTable
            ?.finalY || 90
        ) +
        8,

      theme:
        "grid",

      head: [
        [
          "Fee Component",
          "Amount",
        ],
      ],

      body: [
        [
          "Tuition Fee",
          money(
            tuitionFee
          ),
        ],
        [
          "Examination Fee",
          money(
            examFee
          ),
        ],
        [
          "Other Academic Fee",
          money(
            otherFee
          ),
        ],
        [
          "Academic Fee",
          money(
            academicFee
          ),
        ],
        [
          "Transportation Fee",
          money(
            transportFee
          ),
        ],
        [
          "Total Fee",
          money(
            academicFee +
              transportFee
          ),
        ],
        [
          "Current Payment",
          money(
            currentPayment
          ),
        ],
        [
          "Total Paid After Payment",
          money(
            totalPaidAfter
          ),
        ],
        [
          "Total Due After Payment",
          money(
            totalDueAfter
          ),
        ],
      ],

      styles: {
        fontSize:
          8.5,
        cellPadding:
          3.5,
      },

      headStyles: {
        fillColor: [
          22,
          163,
          74,
        ],
      },
    }
  );

  let y =
    (
      pdf.lastAutoTable
        ?.finalY || 150
    ) +
    6;

  /* Amount in words */

  pdf.setFillColor(
    236,
    253,
    245
  );

  pdf.roundedRect(
    15,
    y,
    180,
    28,
    3,
    3,
    "F"
  );

  pdf.setTextColor(
    6,
    95,
    70
  );

  pdf.setFont(
    "helvetica",
    "bold"
  );

  pdf.setFontSize(
    7
  );

  pdf.text(
    "AMOUNT IN WORDS",
    20,
    y + 8
  );

  pdf.setFont(
    "helvetica",
    "normal"
  );

  pdf.setFontSize(
    8
  );

  pdf.text(
    amountWords(
      currentPayment
    ),
    20,
    y + 17
  );

  /* QR */

  if (
    schoolSettings.showQrOnReceipt !==
      false
  ) {
    try {
      const verificationUrl =
        `${window.location.origin}/verify-fee-receipt?receipt=${encodeURIComponent(
          receiptNo
        )}&student=${encodeURIComponent(
          enrollment(student)
        )}`;

      const qr =
        await QRCode.toDataURL(
          verificationUrl,
          {
            width:
              280,
            margin:
              1,
            errorCorrectionLevel:
              "M",
          }
        );

      await addImageSafely(
        pdf,
        qr,
        157,
        y + 33,
        31,
        31
      );

      pdf.setTextColor(
        100,
        116,
        139
      );

      pdf.setFont(
        "helvetica",
        "bold"
      );

      pdf.setFontSize(
        6
      );

      pdf.text(
        "SCAN TO VERIFY RECEIPT",
        172.5,
        y + 68,
        {
          align:
            "center",
        }
      );
    } catch (
      error
    ) {
      console.warn(
        "Receipt QR:",
        error
      );
    }
  }

  const signatureY =
    250;

  pdf.setDrawColor(
    160,
    160,
    160
  );

  pdf.line(
    20,
    signatureY,
    76,
    signatureY
  );

  pdf.line(
    96,
    signatureY,
    140,
    signatureY
  );

  pdf.line(
    151,
    signatureY,
    195,
    signatureY
  );

  if (
    schoolSettings.showSignature !==
      false
  ) {
    await addImageSafely(
      pdf,
      schoolSettings.signatureDataUrl ||
        schoolSettings.signatureImage,
      25,
      signatureY - 17,
      46,
      13
    );
  }

  if (
    schoolSettings.showSeal !==
      false
  ) {
    await addImageSafely(
      pdf,
      schoolSettings.sealDataUrl ||
        schoolSettings.sealImage,
      156,
      signatureY - 21,
      33,
      18
    );
  }

  pdf.setFont(
    "helvetica",
    "normal"
  );

  pdf.setFontSize(
    6.5
  );

  pdf.setTextColor(
    100,
    116,
    139
  );

  pdf.text(
    "Accounts",
    48,
    signatureY + 6,
    {
      align:
        "center",
    }
  );

  pdf.text(
    "Authorized Signatory",
    118,
    signatureY + 6,
    {
      align:
        "center",
    }
  );

  pdf.text(
    "School Seal",
    173,
    signatureY + 6,
    {
      align:
        "center",
    }
  );

  pdf.line(
    15,
    278,
    195,
    278
  );

  pdf.text(
    "Computer-generated official fee receipt.",
    105,
    286,
    {
      align:
        "center",
    }
  );

  return pdf;
}

/* =========================================================
   UI COMPONENTS
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
  };

  return (
    <div
      className={`rounded-2xl p-4 ${
        tones[tone] ||
        tones.slate
      }`}
    >
      <p className="text-[8px] font-black uppercase tracking-wider opacity-60">
        {label}
      </p>

      <p className="mt-1 break-words text-lg font-black">
        {value}
      </p>
    </div>
  );
}

function StatusBadge({
  status,
}) {
  const value =
    normalize(status);

  const good =
    value === "pass" ||
    value === "published" ||
    value === "success";

  const bad =
    value === "fail" ||
    value === "rejected";

  return (
    <span
      className={`rounded-full px-3 py-1.5 text-[9px] font-black ${
        good
          ? "bg-emerald-50 text-emerald-700"
          : bad
          ? "bg-red-50 text-red-700"
          : "bg-amber-50 text-amber-700"
      }`}
    >
      {String(
        status || "PENDING"
      ).toUpperCase()}
    </span>
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function StudentResult() {
  const navigate =
    useNavigate();

  const [
    authUser,
    setAuthUser,
  ] = useState(
    auth.currentUser
  );

  const [
    student,
    setStudent,
  ] = useState(
    null
  );

  const [
    results,
    setResults,
  ] = useState([]);

  const [
    payments,
    setPayments,
  ] = useState([]);

  const [
    feeStructures,
    setFeeStructures,
  ] = useState({});

  const [
    classes,
    setClasses,
  ] = useState([]);

  const [
    transportRoutes,
    setTransportRoutes,
  ] = useState([]);

  const [
    feeSettings,
    setFeeSettings,
  ] = useState({});

  const [
    subjectDefinitions,
    setSubjectDefinitions,
  ] = useState([]);

  const [
    schoolSettings,
    setSchoolSettings,
  ] = useState(
    DEFAULT_SCHOOL_SETTINGS
  );

  const [
    selectedId,
    setSelectedId,
  ] = useState(
    ""
  );

  const [
    mode,
    setMode,
  ] = useState(
    "INDIVIDUAL"
  );

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

  const [
    loading,
    setLoading,
  ] = useState(
    true
  );

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  const [
    selectedPayment,
    setSelectedPayment,
  ] = useState(
    null
  );

  const theme =
    THEMES[
      themeName
    ] ||
    THEMES.emerald;

  /* =======================================================
     THEME
  ======================================================= */

  useEffect(() => {
    localStorage.setItem(
      "studentResultTheme",
      themeName
    );

    document.documentElement.style.setProperty(
      "--result-primary",
      theme.primary
    );

    document.documentElement.style.setProperty(
      "--result-dark",
      theme.dark
    );

    document.documentElement.style.setProperty(
      "--result-soft",
      theme.soft
    );
  }, [
    themeName,
    theme,
  ]);

  /* =======================================================
     AUTH
  ======================================================= */

  useEffect(() => {
    return onAuthStateChanged(
      auth,
      (user) => {
        setAuthUser(
          user
        );

        if (!user) {
          navigate(
            "/student-login",
            {
              replace:
                true,
            }
          );
        }
      }
    );
  }, [
    navigate,
  ]);

  /* =======================================================
     LOAD STUDENT
  ======================================================= */

  useEffect(() => {
    let active =
      true;

    async function loadStudent() {
      if (
        !authUser?.uid
      ) {
        return;
      }

      try {
        const raw =
          localStorage.getItem(
            "student"
          ) ||
          sessionStorage.getItem(
            "student"
          );

        let localStudent =
          {};

        try {
          localStudent =
            raw
              ? JSON.parse(
                  raw
                )
              : {};
        } catch {
          localStudent =
            {};
        }

        const snapshot =
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
          snapshot.docs
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
                    item.firebaseUid ||
                    item.authUid ||
                    ""
                ) ===
                  String(
                    authUser.uid
                  ) ||
                normalize(
                  item.email ||
                    item.accountEmail
                ) ===
                  normalize(
                    authUser.email
                  ) ||
                (
                  localStudent?.id &&
                  item.id ===
                    localStudent.id
                )
            );

        if (
          !profile
        ) {
          throw new Error(
            "Student profile not found."
          );
        }

        if (
          active
        ) {
          setStudent(
            profile
          );
        }

        localStorage.setItem(
          "student",
          JSON.stringify(
            profile
          )
        );
      } catch (
        loadError
      ) {
        console.error(
          "Student profile:",
          loadError
        );

        if (
          active
        ) {
          setError(
            loadError?.message ||
              "Unable to load student profile."
          );
        }
      }
    }

    loadStudent();

    return () => {
      active =
        false;
    };
  }, [
    authUser?.uid,
    authUser?.email,
  ]);

  /* =======================================================
     LIVE RESULTS
  ======================================================= */

  useEffect(() => {
    if (
      !student?.id
    ) {
      return undefined;
    }

    const unsubs =
      [];

    [
      "results",
      "studentResults",
    ].forEach(
      (
        collectionName
      ) => {
        const resultQuery =
          query(
            collection(
              db,
              collectionName
            ),
            where(
              "studentId",
              "==",
              student.id
            ),
            limit(
              300
            )
          );

        const unsubscribe =
          onSnapshot(
            resultQuery,
            (
              snapshot
            ) => {
              const incoming =
                snapshot.docs.map(
                  (
                    item
                  ) => ({
                    id:
                      item.id,
                    ...item.data(),
                  })
                );

              setResults(
                (
                  previous
                ) => {
                  const map =
                    new Map(
                      previous.map(
                        (
                          item
                        ) => [
                          item.id,
                          item,
                        ]
                      )
                    );

                  incoming.forEach(
                    (
                      item
                    ) => {
                      if (
                        belongsToStudent(
                          item,
                          student
                        ) &&
                        isPublished(
                          item
                        )
                      ) {
                        map.set(
                          item.id,
                          item
                        );
                      }
                    }
                  );

                  return Array.from(
                    map.values()
                  ).sort(
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
                  );
                }
              );
            },
            (
              listenerError
            ) => {
              console.error(
                `${collectionName} result listener:`,
                listenerError
              );
            }
          );

        unsubs.push(
          unsubscribe
        );
      }
    );

    return () => {
      unsubs.forEach(
        (
          unsubscribe
        ) =>
          unsubscribe()
      );
    };
  }, [
    student?.id,
    student?.enrollmentNo,
  ]);

  /* =======================================================
     LIVE FEE STRUCTURE
  ======================================================= */

  useEffect(() => {
    if (
      !authUser?.uid
    ) {
      return undefined;
    }

    return onSnapshot(
      collection(
        db,
        "feeStructures"
      ),
      (
        snapshot
      ) => {
        const next =
          {};

        snapshot.forEach(
          (
            item
          ) => {
            next[
              item.id
            ] = {
              id:
                item.id,
              ...item.data(),
            };
          }
        );

        setFeeStructures(
          next
        );
      },
      (
        listenerError
      ) => {
        console.error(
          "Fee structure:",
          listenerError
        );
      }
    );
  }, [
    authUser?.uid,
  ]);

  /* =======================================================
     LIVE FEE SETTINGS
  ======================================================= */

  useEffect(() => {
    if (
      !authUser?.uid
    ) {
      return undefined;
    }

    return onSnapshot(
      doc(
        db,
        "settings",
        "feeSettings"
      ),
      (
        snapshot
      ) => {
        setFeeSettings(
          snapshot.exists()
            ? snapshot.data()
            : {}
        );
      },
      (
        listenerError
      ) => {
        console.error(
          "Fee settings:",
          listenerError
        );
      }
    );
  }, [
    authUser?.uid,
  ]);

  /* =======================================================
     LIVE SUBJECT MASTER
     Repairs legacy result rows that do not store maxMarks.
  ======================================================= */

  useEffect(() => {
    if (!authUser?.uid) return undefined;

    return onSnapshot(
      query(
        collection(db, "subjects"),
        limit(1000)
      ),
      (snapshot) => {
        setSubjectDefinitions(
          snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }))
        );
      },
      (error) => {
        console.warn("Subject master listener:", error);
        setSubjectDefinitions([]);
      }
    );
  }, [authUser?.uid]);

  /* =======================================================
     LIVE ACADEMIC CLASSES
  ======================================================= */

  useEffect(() => {
    if (!authUser?.uid) return undefined;

    return onSnapshot(
      collection(db, "classes"),
      (snapshot) => {
        setClasses(
          snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }))
        );
      },
      (listenerError) => {
        console.warn("Classes listener:", listenerError);
        setClasses([]);
      }
    );
  }, [authUser?.uid]);

  /* =======================================================
     LIVE TRANSPORT ROUTES
  ======================================================= */

  useEffect(() => {
    if (!authUser?.uid) return undefined;

    return onSnapshot(
      collection(db, "transportRoutes"),
      (snapshot) => {
        setTransportRoutes(
          snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }))
        );
      },
      (listenerError) => {
        console.warn("Transport routes listener:", listenerError);
        setTransportRoutes([]);
      }
    );
  }, [authUser?.uid]);

  /* =======================================================
     SCHOOL / DOCUMENT SETTINGS
     -------------------------------------------------------
     Supports:
       settings/schoolSettings
       settings/resultSettings
     whichever exists; both are merged.
  ======================================================= */

  useEffect(() => {
    if (
      !authUser?.uid
    ) {
      return undefined;
    }

    const unsubs = [];

    [
      "schoolSettings",
      "resultSettings",
    ].forEach(
      (
        documentName
      ) => {
        const unsubscribe =
          onSnapshot(
            doc(
              db,
              "settings",
              documentName
            ),
            (
              snapshot
            ) => {
              if (
                snapshot.exists()
              ) {
                setSchoolSettings(
                  (
                    previous
                  ) => ({
                    ...previous,
                    ...snapshot.data(),
                  })
                );
              }
            },
            (
              listenerError
            ) => {
              console.warn(
                `${documentName} not available:`,
                listenerError
              );
            }
          );

        unsubs.push(
          unsubscribe
        );
      }
    );

    return () => {
      unsubs.forEach(
        (
          unsubscribe
        ) =>
          unsubscribe()
      );
    };
  }, [
    authUser?.uid,
  ]);

  /* =======================================================
     LIVE PAYMENTS
  ======================================================= */

  useEffect(() => {
    if (
      !student?.id
    ) {
      setPayments(
        []
      );

      return undefined;
    }

    return onSnapshot(
      query(
        collection(
          db,
          "feePayments"
        ),
        where(
          "studentId",
          "==",
          student.id
        ),
        limit(
          200
        )
      ),
      (
        snapshot
      ) => {
        const rows =
          snapshot.docs
            .map(
              (
                item
              ) => ({
                id:
                  item.id,
                ...item.data(),
              })
            )
            .sort(
              (
                a,
                b
              ) =>
                timeValue(
                  b.timestamp ||
                    b.createdAt
                ) -
                timeValue(
                  a.timestamp ||
                    a.createdAt
                )
            );

        setPayments(
          rows
        );
      },
      (
        listenerError
      ) => {
        console.warn(
          "feePayments listener:",
          listenerError
        );

        setPayments(
          []
        );
      }
    );
  }, [
    student?.id,
  ]);

  /* =======================================================
     FALLBACK PAYMENT HISTORY
  ======================================================= */

  const paymentHistory =
    useMemo(
      () => {
        const source =
          [];

        if (
          Array.isArray(
            student?.paymentHistory
          )
        ) {
          source.push(
            ...student.paymentHistory
          );
        }

        source.push(
          ...payments
        );

        const map =
          new Map();

        source.forEach(
          (
            item,
            index
          ) => {
            const key =
              item?.id ||
              item?.receiptNo ||
              item?.receiptNumber ||
              `${item?.timestamp || ""}-${item?.amount || ""}-${index}`;

            map.set(
              key,
              item
            );
          }
        );

        return Array.from(
          map.values()
        ).sort(
          (
            a,
            b
          ) =>
            timeValue(
              b.timestamp ||
                b.createdAt
            ) -
            timeValue(
              a.timestamp ||
                a.createdAt
            )
        );
      },
      [
        student?.paymentHistory,
        payments,
      ]
    );

  /* =======================================================
     CALCULATED FEES
  ======================================================= */

  const fees =
    useMemo(
      () =>
        calculateStudentFees(
          student || {},
          feeSettings,
          classes,
          transportRoutes
        ),
      [
        student,
        feeSettings,
        classes,
        transportRoutes,
      ]
    );

  /* =======================================================
     CLASS FEE BREAKDOWN
     Admin's current fee structure stores:
       tuitionFee + examFee + otherFee = academic fee
       transportFee = default transport fee
     The shared fee utility remains the source of the student's
     final totals and transport-route rules.
  ======================================================= */

  const feeStructure = useMemo(() => {
    const classId = String(student?.classId || "");
    const classValue = String(
      student?.className ||
        student?.class ||
        ""
    );

    return (
      (classId &&
        (feeStructures[classId] ||
          feeStructures[`class-${classValue}`])) ||
      feeStructures[`class-${classValue}`] ||
      Object.values(feeStructures).find(
        (item) =>
          normalize(item?.className) ===
          normalize(classValue)
      ) ||
      null
    );
  }, [student, feeStructures]);

  const academicBreakdown = useMemo(() => {
    const tuitionFee = numberValue(
      feeStructure?.tuitionFee
    );
    const examFee = numberValue(
      feeStructure?.examFee
    );
    const otherFee = numberValue(
      feeStructure?.otherFee
    );

    const structureAcademic =
      tuitionFee + examFee + otherFee;

    return {
      tuitionFee,
      examFee,
      otherFee,
      academicFee:
        structureAcademic > 0
          ? structureAcademic
          : numberValue(fees?.annualFee),
    };
  }, [feeStructure, fees?.annualFee]);

  const transportRoute = useMemo(() => {
    const routeId =
      student?.transportRouteId ||
      student?.routeId ||
      student?.transportId;

    const routeName =
      student?.transportRouteName ||
      student?.routeName ||
      student?.transportRoute;

    return (
      (routeId &&
        transportRoutes.find(
          (item) =>
            String(item?.id || "") ===
            String(routeId)
        )) ||
      (routeName &&
        transportRoutes.find(
          (item) =>
            normalize(
              item?.name ||
                item?.routeName ||
                item?.title
            ) ===
            normalize(routeName)
        )) ||
      null
    );
  }, [student, transportRoutes]);

  const transportDisplayFee = numberValue(
    fees?.transportCharge ??
      transportRoute?.fee ??
      transportRoute?.amount ??
      feeStructure?.transportFee
  );

  const totalFee =
    numberValue(
      fees?.totalFee
    );

  const totalPaid =
    numberValue(
      fees?.totalPaid
    );

  const totalDue =
    numberValue(
      fees?.totalDue
    );

  const feeProgress =
    totalFee > 0
      ? Math.min(
          100,
          Math.round(
            (totalPaid /
              totalFee) *
              100
          )
        )
      : 0;

  /* =======================================================
     EXAMS
  ======================================================= */

  const individualResults =
    useMemo(
      () =>
        results.filter(
          (
            result
          ) => {
            const type =
              resultType(
                result
              );

            return (
              type !==
                "ANNUAL" &&
              type !==
                "FINAL"
            );
          }
        ),
      [
        results,
      ]
    );

  const completeResults =
    useMemo(
      () =>
        individualResults.filter(
          (
            result
          ) =>
            summarize(
              result,
              subjectDefinitions
            ).complete
        ),
      [
        individualResults,
      ]
    );

  const annualResult =
    useMemo(
      () => {
        if (
          completeResults.length <
          3
        ) {
          return null;
        }

        return makeAnnualResult(
          completeResults.slice(-3),
          subjectDefinitions
        );
      },
      [
        completeResults,
      ]
    );

  const selectedIndividual =
    useMemo(
      () =>
        individualResults.find(
          (
            result
          ) =>
            result.id ===
            selectedId
        ) ||
        individualResults[
          individualResults.length -
            1
        ] ||
        null,
      [
        individualResults,
        selectedId,
      ]
    );

  useEffect(() => {
    if (
      individualResults.length &&
      !individualResults.some(
        (
          result
        ) =>
          result.id ===
          selectedId
      )
    ) {
      setSelectedId(
        individualResults[
          individualResults.length -
            1
        ].id
      );
    }
  }, [
    individualResults,
    selectedId,
  ]);

  const annualReady =
    Boolean(
      annualResult &&
        annualResult
          .sourceExams
          ?.length === 3
    );

  const activeResult =
    mode === "ANNUAL"
      ? annualResult
      : selectedIndividual;

  const activeSummary =
    activeResult
      ? summarize(
          activeResult,
          subjectDefinitions
        )
      : null;

  /* =======================================================
     DOWNLOAD RESULT
  ======================================================= */

  async function handleDownloadResult() {
    if (
      !activeResult
    ) {
      setError(
        "No result is available."
      );

      return;
    }

    if (
      !activeSummary?.complete
    ) {
      setError(
        "Result PDF is pending because complete marks are not available."
      );

      return;
    }

    try {
      setError("");
      setSuccess("");

      const pdf =
        await buildResultPdf(
          student,
          activeResult,
          schoolSettings
        );

      pdf.save(
        `Result-${String(
          enrollment(
            student
          )
        ).replace(
          /[^a-zA-Z0-9_-]/g,
          "_"
        )}-${mode === "ANNUAL"
          ? "Annual"
          : String(
              resultTitle(
                activeResult
              )
            ).replace(
              /[^a-zA-Z0-9_-]/g,
              "_"
            )}.pdf`
      );

      setSuccess(
        "Result marksheet downloaded successfully."
      );
    } catch (
      downloadError
    ) {
      console.error(
        "Result PDF:",
        downloadError
      );

      setError(
        downloadError?.message ||
          "Unable to create result PDF."
      );
    }
  }

  /* =======================================================
     DOWNLOAD RECEIPT
  ======================================================= */

  async function handleDownloadReceipt(
    payment
  ) {
    if (
      !payment
    ) {
      return;
    }

    try {
      setError("");
      setSuccess("");

      const receiptFees = {
        ...fees,
        annualFee:
          academicBreakdown?.academicFee ||
          fees?.annualFee ||
          0,
        academicFee:
          academicBreakdown?.academicFee ||
          0,
        transportCharge:
          transportDisplayFee ||
          fees?.transportCharge ||
          0,
        transportFee:
          transportDisplayFee ||
          fees?.transportCharge ||
          0,
        tuitionFee:
          academicBreakdown?.tuitionFee ||
          0,
        examFee:
          academicBreakdown?.examFee ||
          0,
        otherFee:
          academicBreakdown?.otherFee ||
          0,
        totalFee,
        totalPaid,
        totalDue,
      };

      const pdf =
        await buildReceiptPdf(
          student,
          payment,
          receiptFees,
          schoolSettings
        );

      pdf.save(
        `Fee-Receipt-${String(
          payment.receiptNo ||
            payment.receiptNumber ||
            "Receipt"
        ).replace(
          /[^a-zA-Z0-9_-]/g,
          "_"
        )}.pdf`
      );

      setSuccess(
        "Fee receipt downloaded successfully."
      );
    } catch (
      receiptError
    ) {
      console.error(
        "Receipt PDF:",
        receiptError
      );

      setError(
        receiptError?.message ||
          "Unable to create fee receipt."
      );
    }
  }

  /* =======================================================
     RENDER
  ======================================================= */

  if (
    loading &&
    !student
  ) {
    return (
      <StudentLayout>
        <div className="flex min-h-[75vh] items-center justify-center bg-slate-50">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-[var(--result-primary)]" />

            <p className="mt-4 text-sm font-black text-slate-800">
              Loading Student Records
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Syncing result and fee information…
            </p>
          </div>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="min-h-screen bg-slate-50">

        <div className="mx-auto max-w-[1500px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">

          {/* =================================================
              HEADER
          ================================================= */}

          <section className="overflow-hidden rounded-[30px] bg-[var(--result-dark)] p-6 text-white shadow-xl sm:p-8">

            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">

              <div>

                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[.2em]">
                  Secure Academic & Finance Centre
                </span>

                <h1 className="mt-4 text-3xl font-black sm:text-4xl">
                  Results & Fees
                </h1>

                <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-200">
                  Individual examination records remain separate.
                  The Annual Result is generated automatically from
                  three complete published examinations.
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
                      /{" "}
                      {section(
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
                      event
                        .target
                        .value
                    )
                  }
                  className="rounded-xl border border-white/10 bg-white/10 px-3 py-3 text-xs font-black text-white outline-none"
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
                      "/student/leave"
                    )
                  }
                  className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-xs font-black text-white"
                >
                  📅 Leave
                </button>

                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      "/student-dashboard"
                    )
                  }
                  className="rounded-xl bg-white px-4 py-3 text-xs font-black text-slate-900"
                >
                  ← Dashboard
                </button>

              </div>

            </div>

          </section>

          {/* =================================================
              MESSAGES
          ================================================= */}

          {error && (
            <section className="rounded-2xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-black text-red-800">
                Student Portal
              </p>

              <p className="mt-1 text-xs text-red-700">
                {error}
              </p>
            </section>
          )}

          {success && (
            <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-black text-emerald-800">
                Completed
              </p>

              <p className="mt-1 text-xs text-emerald-700">
                {success}
              </p>
            </section>
          )}

          {/* =================================================
              RESULT + FEE STATS
          ================================================= */}

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            <Stat
              label="Published Exams"
              value={
                individualResults.length
              }
              tone="slate"
            />

            <Stat
              label="Annual Progress"
              value={
                `${Math.min(
                  3,
                  completeResults.length
                )}/3`
              }
              tone={
                annualReady
                  ? "green"
                  : "amber"
              }
            />

            <Stat
              label="Total Paid"
              value={money(
                totalPaid
              )}
              tone="green"
            />

            <Stat
              label="Total Due"
              value={money(
                totalDue
              )}
              tone={
                totalDue > 0
                  ? "amber"
                  : "green"
              }
            />

          </section>

          {/* =================================================
              RESULT SELECTOR
          ================================================= */}

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">

            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">

              <div>

                <p className="text-[9px] font-black uppercase tracking-[.2em] text-[var(--result-primary)]">
                  Academic Records
                </p>

                <h2 className="mt-1 text-2xl font-black text-slate-900">
                  Result Selection
                </h2>

              </div>

              <div className="flex flex-col gap-2 md:flex-row">

                <div className="flex rounded-xl bg-slate-100 p-1">

                  <button
                    type="button"
                    onClick={() =>
                      setMode(
                        "INDIVIDUAL"
                      )
                    }
                    className={`rounded-lg px-4 py-2.5 text-[10px] font-black ${
                      mode ===
                      "INDIVIDUAL"
                        ? "bg-white text-[var(--result-primary)] shadow-sm"
                        : "text-slate-500"
                    }`}
                  >
                    Individual Exam
                  </button>

                  <button
                    type="button"
                    disabled={
                      !annualReady
                    }
                    onClick={() =>
                      setMode(
                        "ANNUAL"
                      )
                    }
                    className={`rounded-lg px-4 py-2.5 text-[10px] font-black ${
                      mode ===
                      "ANNUAL"
                        ? "bg-white text-[var(--result-primary)] shadow-sm"
                        : "text-slate-500"
                    } disabled:cursor-not-allowed disabled:opacity-40`}
                  >
                    Annual Result
                  </button>

                </div>

                {mode ===
                  "INDIVIDUAL" &&
                  individualResults.length >
                    0 && (
                    <select
                      value={
                        selectedId
                      }
                      onChange={(
                        event
                      ) =>
                        setSelectedId(
                          event
                            .target
                            .value
                        )
                      }
                      className="min-w-[290px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-black outline-none focus:border-[var(--result-primary)]"
                    >
                      {individualResults.map(
                        (
                          result
                        ) => (
                          <option
                            key={
                              result.id
                            }
                            value={
                              result.id
                            }
                          >
                            {resultTitle(
                              result
                            )}{" "}
                            •{" "}
                            {resultType(
                              result
                            )}
                          </option>
                        )
                      )}
                    </select>
                  )}

              </div>

            </div>

            {!annualReady && (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">

                <p className="text-sm font-black text-amber-900">
                  Annual Result: Pending
                </p>

                <p className="mt-1 text-[10px] leading-5 text-amber-800">
                  {completeResults.length}
                  /3 complete published individual examinations
                  are available. The Annual Result will appear
                  automatically after the third complete examination.
                </p>

              </div>
            )}

            {annualReady && (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">

                <p className="text-sm font-black text-emerald-900">
                  Annual Result Ready
                </p>

                <div className="mt-3 flex flex-wrap gap-2">

                  {annualResult.sourceExams.map(
                    (
                      exam
                    ) => (
                      <span
                        key={
                          exam.id
                        }
                        className="rounded-full bg-white px-3 py-1.5 text-[9px] font-black text-slate-600"
                      >
                        {
                          exam.title
                        }
                      </span>
                    )
                  )}

                </div>

              </div>
            )}

          </section>

          {/* =================================================
              ACTIVE RESULT
          ================================================= */}

          {activeResult &&
            activeSummary && (
            <section className="space-y-5">

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">

                  <div>

                    <div className="flex flex-wrap items-center gap-2">

                      <span className="rounded-full bg-[var(--result-soft)] px-3 py-1.5 text-[9px] font-black text-[var(--result-primary)]">
                        {mode ===
                        "ANNUAL"
                          ? "FINAL ANNUAL"
                          : resultType(
                              activeResult
                            )}
                      </span>

                      <StatusBadge
                        status={
                          activeSummary.status
                        }
                      />

                    </div>

                    <h2 className="mt-3 text-2xl font-black text-slate-900">
                      {resultTitle(
                        activeResult
                      )}
                    </h2>

                    <p className="mt-1 text-xs text-slate-500">
                      {session(
                        student
                      )}{" "}
                      • Published{" "}
                      {dateText(
                        activeResult.publishedAt ||
                          activeResult.updatedAt
                      )}
                    </p>

                  </div>

                  <div className="flex flex-wrap gap-2">

                    <button
                      type="button"
                      disabled={
                        !activeSummary.complete
                      }
                      onClick={
                        handleDownloadResult
                      }
                      className="rounded-xl bg-[var(--result-primary)] px-4 py-3 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      ⬇️ Download Marksheet
                    </button>

                  </div>

                </div>

                {/* SUMMARY */}

                <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">

                  <Stat
                    label="Obtained / Maximum"
                    value={
                      activeSummary.complete
                        ? `${numberText(
                            activeSummary.obtained
                          )}/${numberText(
                            activeSummary.maximum
                          )}`
                        : "PENDING"
                    }
                  />

                  <Stat
                    label="Percentage"
                    value={
                      activeSummary.complete
                        ? `${activeSummary.percentage.toFixed(
                            2
                          )}%`
                        : "PENDING"
                    }
                    tone="blue"
                  />

                  <Stat
                    label="Overall Grade"
                    value={
                      activeSummary.complete
                        ? activeSummary.grade
                        : "PENDING"
                    }
                    tone="violet"
                  />

                  <Stat
                    label="Division"
                    value={
                      activeSummary.complete
                        ? activeSummary.division
                        : "PENDING"
                    }
                    tone="green"
                  />

                  <Stat
                    label="Rank"
                    value={
                      activeSummary.complete
                        ? activeResult.rank ||
                          "—"
                        : "PENDING"
                    }
                    tone="amber"
                  />

                  <Stat
                    label="Subjects"
                    value={
                      activeSummary.subjects
                        .length
                    }
                  />

                </div>

                {!activeSummary.complete && (
                  <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">

                    <p className="text-sm font-black text-amber-900">
                      Result Pending
                    </p>

                    <p className="mt-1 text-[10px] leading-5 text-amber-800">
                      PASS/FAIL, percentage and grade will be finalized
                      only when every subject has complete maximum and
                      obtained marks.
                    </p>

                  </div>
                )}

                {/* MARKSHEET */}

                <div className="mt-6">

                  {mode ===
                  "ANNUAL" ? (
                    <div className="overflow-x-auto rounded-2xl border border-slate-200">

                      <table className="w-full min-w-[1000px] border-collapse">

                        <thead>

                          <tr className="bg-slate-950 text-[9px] font-black uppercase tracking-wider text-white">

                            <th className="px-4 py-3 text-left">
                              Subject
                            </th>

                            {activeResult.sourceExams.map(
                              (
                                exam
                              ) => (
                                <th
                                  key={
                                    exam.id
                                  }
                                  className="px-4 py-3 text-center"
                                >
                                  {
                                    exam.title
                                  }
                                </th>
                              )
                            )}

                            <th className="px-4 py-3 text-center">
                              Annual Total
                            </th>

                            <th className="px-4 py-3 text-center">
                              %
                            </th>

                            <th className="px-4 py-3 text-center">
                              Grade
                            </th>

                            <th className="px-4 py-3 text-center">
                              Status
                            </th>

                          </tr>

                        </thead>

                        <tbody className="divide-y divide-slate-100">

                          {activeResult.subjects.map(
                            (
                              subject
                            ) => (
                              <tr
                                key={
                                  subject.id
                                }
                                className="hover:bg-slate-50"
                              >

                                <td className="px-4 py-4">

                                  <p className="text-xs font-black text-slate-800">
                                    {
                                      subject.name
                                    }
                                  </p>

                                  {subject.code && (
                                    <p className="mt-1 text-[8px] font-bold text-slate-400">
                                      {
                                        subject.code
                                      }
                                    </p>
                                  )}

                                </td>

                                {activeResult.sourceExams.map(
                                  (
                                    exam
                                  ) => {

                                    const row =
                                      subject.examRows.find(
                                        (
                                          item
                                        ) =>
                                          item.examId ===
                                          exam.id
                                      );

                                    return (
                                      <td
                                        key={
                                          exam.id
                                        }
                                        className="px-4 py-4 text-center text-[10px] font-bold text-slate-600"
                                      >
                                        {row
                                          ? `${numberText(
                                              row.obtainedMarks
                                            )}/${numberText(
                                              row.maxMarks
                                            )}`
                                          : "—"}

                                        {row && (
                                          <span className="ml-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[8px]">
                                            {
                                              row.grade
                                            }
                                          </span>
                                        )}

                                      </td>
                                    );
                                  }
                                )}

                                <td className="px-4 py-4 text-center text-xs font-black text-slate-900">
                                  {numberText(
                                    subject.obtained
                                  )}
                                  /
                                  {numberText(
                                    subject.maximum
                                  )}
                                </td>

                                <td className="px-4 py-4 text-center text-[10px] font-black text-blue-700">
                                  {subject.percentage.toFixed(
                                    2
                                  )}
                                  %
                                </td>

                                <td className="px-4 py-4 text-center">
                                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-black text-emerald-700">
                                    {
                                      subject.grade
                                    }
                                  </span>
                                </td>

                                <td className="px-4 py-4 text-center">
                                  <StatusBadge
                                    status={
                                      subject.passed
                                        ? "PASS"
                                        : "FAIL"
                                    }
                                  />
                                </td>

                              </tr>
                            )
                          )}

                        </tbody>

                        <tfoot>

                          <tr className="bg-emerald-50 text-xs font-black text-emerald-900">

                            <td
                              colSpan={
                                1 +
                                activeResult
                                  .sourceExams
                                  .length
                              }
                              className="px-4 py-4"
                            >
                              FINAL ANNUAL TOTAL
                            </td>

                            <td className="px-4 py-4 text-center">
                              {
                                numberText(
                                  activeSummary.obtained
                                )
                              }
                              /
                              {
                                numberText(
                                  activeSummary.maximum
                                )
                              }
                            </td>

                            <td className="px-4 py-4 text-center">
                              {activeSummary.percentage.toFixed(
                                2
                              )}
                              %
                            </td>

                            <td className="px-4 py-4 text-center">
                              {
                                activeSummary.grade
                              }
                            </td>

                            <td className="px-4 py-4 text-center">
                              <StatusBadge
                                status={
                                  activeSummary.status
                                }
                              />
                            </td>

                          </tr>

                        </tfoot>

                      </table>

                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-slate-200">

                      <table className="w-full min-w-[1050px] border-collapse">

                        <thead>

                          <tr className="bg-slate-950 text-[9px] font-black uppercase tracking-wider text-white">

                            <th className="px-4 py-3 text-left">
                              Subject
                            </th>

                            <th className="px-4 py-3 text-center">
                              Theory
                            </th>

                            <th className="px-4 py-3 text-center">
                              Practical
                            </th>

                            <th className="px-4 py-3 text-center">
                              Internal
                            </th>

                            <th className="px-4 py-3 text-center">
                              Project
                            </th>

                            <th className="px-4 py-3 text-center">
                              Total
                            </th>

                            <th className="px-4 py-3 text-center">
                              %
                            </th>

                            <th className="px-4 py-3 text-center">
                              Grade
                            </th>

                            <th className="px-4 py-3 text-center">
                              Status
                            </th>

                          </tr>

                        </thead>

                        <tbody className="divide-y divide-slate-100">

                          {activeSummary.subjects.map(
                            (
                              subject
                            ) => (
                              <tr
                                key={
                                  subject.id
                                }
                                className="hover:bg-slate-50"
                              >

                                <td className="px-4 py-4">

                                  <p className="text-xs font-black text-slate-800">
                                    {
                                      subject.name
                                    }
                                  </p>

                                  {subject.code && (
                                    <p className="mt-1 text-[8px] font-bold text-slate-400">
                                      {
                                        subject.code
                                      }
                                    </p>
                                  )}

                                </td>

                                <td className="px-4 py-4 text-center text-[10px] font-bold text-slate-600">
                                  {subject.theoryMax
                                    ? `${numberText(
                                        subject.theory
                                      )}/${numberText(
                                        subject.theoryMax
                                      )}`
                                    : "—"}
                                </td>

                                <td className="px-4 py-4 text-center text-[10px] font-bold text-slate-600">
                                  {subject.practicalMax
                                    ? `${numberText(
                                        subject.practical
                                      )}/${numberText(
                                        subject.practicalMax
                                      )}`
                                    : "—"}
                                </td>

                                <td className="px-4 py-4 text-center text-[10px] font-bold text-slate-600">
                                  {subject.internalMax
                                    ? `${numberText(
                                        subject.internal
                                      )}/${numberText(
                                        subject.internalMax
                                      )}`
                                    : "—"}
                                </td>

                                <td className="px-4 py-4 text-center text-[10px] font-bold text-slate-600">
                                  {subject.projectMax
                                    ? `${numberText(
                                        subject.project
                                      )}/${numberText(
                                        subject.projectMax
                                      )}`
                                    : "—"}
                                </td>

                                <td className="px-4 py-4 text-center text-sm font-black text-slate-900">
                                  {
                                    numberText(
                                      subject.obtained
                                    )
                                  }
                                  /
                                  {
                                    numberText(
                                      subject.maximum
                                    )
                                  }
                                </td>

                                <td className="px-4 py-4 text-center text-[10px] font-black text-blue-700">
                                  {activeSummary.complete
                                    ? subject.percentage.toFixed(
                                        2
                                      )
                                    : "—"}
                                  {activeSummary.complete
                                    ? "%"
                                    : ""}
                                </td>

                                <td className="px-4 py-4 text-center">
                                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-black text-emerald-700">
                                    {activeSummary.complete
                                      ? subject.grade
                                      : "—"}
                                  </span>
                                </td>

                                <td className="px-4 py-4 text-center">
                                  <StatusBadge
                                    status={
                                      activeSummary.complete
                                        ? subject.passed
                                          ? "PASS"
                                          : "FAIL"
                                        : "PENDING"
                                    }
                                  />
                                </td>

                              </tr>
                            )
                          )}

                        </tbody>

                        <tfoot>

                          <tr className="bg-emerald-50 text-xs font-black text-emerald-900">

                            <td
                              colSpan={
                                5
                              }
                              className="px-4 py-4"
                            >
                              GRAND TOTAL
                            </td>

                            <td className="px-4 py-4 text-center">
                              {activeSummary.complete
                                ? `${numberText(
                                    activeSummary.obtained
                                  )}/${numberText(
                                    activeSummary.maximum
                                  )}`
                                : "PENDING"}
                            </td>

                            <td className="px-4 py-4 text-center">
                              {activeSummary.complete
                                ? `${activeSummary.percentage.toFixed(
                                    2
                                  )}%`
                                : "PENDING"}
                            </td>

                            <td className="px-4 py-4 text-center">
                              {activeSummary.complete
                                ? activeSummary.grade
                                : "PENDING"}
                            </td>

                            <td className="px-4 py-4 text-center">
                              <StatusBadge
                                status={
                                  activeSummary.status
                                }
                              />
                            </td>

                          </tr>

                        </tfoot>

                      </table>

                    </div>
                  )}

                </div>

              </div>

            </section>
          )}

          {/* =================================================
              FEE SNAPSHOT
          ================================================= */}

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

              <div>

                <p className="text-[9px] font-black uppercase tracking-[.2em] text-blue-600">
                  Finance
                </p>

                <h2 className="mt-1 text-2xl font-black text-slate-900">
                  Fee Account & Receipts
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Live fee data from the school fee system.
                </p>

              </div>

              <div className="rounded-xl bg-slate-100 px-4 py-3">

                <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">
                  Payment Progress
                </p>

                <p className="mt-1 text-lg font-black text-[var(--result-primary)]">
                  {
                    feeProgress
                  }%
                </p>

              </div>

            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

              <Stat
                label="Academic Fee"
                value={money(
                  academicBreakdown.academicFee
                )}
              />

              <Stat
                label="Transportation Fee"
                value={money(
                  transportDisplayFee
                )}
                tone="blue"
              />

              <Stat
                label="Total Paid"
                value={money(
                  totalPaid
                )}
                tone="green"
              />

              <Stat
                label="Total Due"
                value={money(
                  totalDue
                )}
                tone={
                  totalDue > 0
                    ? "amber"
                    : "green"
                }
              />

            </div>

            <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">

              <div
                className="h-full rounded-full bg-[var(--result-primary)] transition-all"
                style={{
                  width: `${feeProgress}%`,
                }}
              />

            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

              <Info
                label="Tuition Fee"
                value={money(academicBreakdown.tuitionFee)}
              />

              <Info
                label="Examination Fee"
                value={money(academicBreakdown.examFee)}
              />

              <Info
                label="Other Academic Fee"
                value={money(academicBreakdown.otherFee)}
              />

              <Info
                label="Transport Route"
                value={
                  transportRoute?.name ||
                  transportRoute?.routeName ||
                  student?.transportRouteName ||
                  student?.routeName ||
                  "Not Assigned"
                }
              />

            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

              <Info
                label="Academic Paid"
                value={money(fees?.academicPaid)}
              />

              <Info
                label="Academic Due"
                value={money(fees?.academicDue)}
              />

              <Info
                label="Transport Paid"
                value={money(fees?.transportPaid)}
              />

              <Info
                label="Transport Due"
                value={money(fees?.transportDue)}
              />

            </div>

            <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">

              <table className="w-full min-w-[850px] border-collapse">

                <thead>

                  <tr className="bg-slate-950 text-[9px] font-black uppercase tracking-wider text-white">

                    <th className="px-4 py-3 text-left">
                      Receipt No.
                    </th>

                    <th className="px-4 py-3 text-left">
                      Date
                    </th>

                    <th className="px-4 py-3 text-left">
                      Method
                    </th>

                    <th className="px-4 py-3 text-right">
                      Amount
                    </th>

                    <th className="px-4 py-3 text-center">
                      Status
                    </th>

                    <th className="px-4 py-3 text-right">
                      Action
                    </th>

                  </tr>

                </thead>

                <tbody className="divide-y divide-slate-100">

                  {!paymentHistory.length ? (
                    <tr>

                      <td
                        colSpan={
                          6
                        }
                        className="px-5 py-10 text-center"
                      >

                        <p className="text-sm font-black text-slate-700">
                          No Fee Receipts
                        </p>

                        <p className="mt-1 text-[10px] text-slate-400">
                          A receipt will appear automatically when
                          the school records a successful payment.
                        </p>

                      </td>

                    </tr>
                  ) : (
                    paymentHistory.map(
                      (
                        payment,
                        index
                      ) => (
                        <tr
                          key={
                            payment.id ||
                            `${payment.receiptNo}-${index}`
                          }
                          className="hover:bg-slate-50"
                        >

                          <td className="px-4 py-4 text-xs font-black text-slate-800">
                            {text(
                              payment.receiptNo ||
                                payment.receiptNumber,
                              "Receipt"
                            )}
                          </td>

                          <td className="px-4 py-4 text-xs font-bold text-slate-500">
                            {payment.date ||
                              dateText(
                                payment.timestamp ||
                                  payment.createdAt
                              )}
                          </td>

                          <td className="px-4 py-4 text-xs font-bold text-slate-600">
                            {text(
                              payment.method ||
                                payment.paymentMethod
                            )}
                          </td>

                          <td className="px-4 py-4 text-right text-sm font-black text-slate-900">
                            {money(
                              payment.amount
                            )}
                          </td>

                          <td className="px-4 py-4 text-center">
                            <StatusBadge
                              status={
                                payment.status ||
                                "SUCCESS"
                              }
                            />
                          </td>

                          <td className="px-4 py-4 text-right">

                            <button
                              type="button"
                              onClick={() =>
                                setSelectedPayment(
                                  payment
                                )
                              }
                              className="rounded-xl bg-violet-50 px-3 py-2 text-[10px] font-black text-violet-700"
                            >
                              View Receipt
                            </button>

                          </td>

                        </tr>
                      )
                    )
                  )}

                </tbody>

              </table>

            </div>

          </section>

          {/* =================================================
              INDIVIDUAL EXAM HISTORY
          ================================================= */}

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

            <div className="flex items-start justify-between">

              <div>

                <p className="text-[9px] font-black uppercase tracking-[.2em] text-slate-400">
                  Examination History
                </p>

                <h2 className="mt-1 text-xl font-black text-slate-900">
                  Individual Results
                </h2>

              </div>

              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[9px] font-black text-slate-600">
                {
                  individualResults.length
                }{" "}
                EXAMS
              </span>

            </div>

            <div className="mt-5 space-y-3">

              {individualResults.map(
                (
                  result
                ) => {
                  const summary =
                    summarize(
                      result
                    );

                  const active =
                    mode ===
                      "INDIVIDUAL" &&
                    selectedId ===
                      result.id;

                  return (
                    <button
                      key={
                        result.id
                      }
                      type="button"
                      onClick={() => {
                        setMode(
                          "INDIVIDUAL"
                        );
                        setSelectedId(
                          result.id
                        );
                      }}
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        active
                          ? "border-[var(--result-primary)] bg-[var(--result-soft)]"
                          : "border-slate-200 bg-slate-50 hover:bg-white"
                      }`}
                    >

                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                        <div>

                          <div className="flex flex-wrap items-center gap-2">

                            <p className="text-sm font-black text-slate-800">
                              {
                                resultTitle(
                                  result
                                )
                              }
                            </p>

                            <span className="rounded-full bg-white px-2.5 py-1 text-[8px] font-black text-slate-500">
                              {
                                resultType(
                                  result
                                )
                              }
                            </span>

                            <StatusBadge
                              status={
                                summary.status
                              }
                            />

                          </div>

                          <p className="mt-1 text-[10px] font-bold text-slate-400">
                            Published{" "}
                            {dateText(
                              result.publishedAt ||
                                result.updatedAt
                            )}
                          </p>

                        </div>

                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">

                          <div className="rounded-xl bg-white px-3 py-2 text-center">

                            <p className="text-[8px] font-black uppercase text-slate-400">
                              Marks
                            </p>

                            <p className="mt-1 text-xs font-black">
                              {summary.complete
                                ? `${numberText(
                                    summary.obtained
                                  )}/${numberText(
                                    summary.maximum
                                  )}`
                                : "—"}
                            </p>

                          </div>

                          <div className="rounded-xl bg-white px-3 py-2 text-center">

                            <p className="text-[8px] font-black uppercase text-slate-400">
                              %
                            </p>

                            <p className="mt-1 text-xs font-black text-blue-700">
                              {summary.complete
                                ? `${summary.percentage.toFixed(
                                    1
                                  )}%`
                                : "—"}
                            </p>

                          </div>

                          <div className="rounded-xl bg-white px-3 py-2 text-center">

                            <p className="text-[8px] font-black uppercase text-slate-400">
                              Grade
                            </p>

                            <p className="mt-1 text-xs font-black text-emerald-700">
                              {summary.complete
                                ? summary.grade
                                : "—"}
                            </p>

                          </div>

                          <div className="hidden rounded-xl bg-white px-3 py-2 text-center sm:block">

                            <p className="text-[8px] font-black uppercase text-slate-400">
                              Rank
                            </p>

                            <p className="mt-1 text-xs font-black text-violet-700">
                              {summary.complete
                                ? result.rank ||
                                  "—"
                                : "—"}
                            </p>

                          </div>

                        </div>

                      </div>

                    </button>
                  );
                }
              )}

            </div>

          </section>

          {/* =================================================
              FOOTER
          ================================================= */}

          <footer className="border-t border-slate-200 py-6 text-center">

            <p className="text-xs font-black text-slate-500">
              Secure Student ERP
            </p>

            <p className="mt-1 text-[10px] text-slate-400">
              Results and fee records are shown from authenticated
              school records.
            </p>

          </footer>

        </div>

        {/* =================================================
            RECEIPT MODAL
        ================================================= */}

        {selectedPayment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">

            <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">

              <div className="flex items-start justify-between gap-4">

                <div>

                  <p className="text-[9px] font-black uppercase tracking-[.2em] text-violet-600">
                    Official Fee Receipt
                  </p>

                  <h2 className="mt-1 text-2xl font-black text-slate-900">
                    {
                      selectedPayment.receiptNo ||
                      selectedPayment.receiptNumber ||
                      "Receipt"
                    }
                  </h2>

                </div>

                <button
                  type="button"
                  onClick={() =>
                    setSelectedPayment(
                      null
                    )
                  }
                  className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700"
                >
                  Close
                </button>

              </div>

              <div className="mt-5 rounded-3xl border-4 border-emerald-700 bg-white p-5">

                <div className="text-center">

                  <p className="text-xl font-black text-emerald-800">
                    {
                      schoolSettings.schoolName ||
                      "XYZ PUBLIC SCHOOL"
                    }
                  </p>

                  <p className="mt-1 text-[9px] font-black uppercase tracking-[.2em] text-slate-400">
                    Official Fee Payment Receipt
                  </p>

                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">

                  <Info
                    label="Student"
                    value={studentName(
                      student
                    )}
                  />

                  <Info
                    label="Enrollment"
                    value={enrollment(
                      student
                    )}
                  />

                  <Info
                    label="Class / Section"
                    value={`${className(
                      student
                    )} / ${section(
                      student
                    )}`}
                  />

                  <Info
                    label="Receipt No."
                    value={
                      selectedPayment.receiptNo ||
                      selectedPayment.receiptNumber ||
                      "—"
                    }
                  />

                  <Info
                    label="Date"
                    value={
                      selectedPayment.date ||
                      dateText(
                        selectedPayment.timestamp ||
                          selectedPayment.createdAt
                      )
                    }
                  />

                  <Info
                    label="Method"
                    value={
                      selectedPayment.method ||
                      selectedPayment.paymentMethod ||
                      "—"
                    }
                  />

                </div>

                <div className="mt-5 rounded-2xl bg-emerald-50 p-5">

                  <p className="text-[9px] font-black uppercase tracking-wider text-emerald-600">
                    Current Payment
                  </p>

                  <p className="mt-1 text-3xl font-black text-emerald-900">
                    {money(
                      selectedPayment.amount
                    )}
                  </p>

                  <p className="mt-2 text-[10px] font-bold text-emerald-700">
                    {amountWords(
                      selectedPayment.amount
                    )}
                  </p>

                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">

                  <Info
                    label="Academic Fee"
                    value={money(
                      selectedPayment.academicFee ??
                        academicBreakdown.academicFee
                    )}
                  />

                  <Info
                    label="Transport Fee"
                    value={money(
                      selectedPayment.transportCharge ??
                        transportDisplayFee
                    )}
                  />

                  <Info
                    label="Total Paid"
                    value={money(
                      selectedPayment.totalPaidAfter ??
                        fees?.totalPaid
                    )}
                  />

                  <Info
                    label="Total Due"
                    value={money(
                      selectedPayment.totalDueAfter ??
                        fees?.totalDue
                    )}
                  />

                </div>

              </div>

              <button
                type="button"
                onClick={() =>
                  handleDownloadReceipt(
                    selectedPayment
                  )
                }
                className="mt-5 w-full rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-black text-white"
              >
                ⬇️ Download Professional Receipt PDF
              </button>

            </div>

          </div>
        )}

      </div>
    </StudentLayout>
  );
}

function Info({
  label,
  value,
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-1 break-words text-xs font-black text-slate-800">
        {value}
      </p>
    </div>
  );
}
