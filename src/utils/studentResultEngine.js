import jsPDF from "jspdf";
import QRCode from "qrcode";

/* =========================================================
   BASIC HELPERS
========================================================= */

export const num = (value) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
};

export const text = (value) =>
  String(value ?? "").trim();

export const lower = (value) =>
  text(value).toLowerCase();

export const money = (value) =>
  `₹${num(value).toLocaleString("en-IN")}`;

/* =========================================================
   DATE HELPERS
========================================================= */

export function dateText(value) {
  if (!value) {
    return "—";
  }

  if (
    value &&
    typeof value.toDate ===
      "function"
  ) {
    return value
      .toDate()
      .toLocaleDateString(
        "en-IN",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }
      );
  }

  if (value instanceof Date) {
    return value.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  }

  return text(value);
}

export const dateValue =
  dateText;

/* =========================================================
   TIMESTAMP
========================================================= */

export function timeValue(value) {
  if (!value) {
    return 0;
  }

  if (
    value &&
    typeof value.toMillis ===
      "function"
  ) {
    return value.toMillis();
  }

  if (
    value &&
    typeof value.toDate ===
      "function"
  ) {
    return value
      .toDate()
      .getTime();
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  const parsed =
    Date.parse(
      text(value)
    );

  return Number.isFinite(parsed)
    ? parsed
    : num(value);
}

/* =========================================================
   STUDENT HELPERS
========================================================= */

export function studentName(
  student = {}
) {
  return (
    student.name ||
    student.fullName ||
    student.studentName ||
    "Student"
  );
}

export function enrollment(
  student = {}
) {
  return (
    student.enrollmentNo ||
    student.enrollmentNumber ||
    student.admissionNo ||
    "—"
  );
}

export function className(
  student = {}
) {
  return (
    student.className ||
    student.class ||
    "—"
  );
}

export function section(
  student = {}
) {
  return (
    student.section ||
    student.sectionName ||
    "—"
  );
}

export function session(
  student = {}
) {
  return (
    student.session ||
    student.academicSession ||
    "—"
  );
}

/* =========================================================
   COMPATIBILITY ALIASES
   IMPORTANT:
   StudentResult.jsx may import these older names.
========================================================= */

export const displayStudentName =
  studentName;

export const displayEnrollment =
  enrollment;

export const displayClass =
  className;

export const displaySection =
  section;

export const displaySession =
  session;

/* =========================================================
   RESULT RECORD MATCHING
========================================================= */

export function belongsToStudent(
  record = {},
  student = {}
) {
  const recordIds = [
    record.studentId,
    record.studentUid,
    record.uid,
    record.studentID,
    record.studentDocId,
    record.student_id,
  ]
    .filter(Boolean)
    .map(String);

  const studentIds = [
    student.id,
    student.uid,
    student.authUid,
  ]
    .filter(Boolean)
    .map(String);

  if (
    recordIds.some(
      (id) =>
        studentIds.includes(
          id
        )
    )
  ) {
    return true;
  }

  const recordEnrollment =
    lower(
      record.enrollmentNo ??
        record.enrollmentNumber ??
        record.admissionNo
    );

  const studentEnrollment =
    lower(
      enrollment(student)
    );

  if (
    recordEnrollment &&
    studentEnrollment &&
    recordEnrollment ===
      studentEnrollment
  ) {
    return true;
  }

  const recordEmail =
    lower(
      record.email ??
        record.studentEmail ??
        record.studentEmailId
    );

  const studentEmail =
    lower(
      student.email ??
        student.accountEmail
    );

  if (
    recordEmail &&
    studentEmail &&
    recordEmail ===
      studentEmail
  ) {
    return true;
  }

  return false;
}

/* =========================================================
   RESULT PUBLISHED CHECK
========================================================= */

export function isPublished(
  record = {}
) {
  const state =
    lower(
      record.publishStatus ??
        record.resultStatus ??
        record.status ??
        record.state
    );

  return (
    record.published === true ||
    record.publish === true ||
    record.isPublished === true ||
    state === "published" ||
    state === "verified" ||
    state === "locked"
  );
}

export const isPublishedResult =
  isPublished;

/* =========================================================
   RESULT NAME
========================================================= */

export function resultTitle(
  record = {}
) {
  return (
    record.examName ||
    record.examinationName ||
    record.assessmentName ||
    record.assessment ||
    record.resultName ||
    record.title ||
    record.name ||
    "Examination"
  );
}

export const examTitle =
  resultTitle;

export const resultLabel =
  resultTitle;

/* =========================================================
   EXAMINATION TYPE
========================================================= */

export function resultType(
  record = {}
) {
  const value =
    lower(
      record.examType ||
        record.assessmentType ||
        record.resultType ||
        record.type ||
        resultTitle(record)
    );

  if (
    value.includes("annual") ||
    value.includes("final")
  ) {
    return "ANNUAL";
  }

  if (
    value.includes("half")
  ) {
    return "HALF YEARLY";
  }

  if (
    value.includes("mid")
  ) {
    return "MID TERM";
  }

  if (
    value.includes("unit")
  ) {
    return "UNIT TEST";
  }

  if (
    value.includes("periodic")
  ) {
    return "PERIODIC TEST";
  }

  if (
    value.includes("term")
  ) {
    return "TERM";
  }

  return resultTitle(
    record
  ).toUpperCase();
}

export const examType =
  resultType;

/* =========================================================
   GRADE SYSTEM
========================================================= */

export function gradeFromPercent(
  percentage
) {
  if (percentage >= 90) {
    return "A+";
  }

  if (percentage >= 80) {
    return "A";
  }

  if (percentage >= 70) {
    return "B+";
  }

  if (percentage >= 60) {
    return "B";
  }

  if (percentage >= 50) {
    return "C";
  }

  if (percentage >= 40) {
    return "D";
  }

  return "F";
}

export const calculateGrade =
  gradeFromPercent;

export function gradePoint(
  grade
) {
  const map = {
    "A+": 10,
    A: 9,
    "B+": 8,
    B: 7,
    C: 6,
    D: 5,
    F: 0,
  };

  return (
    map[
      String(
        grade || ""
      ).toUpperCase()
    ] ?? 0
  );
}

export function divisionFromPercent(
  percentage
) {
  if (percentage >= 60) {
    return "First Division";
  }

  if (percentage >= 45) {
    return "Second Division";
  }

  if (percentage >= 33) {
    return "Third Division";
  }

  return "Needs Improvement";
}

export const calculateDivision =
  divisionFromPercent;

/* =========================================================
   GENERIC MARK READER
========================================================= */

function readValue(
  item,
  keys
) {
  for (
    const key of keys
  ) {
    if (
      item?.[key] !==
        undefined &&
      item?.[key] !==
        null &&
      item?.[key] !==
        ""
    ) {
      return num(
        item[key]
      );
    }
  }

  return 0;
}

/* =========================================================
   SUBJECT NORMALIZATION
========================================================= */

export function normalizeSubject(
  item = {},
  index = 0
) {
  const theoryMax =
    readValue(
      item,
      [
        "theoryMax",
        "theoryMaximum",
        "maxTheory",
        "theoryTotal",
      ]
    );

  const practicalMax =
    readValue(
      item,
      [
        "practicalMax",
        "practicalMaximum",
        "maxPractical",
        "practicalTotal",
      ]
    );

  const internalMax =
    readValue(
      item,
      [
        "internalMax",
        "internalMaximum",
        "maxInternal",
        "internalTotal",
      ]
    );

  const projectMax =
    readValue(
      item,
      [
        "projectMax",
        "projectMaximum",
        "maxProject",
        "projectTotal",
      ]
    );

  const theory =
    readValue(
      item,
      [
        "theoryObtained",
        "theoryMarksObtained",
        "obtainedTheory",
        "theoryMarks",
        "theory",
      ]
    );

  const practical =
    readValue(
      item,
      [
        "practicalObtained",
        "practicalMarksObtained",
        "obtainedPractical",
        "practicalMarks",
        "practical",
      ]
    );

  const internal =
    readValue(
      item,
      [
        "internalObtained",
        "internalMarksObtained",
        "obtainedInternal",
        "internalMarks",
        "internal",
      ]
    );

  const project =
    readValue(
      item,
      [
        "projectObtained",
        "projectMarksObtained",
        "obtainedProject",
        "projectMarks",
        "project",
      ]
    );

  const directMax =
    readValue(
      item,
      [
        "maxMarks",
        "maximumMarks",
        "fullMarks",
        "totalMaximum",
        "max",
      ]
    );

  const directObtained =
    readValue(
      item,
      [
        "obtainedMarks",
        "marksObtained",
        "totalObtained",
        "obtained",
        "marks",
        "score",
      ]
    );

  const passingMarks =
    readValue(
      item,
      [
        "passingMarks",
        "passMarks",
        "minimumMarks",
        "minMarks",
      ]
    );

  const componentMaximum =
    theoryMax +
    practicalMax +
    internalMax +
    projectMax;

  const componentObtained =
    theory +
    practical +
    internal +
    project;

  const maxMarks =
    componentMaximum > 0
      ? componentMaximum
      : directMax || 100;

  const obtainedMarks =
    componentMaximum > 0 ||
    componentObtained > 0
      ? componentObtained
      : directObtained;

  const percentage =
    num(
      item.percentage
    ) ||
    (
      maxMarks > 0
        ? (
            obtainedMarks /
            maxMarks
          ) * 100
        : 0
    );

  const grade =
    item.grade ||
    item.letterGrade ||
    gradeFromPercent(
      percentage
    );

  const passed =
    item.passed !==
      undefined
      ? Boolean(
          item.passed
        )
      : passingMarks > 0
        ? obtainedMarks >=
          passingMarks
        : percentage >= 33;

  return {
    id:
      item.id ||
      item.subjectId ||
      item.code ||
      `subject-${index + 1}`,

    subjectId:
      item.subjectId ||
      "",

    code:
      item.code ||
      item.subjectCode ||
      "",

    name:
      item.subjectName ||
      item.name ||
      item.subject ||
      item.title ||
      `Subject ${
        index + 1
      }`,

    type:
      item.type ||
      item.subjectType ||
      "Core",

    theory,
    theoryMax,

    practical,
    practicalMax,

    internal,
    internalMax,

    project,
    projectMax,

    obtainedMarks,

    maxMarks,

    passingMarks,

    percentage:
      Math.max(
        0,
        Math.min(
          100,
          percentage
        )
      ),

    grade,

    gradePoint:
      gradePoint(
        grade
      ),

    passed,
  };
}

/* =========================================================
   GET SUBJECTS FROM RESULT
========================================================= */

export function getSubjects(
  record = {}
) {
  const source =
    record.subjects ??
    record.subjectMarks ??
    record.marks ??
    record.details ??
    record.markDetails ??
    record.marksDetails ??
    record.subjectResults ??
    [];

  if (
    Array.isArray(
      source
    )
  ) {
    return source.map(
      normalizeSubject
    );
  }

  if (
    source &&
    typeof source ===
      "object"
  ) {
    return Object.entries(
      source
    ).map(
      (
        [
          key,
          value,
        ],
        index
      ) => {
        if (
          value &&
          typeof value ===
            "object"
        ) {
          return normalizeSubject(
            {
              ...value,
              subjectName:
                value.subjectName ||
                value.name ||
                key,
            },
            index
          );
        }

        return normalizeSubject(
          {
            subjectName:
              key,
            marks:
              value,
            maxMarks:
              100,
          },
          index
        );
      }
    );
  }

  return [];
}

export const getResultSubjects =
  getSubjects;

/* =========================================================
   RESULT SUMMARY
========================================================= */

export function summarize(
  record = {}
) {
  const subjects =
    getSubjects(
      record
    );

  const subjectMax =
    subjects.reduce(
      (
        total,
        subject
      ) =>
        total +
        num(
          subject.maxMarks
        ),
      0
    );

  const subjectObtained =
    subjects.reduce(
      (
        total,
        subject
      ) =>
        total +
        num(
          subject.obtainedMarks
        ),
      0
    );

  const maxMarks =
    num(
      record.totalMaximum ??
        record.maximumMarks ??
        record.maxMarks ??
        record.totalMax
    ) || subjectMax;

  const obtainedMarks =
    num(
      record.totalObtained ??
        record.obtainedMarks ??
        record.marksObtained ??
        record.obtained ??
        record.totalMarks
    ) || subjectObtained;

  const percentage =
    num(
      record.percentage
    ) ||
    (
      maxMarks > 0
        ? (
            obtainedMarks /
            maxMarks
          ) * 100
        : 0
    );

  const failedSubjects =
    subjects.filter(
      (subject) =>
        !subject.passed
    );

  const passedSubjects =
    subjects.filter(
      (subject) =>
        subject.passed
    );

  const pass =
    record.pass !==
      undefined
      ? Boolean(
          record.pass
        )
      : failedSubjects.length ===
            0 &&
          percentage >= 33;

  const theoryMaximum =
    subjects.reduce(
      (
        total,
        subject
      ) =>
        total +
        num(
          subject.theoryMax
        ),
      0
    );

  const theoryObtained =
    subjects.reduce(
      (
        total,
        subject
      ) =>
        total +
        num(
          subject.theory
        ),
      0
    );

  const practicalMaximum =
    subjects.reduce(
      (
        total,
        subject
      ) =>
        total +
        num(
          subject.practicalMax
        ),
      0
    );

  const practicalObtained =
    subjects.reduce(
      (
        total,
        subject
      ) =>
        total +
        num(
          subject.practical
        ),
      0
    );

  const internalMaximum =
    subjects.reduce(
      (
        total,
        subject
      ) =>
        total +
        num(
          subject.internalMax
        ),
      0
    );

  const internalObtained =
    subjects.reduce(
      (
        total,
        subject
      ) =>
        total +
        num(
          subject.internal
        ),
      0
    );

  const projectMaximum =
    subjects.reduce(
      (
        total,
        subject
      ) =>
        total +
        num(
          subject.projectMax
        ),
      0
    );

  const projectObtained =
    subjects.reduce(
      (
        total,
        subject
      ) =>
        total +
        num(
          subject.project
        ),
      0
    );

  return {
    subjects,

    maxMarks,

    obtainedMarks,

    percentage:
      Math.max(
        0,
        Math.min(
          100,
          percentage
        )
      ),

    grade:
      record.overallGrade ||
      record.grade ||
      gradeFromPercent(
        percentage
      ),

    division:
      record.division ||
      record.divisionName ||
      divisionFromPercent(
        percentage
      ),

    pass,

    passedSubjects:
      passedSubjects.length,

    failedSubjects,

    theoryMaximum,
    theoryObtained,

    practicalMaximum,
    practicalObtained,

    internalMaximum,
    internalObtained,

    projectMaximum,
    projectObtained,
  };
}

export const getResultSummary =
  summarize;

/* =========================================================
   FINAL CONSOLIDATION
========================================================= */

export function makeConsolidatedResult(
  exams = []
) {
  const validExams =
    exams.filter(Boolean);

  if (
    validExams.length ===
    0
  ) {
    return null;
  }

  const subjectMap =
    new Map();

  validExams.forEach(
    (exam) => {
      const summary =
        summarize(
          exam
        );

      summary.subjects.forEach(
        (subject) => {
          const key =
            lower(
              subject.subjectId ||
                subject.code ||
                subject.name
            );

          if (!key) {
            return;
          }

          if (
            !subjectMap.has(
              key
            )
          ) {
            subjectMap.set(
              key,
              {
                id: key,

                name:
                  subject.name,

                code:
                  subject.code,

                type:
                  subject.type,

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
                num(
                  subject.maxMarks
                ),

              obtainedMarks:
                num(
                  subject.obtainedMarks
                ),

              percentage:
                num(
                  subject.percentage
                ),

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
      (item) => {
        const maxMarks =
          item.examRows.reduce(
            (
              total,
              row
            ) =>
              total +
              num(
                row.maxMarks
              ),
            0
          );

        const obtainedMarks =
          item.examRows.reduce(
            (
              total,
              row
            ) =>
              total +
              num(
                row.obtainedMarks
              ),
            0
          );

        const percentage =
          maxMarks > 0
            ? (
                obtainedMarks /
                maxMarks
              ) * 100
            : 0;

        return {
          ...item,

          maxMarks,

          obtainedMarks,

          percentage,

          grade:
            gradeFromPercent(
              percentage
            ),

          gradePoint:
            gradePoint(
              gradeFromPercent(
                percentage
              )
            ),

          passed:
            percentage >= 33,
        };
      }
    );

  const maxMarks =
    subjects.reduce(
      (
        total,
        subject
      ) =>
        total +
        num(
          subject.maxMarks
        ),
      0
    );

  const obtainedMarks =
    subjects.reduce(
      (
        total,
        subject
      ) =>
        total +
        num(
          subject.obtainedMarks
        ),
      0
    );

  const percentage =
    maxMarks > 0
      ? (
          obtainedMarks /
          maxMarks
        ) * 100
      : 0;

  return {
    id:
      `consolidated-${validExams
        .map(
          (exam) =>
            exam.id
        )
        .join("-")}`,

    examName:
      "Final Consolidated Result",

    examinationName:
      "Final Consolidated Result",

    examType:
      "FINAL",

    sourceExamIds:
      validExams.map(
        (exam) =>
          exam.id
      ),

    sourceExams:
      validExams.map(
        (exam) => ({
          id: exam.id,

          title:
            resultTitle(
              exam
            ),

          type:
            resultType(
              exam
            ),

          percentage:
            summarize(
              exam
            ).percentage,
        })
      ),

    subjects,

    maxMarks,

    obtainedMarks,

    percentage,

    grade:
      gradeFromPercent(
        percentage
      ),

    division:
      divisionFromPercent(
        percentage
      ),

    pass:
      subjects.every(
        (subject) =>
          subject.passed
      ) &&
      percentage >=
        33,

    passedSubjects:
      subjects.filter(
        (subject) =>
          subject.passed
      ).length,

    failedSubjects:
      subjects.filter(
        (subject) =>
          !subject.passed
      ),
  };
}

/* =========================================================
   QR VERIFICATION
========================================================= */

export function verificationUrl(
  result,
  student
) {
  const params =
    new URLSearchParams({
      result:
        result?.id ||
        "",

      student:
        student?.id ||
        student?.uid ||
        "",

      enrollment:
        enrollment(
          student
        ),
    });

  return `${
    window.location.origin
  }/verify-result?${params.toString()}`;
}

export async function qrDataUrl(
  url
) {
  return QRCode.toDataURL(
    url,
    {
      width: 240,

      margin: 2,

      errorCorrectionLevel:
        "M",

      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    }
  );
}

/* =========================================================
   PDF HEADER
========================================================= */

function addPdfHeader(
  pdf,
  title,
  subtitle
) {
  pdf.setFillColor(
    6,
    95,
    70
  );

  pdf.rect(
    0,
    0,
    210,
    38,
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
    "XYZ PUBLIC SCHOOL",
    105,
    14,
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
    9
  );

  pdf.text(
    title,
    105,
    22,
    {
      align:
        "center",
    }
  );

  pdf.setFontSize(
    7
  );

  pdf.text(
    subtitle,
    105,
    30,
    {
      align:
        "center",
    }
  );
}

/* =========================================================
   PDF STUDENT BLOCK
========================================================= */

function addPdfStudent(
  pdf,
  student,
  y
) {
  pdf.setFillColor(
    248,
    250,
    252
  );

  pdf.setDrawColor(
    226,
    232,
    240
  );

  pdf.roundedRect(
    15,
    y,
    180,
    29,
    3,
    3,
    "FD"
  );

  pdf.setFont(
    "helvetica",
    "bold"
  );

  pdf.setFontSize(
    7
  );

  pdf.setTextColor(
    100,
    116,
    139
  );

  pdf.text(
    "STUDENT",
    20,
    y + 7
  );

  pdf.text(
    "ENROLLMENT",
    78,
    y + 7
  );

  pdf.text(
    "CLASS",
    136,
    y + 7
  );

  pdf.setFontSize(
    9
  );

  pdf.setTextColor(
    15,
    23,
    42
  );

  pdf.text(
    studentName(
      student
    ),
    20,
    y + 15
  );

  pdf.text(
    enrollment(
      student
    ),
    78,
    y + 15
  );

  pdf.text(
    `${className(
      student
    )} - ${section(
      student
    )}`,
    136,
    y + 15
  );

  pdf.setFont(
    "helvetica",
    "normal"
  );

  pdf.setFontSize(
    7
  );

  pdf.setTextColor(
    100,
    116,
    139
  );

  pdf.text(
    `Academic Session: ${session(
      student
    )}`,
    20,
    y + 24
  );

  return y + 37;
}

/* =========================================================
   RESULT PDF
========================================================= */

export async function buildResultPdf(
  student,
  result
) {
  const summary =
    result?.subjects
      ? result
      : summarize(
          result
        );

  const pdf =
    new jsPDF({
      unit: "mm",
      format: "a4",
      orientation:
        "portrait",
    });

  addPdfHeader(
    pdf,
    resultTitle(
      result
    ),
    `${resultType(
      result
    )} • ${session(
      student
    )}`
  );

  let y =
    addPdfStudent(
      pdf,
      student,
      46
    );

  pdf.setFont(
    "helvetica",
    "bold"
  );

  pdf.setFontSize(
    12
  );

  pdf.setTextColor(
    6,
    95,
    70
  );

  pdf.text(
    "Detailed Mark Sheet",
    15,
    y
  );

  y += 8;

  const headers = [
    [
      "Subject",
      15,
    ],
    [
      "Maximum",
      77,
    ],
    [
      "Obtained",
      108,
    ],
    [
      "Grade",
      142,
    ],
    [
      "Status",
      169,
    ],
  ];

  pdf.setFillColor(
    6,
    95,
    70
  );

  pdf.rect(
    15,
    y,
    180,
    10,
    "F"
  );

  pdf.setTextColor(
    255,
    255,
    255
  );

  pdf.setFontSize(
    7
  );

  headers.forEach(
    (
      [
        label,
        x,
      ]
    ) =>
      pdf.text(
        label,
        x + 2,
        y + 6.5
      )
  );

  y += 10;

  summary.subjects.forEach(
    (
      subject,
      index
    ) => {
      if (
        y > 255
      ) {
        pdf.addPage();

        addPdfHeader(
          pdf,
          resultTitle(
            result
          ),
          "Continued"
        );

        y = 42;

        pdf.setFillColor(
          6,
          95,
          70
        );

        pdf.rect(
          15,
          y,
          180,
          10,
          "F"
        );

        pdf.setTextColor(
          255,
          255,
          255
        );

        pdf.setFontSize(
          7
        );

        headers.forEach(
          (
            [
              label,
              x,
            ]
          ) =>
            pdf.text(
              label,
              x + 2,
              y + 6.5
            )
        );

        y += 10;
      }

      if (
        index %
          2 ===
        1
      ) {
        pdf.setFillColor(
          248,
          250,
          252
        );

        pdf.rect(
          15,
          y,
          180,
          12,
          "F"
        );
      }

      pdf.setDrawColor(
        226,
        232,
        240
      );

      pdf.rect(
        15,
        y,
        180,
        12,
        "S"
      );

      pdf.setFont(
        "helvetica",
        "bold"
      );

      pdf.setFontSize(
        7
      );

      pdf.setTextColor(
        15,
        23,
        42
      );

      pdf.text(
        `${subject.name}${
          subject.code
            ? ` (${subject.code})`
            : ""
        }`.substring(
          0,
          36
        ),
        18,
        y + 7
      );

      pdf.text(
        String(
          num(
            subject.maxMarks
          )
        ),
        79,
        y + 7
      );

      pdf.text(
        String(
          num(
            subject.obtainedMarks
          )
        ),
        110,
        y + 7
      );

      pdf.setTextColor(
        subject.passed
          ? 6
          : 220,
        subject.passed
          ? 95
          : 38,
        subject.passed
          ? 70
          : 38
      );

      pdf.text(
        subject.grade ||
          gradeFromPercent(
            subject.percentage
          ),
        144,
        y + 7
      );

      pdf.text(
        subject.passed
          ? "PASS"
          : "FAIL",
        171,
        y + 7
      );

      y += 12;
    }
  );

  if (
    y > 237
  ) {
    pdf.addPage();

    addPdfHeader(
      pdf,
      resultTitle(
        result
      ),
      "Summary"
    );

    y = 42;
  } else {
    y += 7;
  }

  pdf.setFillColor(
    236,
    253,
    245
  );

  pdf.roundedRect(
    15,
    y,
    180,
    51,
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
    9
  );

  pdf.text(
    "OVERALL RESULT SUMMARY",
    20,
    y + 9
  );

  pdf.setTextColor(
    15,
    23,
    42
  );

  pdf.setFontSize(
    8
  );

  pdf.text(
    `Obtained: ${num(
      summary.obtainedMarks
    )}/${num(
      summary.maxMarks
    )}`,
    20,
    y + 18
  );

  pdf.text(
    `Percentage: ${num(
      summary.percentage
    ).toFixed(
      2
    )}%`,
    78,
    y + 18
  );

  pdf.text(
    `Overall Grade: ${
      summary.grade
    }`,
    140,
    y + 18
  );

  pdf.text(
    `Division: ${
      summary.division ||
      "—"
    }`,
    20,
    y + 28
  );

  pdf.text(
    `Passed Subjects: ${
      summary.passedSubjects
    }`,
    78,
    y + 28
  );

  if (
    result.rank
  ) {
    pdf.text(
      `Overall Rank: ${result.rank}`,
      140,
      y + 28
    );
  }

  pdf.text(
    `Theory: ${num(
      summary.theoryObtained
    )}/${num(
      summary.theoryMaximum
    )}`,
    20,
    y + 38
  );

  pdf.text(
    `Practical: ${num(
      summary.practicalObtained
    )}/${num(
      summary.practicalMaximum
    )}`,
    78,
    y + 38
  );

  pdf.text(
    `Internal: ${num(
      summary.internalObtained
    )}/${num(
      summary.internalMaximum
    )}`,
    140,
    y + 38
  );

  pdf.text(
    `Project: ${num(
      summary.projectObtained
    )}/${num(
      summary.projectMaximum
    )}`,
    20,
    y + 47
  );

  pdf.text(
    summary.pass
      ? "STATUS: PASS"
      : "STATUS: NEEDS IMPROVEMENT",
    78,
    y + 47
  );

  pdf.setDrawColor(
    226,
    232,
    240
  );

  pdf.line(
    15,
    275,
    195,
    275
  );

  pdf.setTextColor(
    100,
    116,
    139
  );

  pdf.setFont(
    "helvetica",
    "normal"
  );

  pdf.setFontSize(
    7
  );

  pdf.text(
    "Computer-generated published academic record.",
    105,
    284,
    {
      align:
        "center",
    }
  );

  pdf.text(
    "Verify the document through the Student Portal.",
    105,
    290,
    {
      align:
        "center",
    }
  );

  return pdf;
}

/* =========================================================
   PDF + QR
========================================================= */

export async function buildQrPdfResult(
  student,
  result,
  qrUrl
) {
  const pdf =
    await buildResultPdf(
      student,
      result
    );

  try {
    const qr =
      await qrDataUrl(
        qrUrl
      );

    pdf.addImage(
      qr,
      "PNG",
      156,
      232,
      30,
      30
    );

    pdf.setFont(
      "helvetica",
      "bold"
    );

    pdf.setFontSize(
      6
    );

    pdf.setTextColor(
      100,
      116,
      139
    );

    pdf.text(
      "SCAN TO VERIFY",
      171,
      266,
      {
        align:
          "center",
      }
    );
  } catch (
    error
  ) {
    console.error(
      "QR PDF generation error:",
      error
    );
  }

  return pdf;
}

/* =========================================================
   DEFAULT EXPORT
========================================================= */

export default {
  num,
  text,
  lower,
  money,

  timeValue,
  dateText,
  dateValue,

  studentName,
  enrollment,
  className,
  section,
  session,

  displayStudentName,
  displayEnrollment,
  displayClass,
  displaySection,
  displaySession,

  belongsToStudent,
  isPublished,
  isPublishedResult,

  resultTitle,
  resultLabel,
  resultType,
  examTitle,
  examType,

  gradeFromPercent,
  calculateGrade,

  divisionFromPercent,
  calculateDivision,

  normalizeSubject,
  getSubjects,
  getResultSubjects,

  summarize,
  getResultSummary,

  makeConsolidatedResult,

  qrDataUrl,
  verificationUrl,

  buildResultPdf,
  buildQrPdfResult,
};