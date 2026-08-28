import jsPDF from "jspdf";

/* =========================================================
   BASIC HELPERS
========================================================= */

export const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

export const normalized = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

export const formatINR = (value) =>
  `₹${toNumber(value).toLocaleString(
    "en-IN"
  )}`;

export const money = formatINR;

export const formatDate = (value) => {
  if (!value) return "—";

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

  return String(value);
};

export const dateText = formatDate;

export const timestampValue = (
  value
) => {
  if (!value) return 0;

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
    return value.toDate().getTime();
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  const parsed = Date.parse(
    String(value)
  );

  return Number.isFinite(parsed)
    ? parsed
    : toNumber(value);
};

/* =========================================================
   STUDENT HELPERS
========================================================= */

export const studentDisplayName = (
  student
) =>
  student?.name ||
  student?.fullName ||
  student?.studentName ||
  "Student";

export const enrollmentDisplay = (
  student
) =>
  student?.enrollmentNo ||
  student?.enrollmentNumber ||
  student?.admissionNo ||
  "—";

export const classDisplay = (
  student
) =>
  student?.className ||
  student?.class ||
  "—";

export const studentClass =
  classDisplay;

export const sectionDisplay = (
  student
) =>
  student?.section ||
  student?.sectionName ||
  "—";

export const studentSection =
  sectionDisplay;

export const sessionDisplay = (
  student
) =>
  student?.session ||
  student?.academicSession ||
  "2026 - 2027";

export const studentSession =
  sessionDisplay;

/* =========================================================
   STUDENT RECORD MATCHING
========================================================= */

export function recordBelongsToStudent(
  record,
  student
) {
  const recordIds = [
    record?.studentId,
    record?.studentUid,
    record?.uid,
    record?.studentID,
    record?.studentDocId,
  ]
    .filter(Boolean)
    .map(String);

  const studentIds = [
    student?.id,
    student?.uid,
    student?.authUid,
  ]
    .filter(Boolean)
    .map(String);

  if (
    recordIds.some((id) =>
      studentIds.includes(id)
    )
  ) {
    return true;
  }

  const recordEnrollment =
    normalized(
      record?.enrollmentNo ??
        record?.enrollmentNumber ??
        record?.admissionNo
    );

  const studentEnrollment =
    normalized(
      enrollmentDisplay(student)
    );

  if (
    recordEnrollment &&
    studentEnrollment &&
    recordEnrollment ===
      studentEnrollment
  ) {
    return true;
  }

  return false;
}

/* =========================================================
   RESULT HELPERS
========================================================= */

export function isPublishedResult(
  record
) {
  const state = normalized(
    record?.publishStatus ??
      record?.resultStatus ??
      record?.status ??
      record?.state
  );

  return (
    record?.published === true ||
    record?.publish === true ||
    record?.isPublished === true ||
    state === "published"
  );
}

export function resultLabel(
  record
) {
  return (
    record?.examName ||
    record?.examinationName ||
    record?.assessmentName ||
    record?.assessment ||
    record?.name ||
    "Academic Result"
  );
}

export const resultTitle =
  resultLabel;

export function resultCategory(
  record
) {
  const value = normalized(
    record?.examType ||
      record?.assessmentType ||
      record?.type ||
      resultLabel(record)
  );

  if (
    value.includes("annual") ||
    value.includes("final")
  ) {
    return "ANNUAL";
  }

  if (
    value.includes(
      "half"
    )
  ) {
    return "HALF YEARLY";
  }

  if (
    value.includes(
      "mid"
    )
  ) {
    return "MID TERM";
  }

  if (
    value.includes(
      "unit"
    )
  ) {
    return "UNIT TEST";
  }

  if (
    value.includes(
      "practical"
    )
  ) {
    return "PRACTICAL";
  }

  return String(
    resultLabel(record)
  ).toUpperCase();
}

/* =========================================================
   MARKS READING
========================================================= */

function readValue(
  item,
  keys
) {
  for (const key of keys) {
    if (
      item?.[key] !==
        undefined &&
      item?.[key] !== null &&
      item?.[key] !== ""
    ) {
      return toNumber(
        item[key]
      );
    }
  }

  return 0;
}

export function gradeFromPercentage(
  percentage
) {
  if (percentage >= 90)
    return "A+";

  if (percentage >= 80)
    return "A";

  if (percentage >= 70)
    return "B+";

  if (percentage >= 60)
    return "B";

  if (percentage >= 50)
    return "C";

  if (percentage >= 40)
    return "D";

  return "F";
}

export function divisionFromPercentage(
  percentage
) {
  if (percentage >= 60)
    return "First Division";

  if (percentage >= 45)
    return "Second Division";

  if (percentage >= 33)
    return "Third Division";

  return "Needs Improvement";
}

/* =========================================================
   NORMALIZE ONE SUBJECT
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

  const theory =
    readValue(
      item,
      [
        "theoryObtained",
        "theoryMarksObtained",
        "obtainedTheory",
        "theoryMarks",
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
      ]
    );

  const hasComponentMaximum =
    theoryMax +
      practicalMax +
      internalMax +
      projectMax >
    0;

  const maxMarks =
    hasComponentMaximum
      ? theoryMax +
        practicalMax +
        internalMax +
        projectMax
      : directMax ||
        100;

  const hasComponentObtained =
    theory +
      practical +
      internal +
      project >
    0;

  const obtainedMarks =
    hasComponentObtained
      ? theory +
        practical +
        internal +
        project
      : directObtained;

  const passingMarks =
    readValue(
      item,
      [
        "passingMarks",
        "passMarks",
        "minimumMarks",
      ]
    );

  const percentage =
    toNumber(
      item?.percentage
    ) ||
    (maxMarks > 0
      ? (obtainedMarks /
          maxMarks) *
        100
      : 0);

  const grade =
    item?.grade ||
    item?.letterGrade ||
    gradeFromPercentage(
      percentage
    );

  const passed =
    item?.passed !==
      undefined
      ? Boolean(
          item.passed
        )
      : passingMarks >
          0
        ? obtainedMarks >=
          passingMarks
        : percentage >=
          33;

  return {
    id:
      item?.id ||
      item?.subjectId ||
      item?.code ||
      `subject-${index + 1}`,

    subjectId:
      item?.subjectId ||
      "",

    code:
      item?.code ||
      item?.subjectCode ||
      "",

    name:
      item?.subjectName ||
      item?.name ||
      item?.subject ||
      `Subject ${index + 1}`,

    type:
      item?.type ||
      item?.subjectType ||
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
    passed,
  };
}

/* =========================================================
   RESULT SUBJECT LIST
========================================================= */

export function getResultSubjects(
  result = {}
) {
  const source =
    result?.subjects ??
    result?.subjectMarks ??
    result?.marks ??
    result?.details ??
    result?.markDetails ??
    result?.marksDetails ??
    [];

  if (
    Array.isArray(source)
  ) {
    return source.map(
      (item, index) =>
        normalizeSubject(
          item,
          index
        )
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
      ([key, value], index) => {
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
            subjectName: key,
            marks: value,
            maxMarks: 100,
          },
          index
        );
      }
    );
  }

  return [];
}

/* =========================================================
   RESULT SUMMARY
========================================================= */

export function getResultSummary(
  record = {}
) {
  const subjects =
    getResultSubjects(
      record
    );

  const subjectMaximum =
    subjects.reduce(
      (sum, subject) =>
        sum +
        toNumber(
          subject.maxMarks
        ),
      0
    );

  const subjectObtained =
    subjects.reduce(
      (sum, subject) =>
        sum +
        toNumber(
          subject.obtainedMarks
        ),
      0
    );

  const maxMarks =
    toNumber(
      record?.totalMaximum ??
        record?.maximumMarks ??
        record?.maxMarks
    ) ||
    subjectMaximum;

  const obtainedMarks =
    toNumber(
      record?.totalObtained ??
        record?.obtainedMarks ??
        record?.marksObtained ??
        record?.obtained
    ) ||
    subjectObtained;

  const percentage =
    toNumber(
      record?.percentage
    ) ||
    (maxMarks > 0
      ? (obtainedMarks /
          maxMarks) *
        100
      : 0);

  const theoryMaximum =
    subjects.reduce(
      (sum, subject) =>
        sum +
        toNumber(
          subject.theoryMax
        ),
      0
    );

  const theoryObtained =
    subjects.reduce(
      (sum, subject) =>
        sum +
        toNumber(
          subject.theory
        ),
      0
    );

  const practicalMaximum =
    subjects.reduce(
      (sum, subject) =>
        sum +
        toNumber(
          subject.practicalMax
        ),
      0
    );

  const practicalObtained =
    subjects.reduce(
      (sum, subject) =>
        sum +
        toNumber(
          subject.practical
        ),
      0
    );

  const internalMaximum =
    subjects.reduce(
      (sum, subject) =>
        sum +
        toNumber(
          subject.internalMax
        ),
      0
    );

  const internalObtained =
    subjects.reduce(
      (sum, subject) =>
        sum +
        toNumber(
          subject.internal
        ),
      0
    );

  const projectMaximum =
    subjects.reduce(
      (sum, subject) =>
        sum +
        toNumber(
          subject.projectMax
        ),
      0
    );

  const projectObtained =
    subjects.reduce(
      (sum, subject) =>
        sum +
        toNumber(
          subject.project
        ),
      0
    );

  const failedSubjects =
    subjects.filter(
      (subject) =>
        !subject.passed
    );

  const pass =
    record?.pass !==
      undefined
      ? Boolean(
          record.pass
        )
      : failedSubjects.length ===
            0 &&
          percentage >=
            33;

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
      record?.overallGrade ||
      record?.grade ||
      gradeFromPercentage(
        percentage
      ),

    division:
      record?.division ||
      record?.divisionName ||
      divisionFromPercentage(
        percentage
      ),

    pass,

    passedSubjects:
      Math.max(
        0,
        subjects.length -
          failedSubjects.length
      ),

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

/* =========================================================
   FEE CALCULATION
========================================================= */

export function getFeeSnapshot(
  student = {},
  feeSettings = {},
  feeStructures = {}
) {
  const className =
    student?.className ||
    student?.class ||
    "";

  let structure = null;

  const classCandidates = [
    `class-${className}`,
    String(className),
    String(
      student?.classId ||
        ""
    ),
  ];

  for (
    const key of classCandidates
  ) {
    if (
      key &&
      feeStructures?.[key]
    ) {
      structure =
        feeStructures[
          key
        ];
      break;
    }
  }

  const academicFee =
    structure
      ? toNumber(
          structure.tuitionFee
        ) +
        toNumber(
          structure.examFee
        ) +
        toNumber(
          structure.otherFee
        )
      : toNumber(
          student?.annualFee ??
            student?.academicFee ??
            feeSettings?.[
              className
            ] ??
            feeSettings?.[
              `class${className}`
            ] ??
            0
        );

  const transportCharge =
    toNumber(
      student?.transportFee ??
        student?.transportCharge ??
        student?.transportationFee ??
        student?.transportAmount ??
        structure?.transportFee ??
        structure?.transportationFee ??
        0
    );

  const academicPaid =
    toNumber(
      student?.academicPaid ??
        student?.paidFee ??
        0
    );

  const transportPaid =
    toNumber(
      student?.transportPaid ??
        student?.transportationPaid ??
        0
    );

  const academicDue =
    Math.max(
      0,
      academicFee -
        academicPaid
    );

  const transportDue =
    Math.max(
      0,
      transportCharge -
        transportPaid
    );

  const totalPaid =
    academicPaid +
    transportPaid;

  const totalDue =
    academicDue +
    transportDue;

  const grandTotal =
    academicFee +
    transportCharge;

  return {
    academicFee,
    annualFee:
      academicFee,

    transportCharge,
    transportFee:
      transportCharge,

    academicPaid,
    academicDue,

    transportPaid,
    transportDue,

    totalPaid,
    totalDue,

    grandTotal,

    isFullyPaid:
      totalDue <= 0,

    status:
      totalDue <= 0
        ? "PAID"
        : totalPaid > 0
          ? "PARTIAL"
          : "DUE",
  };
}

/* =========================================================
   PAYMENT NORMALIZATION
========================================================= */

export function normalizePayment(
  payment = {},
  student = {},
  fee = {}
) {
  return {
    ...payment,

    amount:
      toNumber(
        payment?.amount
      ),

    feeType:
      payment?.feeType ||
      "ACADEMIC",

    receiptNo:
      payment?.receiptNo ||
      payment?.receiptNumber ||
      "Receipt",

    date:
      payment?.date ||
      formatDate(
        payment?.timestamp
      ),

    time:
      payment?.time ||
      payment?.paymentTime ||
      "—",

    method:
      payment?.method ||
      payment?.paymentMethod ||
      payment?.mode ||
      "—",

    annualFee:
      toNumber(
        payment?.annualFee ??
          payment?.academicFee ??
          fee?.academicFee ??
          student?.annualFee
      ),

    transportCharge:
      toNumber(
        payment?.transportCharge ??
          payment?.transportFee ??
          payment?.transportationFee ??
          fee?.transportCharge ??
          student?.transportFee
      ),

    academicPaidAfter:
      toNumber(
        payment?.academicPaidAfter ??
          payment?.academicPaid ??
          fee?.academicPaid
      ),

    academicDueAfter:
      toNumber(
        payment?.academicDueAfter ??
          payment?.academicDue ??
          fee?.academicDue
      ),

    transportPaidAfter:
      toNumber(
        payment?.transportPaidAfter ??
          payment?.transportPaid ??
          fee?.transportPaid
      ),

    transportDueAfter:
      toNumber(
        payment?.transportDueAfter ??
          payment?.transportDue ??
          fee?.transportDue
      ),

    totalPaidAfter:
      toNumber(
        payment?.totalPaidAfter ??
          payment?.totalPaid ??
          fee?.totalPaid
      ),

    totalDueAfter:
      toNumber(
        payment?.totalDueAfter ??
          payment?.totalDue ??
          fee?.totalDue
      ),
  };
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
    36,
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
      align: "center",
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
      align: "center",
    }
  );

  pdf.setFontSize(
    7
  );

  pdf.text(
    subtitle,
    105,
    29,
    {
      align: "center",
    }
  );
}

/* =========================================================
   PDF STUDENT BLOCK
========================================================= */

function addPdfStudentBlock(
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
    28,
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
    studentDisplayName(
      student
    ),
    20,
    y + 15
  );

  pdf.text(
    enrollmentDisplay(
      student
    ),
    78,
    y + 15
  );

  pdf.text(
    `${classDisplay(
      student
    )} - ${sectionDisplay(
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
    `Academic Session: ${sessionDisplay(
      student
    )}`,
    20,
    y + 23
  );

  return y + 36;
}

/* =========================================================
   RESULT PDF
========================================================= */

export function buildResultPdf(
  student,
  result
) {
  const summary =
    getResultSummary(
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
    "ACADEMIC PERFORMANCE REPORT",
    `${resultCategory(
      result
    )} • ${sessionDisplay(
      student
    )}`
  );

  let y =
    addPdfStudentBlock(
      pdf,
      student,
      45
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
    resultLabel(
      result
    ),
    15,
    y
  );

  y += 10;

  const columns = [
    ["Subject", 15],
    ["Theory", 86],
    ["Practical", 111],
    ["Internal", 138],
    ["Total", 163],
    ["Grade", 181],
  ];

  const drawHeader =
    () => {
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

      pdf.setFont(
        "helvetica",
        "bold"
      );

      pdf.setFontSize(
        7
      );

      columns.forEach(
        ([label, x]) => {
          pdf.text(
            label,
            x + 2,
            y + 6.5
          );
        }
      );

      y += 10;
    };

  drawHeader();

  summary.subjects.forEach(
    (
      subject,
      index
    ) => {
      if (y > 255) {
        pdf.addPage();

        addPdfHeader(
          pdf,
          "ACADEMIC PERFORMANCE REPORT",
          "Continued"
        );

        y = 40;

        drawHeader();
      }

      if (
        index % 2 ===
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
          40
        ),
        18,
        y + 7
      );

      const part = (
        obtained,
        maximum
      ) =>
        maximum > 0
          ? `${obtained}/${maximum}`
          : "—";

      pdf.text(
        part(
          subject.theory,
          subject.theoryMax
        ),
        88,
        y + 7
      );

      pdf.text(
        part(
          subject.practical,
          subject.practicalMax
        ),
        113,
        y + 7
      );

      pdf.text(
        part(
          subject.internal,
          subject.internalMax
        ),
        140,
        y + 7
      );

      pdf.text(
        `${subject.obtainedMarks}/${subject.maxMarks}`,
        163,
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
        subject.grade,
        183,
        y + 7
      );

      y += 12;
    }
  );

  y += 8;

  if (y > 244) {
    pdf.addPage();

    addPdfHeader(
      pdf,
      "ACADEMIC PERFORMANCE REPORT",
      "Result Summary"
    );

    y = 42;
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
    43,
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
    `Obtained: ${summary.obtainedMarks}/${summary.maxMarks}`,
    20,
    y + 18
  );

  pdf.text(
    `Percentage: ${summary.percentage.toFixed(
      2
    )}%`,
    83,
    y + 18
  );

  pdf.text(
    `Grade: ${summary.grade}`,
    145,
    y + 18
  );

  pdf.text(
    `Theory: ${summary.theoryObtained}/${summary.theoryMaximum}`,
    20,
    y + 28
  );

  pdf.text(
    `Practical: ${summary.practicalObtained}/${summary.practicalMaximum}`,
    83,
    y + 28
  );

  pdf.text(
    `Internal: ${summary.internalObtained}/${summary.internalMaximum}`,
    145,
    y + 28
  );

  pdf.text(
    `Project: ${summary.projectObtained}/${summary.projectMaximum}`,
    20,
    y + 37
  );

  pdf.text(
    `Division: ${summary.division}`,
    83,
    y + 37
  );

  pdf.setTextColor(
    summary.pass
      ? 6
      : 220,
    summary.pass
      ? 95
      : 38,
    summary.pass
      ? 70
      : 38
  );

  pdf.text(
    summary.pass
      ? "STATUS: PASS"
      : "STATUS: NEEDS IMPROVEMENT",
    145,
    y + 37
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
    "Published academic result generated from the school record.",
    105,
    284,
    {
      align: "center",
    }
  );

  return pdf;
}

/* =========================================================
   RECEIPT PDF
========================================================= */

export function createReceiptPdf(
  student,
  payment,
  fee = {}
) {
  const data =
    normalizePayment(
      payment,
      student,
      fee
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
    "OFFICIAL FEE PAYMENT RECEIPT",
    `Academic Session: ${sessionDisplay(
      student
    )}`
  );

  let y =
    addPdfStudentBlock(
      pdf,
      student,
      45
    );

  pdf.setFont(
    "helvetica",
    "bold"
  );

  pdf.setFontSize(
    11
  );

  pdf.setTextColor(
    6,
    95,
    70
  );

  pdf.text(
    "Payment Details",
    15,
    y
  );

  y += 9;

  const row = (
    label,
    value
  ) => {
    pdf.setDrawColor(
      226,
      232,
      240
    );

    pdf.line(
      15,
      y + 4,
      195,
      y + 4
    );

    pdf.setFont(
      "helvetica",
      "normal"
    );

    pdf.setFontSize(
      8.5
    );

    pdf.setTextColor(
      71,
      85,
      105
    );

    pdf.text(
      label,
      20,
      y
    );

    pdf.setFont(
      "helvetica",
      "bold"
    );

    pdf.setTextColor(
      15,
      23,
      42
    );

    pdf.text(
      String(value),
      190,
      y,
      {
        align: "right",
      }
    );

    y += 9;
  };

  row(
    "Receipt Number",
    data.receiptNo
  );

  row(
    "Payment Date",
    data.date
  );

  row(
    "Payment Time",
    data.time
  );

  row(
    "Payment Method",
    data.method
  );

  row(
    "Fee Category",
    data.feeType ===
      "TRANSPORTATION"
      ? "Transportation"
      : "Academic"
  );

  y += 5;

  pdf.setFillColor(
    6,
    95,
    70
  );

  pdf.rect(
    15,
    y,
    180,
    9,
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
    8
  );

  pdf.text(
    "FEE PARTICULAR",
    20,
    y + 6
  );

  pdf.text(
    "AMOUNT",
    190,
    y + 6,
    {
      align: "right",
    }
  );

  y += 15;

  row(
    "Academic Fee",
    money(
      data.annualFee
    )
  );

  row(
    "Transportation Charge",
    money(
      data.transportCharge
    )
  );

  row(
    "Current Payment",
    money(
      data.amount
    )
  );

  row(
    "Academic Paid After Payment",
    money(
      data.academicPaidAfter
    )
  );

  row(
    "Academic Due After Payment",
    money(
      data.academicDueAfter
    )
  );

  row(
    "Transport Paid After Payment",
    money(
      data.transportPaidAfter
    )
  );

  row(
    "Transport Due After Payment",
    money(
      data.transportDueAfter
    )
  );

  y += 5;

  pdf.setFillColor(
    236,
    253,
    245
  );

  pdf.roundedRect(
    15,
    y,
    180,
    23,
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
    8
  );

  pdf.text(
    "TOTAL PAID",
    20,
    y + 9
  );

  pdf.text(
    money(
      data.totalPaidAfter
    ),
    190,
    y + 9,
    {
      align: "right",
    }
  );

  pdf.text(
    "OUTSTANDING DUE",
    20,
    y + 17
  );

  pdf.text(
    money(
      data.totalDueAfter
    ),
    190,
    y + 17,
    {
      align: "right",
    }
  );

  y += 32;

  if (
    payment?.remarks
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
      8
    );

    pdf.text(
      "Remarks",
      15,
      y
    );

    pdf.setFont(
      "helvetica",
      "normal"
    );

    pdf.text(
      String(
        payment.remarks
      ),
      15,
      y + 6,
      {
        maxWidth: 175,
      }
    );
  }

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
    "Computer-generated official school fee receipt.",
    105,
    284,
    {
      align: "center",
    }
  );

  pdf.text(
    "Please retain this receipt for your records.",
    105,
    290,
    {
      align: "center",
    }
  );

  return pdf;
}