/* =========================================================
   XYZ SCHOOL RESULT SYSTEM
   PROFESSIONAL RESULT PDF ENGINE
   File: src/utils/resultPdf.js
   ========================================================= */

import {
  calculateResult,
  calculatePerformance,
  getSubjectCode,
  normalizeResult,
} from "./resultUtils";

/* =========================================================
   DEFAULT SCHOOL CONFIGURATION
========================================================= */

const DEFAULT_SCHOOL = {
  name: "XYZ PUBLIC SCHOOL",
  address: "",
  phone: "",
  email: "",
  website: "",
  affiliation: "",
  logo: "",
  principalSignature: "",
  teacherSignature: "",
  seal: "",
  colors: {
    primary: "#0f766e",
    secondary: "#2563eb",
    accent: "#7c3aed",
  },
};

/* =========================================================
   SAFE HELPERS
========================================================= */

function safe(value, fallback = "") {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return fallback;
  }

  return String(value);
}

function escapeHtml(value) {
  return safe(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function number(value, fallback = 0) {
  const n = Number(value);

  return Number.isFinite(n)
    ? n
    : fallback;
}

function formatDate(value) {
  if (!value) {
    return new Date().toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return safe(value);
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

/* =========================================================
   SCHOOL NORMALIZER
========================================================= */

function normalizeSchool(school = {}) {
  return {
    ...DEFAULT_SCHOOL,
    ...school,

    colors: {
      ...DEFAULT_SCHOOL.colors,
      ...(school?.colors || {}),
    },
  };
}

/* =========================================================
   STUDENT NORMALIZER
========================================================= */

function normalizeStudent(student = {}) {
  return {
    ...student,

    name:
      student.name ||
      student.studentName ||
      "Student",

    enrollmentNo:
      student.enrollmentNo ||
      student.enrollment ||
      student.rollNo ||
      "—",

    className:
      student.className ||
      student.class ||
      "—",

    section:
      student.section ||
      "—",

    fatherName:
      student.fatherName ||
      student.father ||
      "—",

    motherName:
      student.motherName ||
      student.mother ||
      "—",

    dob:
      student.dob ||
      student.dateOfBirth ||
      "—",

    photo:
      student.photo ||
      student.photoUrl ||
      student.profilePhoto ||
      "",
  };
}

/* =========================================================
   TEXT HELPERS
========================================================= */

function resultStatusClass(status) {
  const value =
    safe(status).toUpperCase();

  if (
    value === "PASS" ||
    value === "PASSED"
  ) {
    return "status-pass";
  }

  if (
    value === "FAIL" ||
    value === "FAILED"
  ) {
    return "status-fail";
  }

  return "status-pending";
}

function gradeClass(grade) {
  const value =
    safe(grade).toUpperCase();

  if (
    value.includes("A+") ||
    value.includes("A") ||
    value.includes("O")
  ) {
    return "grade-excellent";
  }

  if (
    value.includes("F") ||
    value.includes("E")
  ) {
    return "grade-fail";
  }

  return "grade-normal";
}

function markClass(status) {
  const value =
    safe(status).toUpperCase();

  if (
    value === "PASS" ||
    value === "PASSED"
  ) {
    return "mark-pass";
  }

  if (
    value === "FAIL" ||
    value === "FAILED"
  ) {
    return "mark-fail";
  }

  return "mark-pending";
}

/* =========================================================
   STUDENT INFORMATION HTML
========================================================= */

function buildStudentInfo(student) {
  const photo = student.photo
    ? `
      <img
        class="student-photo"
        src="${escapeHtml(student.photo)}"
        alt="Student Photo"
      />
    `
    : `
      <div class="photo-placeholder">
        👤
      </div>
    `;

  return `
    <div class="student-section">

      <div class="student-info">

        <div class="info-item">
          <span class="info-label">
            Student Name
          </span>
          <strong>
            ${escapeHtml(student.name)}
          </strong>
        </div>

        <div class="info-item">
          <span class="info-label">
            Enrollment No.
          </span>
          <strong>
            ${escapeHtml(student.enrollmentNo)}
          </strong>
        </div>

        <div class="info-item">
          <span class="info-label">
            Class
          </span>
          <strong>
            ${escapeHtml(student.className)}
          </strong>
        </div>

        <div class="info-item">
          <span class="info-label">
            Section
          </span>
          <strong>
            ${escapeHtml(student.section)}
          </strong>
        </div>

        <div class="info-item">
          <span class="info-label">
            Father's Name
          </span>
          <strong>
            ${escapeHtml(student.fatherName)}
          </strong>
        </div>

        <div class="info-item">
          <span class="info-label">
            Mother's Name
          </span>
          <strong>
            ${escapeHtml(student.motherName)}
          </strong>
        </div>

        <div class="info-item">
          <span class="info-label">
            Date of Birth
          </span>
          <strong>
            ${escapeHtml(
              formatDate(student.dob)
            )}
          </strong>
        </div>

      </div>

      <div>
        ${photo}
      </div>

    </div>
  `;
}

/* =========================================================
   PART 1 END
   ========================================================= */
   /* =========================================================
   MARKS TABLE
========================================================= */

function buildMarksTable({
  subjects = [],
  formData = {},
} = {}) {
  const rows = Array.isArray(subjects)
    ? subjects
    : [];

  if (!rows.length) {
    return `
      <div class="empty-result">
        No subject marks available.
      </div>
    `;
  }

  let obtainedTotal = 0;
  let maximumTotal = 0;

  const tableRows = rows.map(
    (subject, index) => {
      const code =
        subject.code ||
        subject.subjectCode ||
        getSubjectCode(subject) ||
        `SUB${index + 1}`;

      const name =
        subject.name ||
        subject.subjectName ||
        subject.title ||
        "Subject";

      const theory = number(
        subject.theory ??
        subject.theoryMarks ??
        subject.marks,
        0
      );

      const theoryMax = number(
        subject.theoryMax ??
        subject.maxTheory ??
        subject.maximum ??
        subject.maxMarks ??
        0,
        0
      );

      const practical = number(
        subject.practical ??
        subject.practicalMarks,
        0
      );

      const practicalMax = number(
        subject.practicalMax ??
        subject.maxPractical,
        0
      );

      const internal = number(
        subject.internal ??
        subject.internalMarks,
        0
      );

      const internalMax = number(
        subject.internalMax ??
        subject.maxInternal,
        0
      );

      const project = number(
        subject.project ??
        subject.projectMarks,
        0
      );

      const projectMax = number(
        subject.projectMax ??
        subject.maxProject,
        0
      );

      const suppliedTotal =
        subject.total ??
        subject.totalMarks;

      const calculatedTotal =
        suppliedTotal !== undefined
          ? number(suppliedTotal)
          : theory +
            practical +
            internal +
            project;

      const calculatedMaximum =
        subject.totalMax ??
        subject.maximumMarks ??
        (
          theoryMax +
          practicalMax +
          internalMax +
          projectMax
        );

      const totalMax = number(
        calculatedMaximum,
        0
      );

      obtainedTotal +=
        calculatedTotal;

      maximumTotal +=
        totalMax;

      const percentage =
        totalMax > 0
          ? (
              calculatedTotal /
              totalMax
            ) * 100
          : 0;

      const grade =
        subject.grade ||
        subject.letterGrade ||
        (
          percentage >= 90
            ? "A+"
            : percentage >= 80
            ? "A"
            : percentage >= 70
            ? "B+"
            : percentage >= 60
            ? "B"
            : percentage >= 50
            ? "C"
            : percentage >= 40
            ? "D"
            : "F"
        );

      const status =
        subject.status ||
        (
          percentage >= 33
            ? "PASS"
            : "FAIL"
        );

      const statusClass =
        resultStatusClass(status);

      const theoryDisplay =
        theoryMax > 0
          ? `${theory}/${theoryMax}`
          : "—";

      const practicalDisplay =
        practicalMax > 0
          ? `${practical}/${practicalMax}`
          : "—";

      const internalDisplay =
        internalMax > 0
          ? `${internal}/${internalMax}`
          : "—";

      const projectDisplay =
        projectMax > 0
          ? `${project}/${projectMax}`
          : "—";

      return `
        <tr>

          <td class="serial">
            ${index + 1}
          </td>

          <td class="subject-cell">
            <strong>
              ${escapeHtml(name)}
            </strong>

            <small>
              ${escapeHtml(code)}
            </small>
          </td>

          <td class="marks-cell">
            <span
              class="${
                markClass(status)
              }"
            >
              ${escapeHtml(
                theoryDisplay
              )}
            </span>
          </td>

          <td class="marks-cell">
            <span>
              ${escapeHtml(
                practicalDisplay
              )}
            </span>
          </td>

          <td class="marks-cell">
            <span>
              ${escapeHtml(
                internalDisplay
              )}
            </span>
          </td>

          <td class="marks-cell">
            <span>
              ${escapeHtml(
                projectDisplay
              )}
            </span>
          </td>

          <td class="total-cell">
            ${calculatedTotal}/${totalMax}
          </td>

          <td>
            ${percentage.toFixed(2)}%
          </td>

          <td>
            <span
              class="grade-badge ${
                gradeClass(grade)
              }"
            >
              ${escapeHtml(grade)}
            </span>
          </td>

          <td>
            <span
              class="subject-status ${
                statusClass
              }"
            >
              ${escapeHtml(status)}
            </span>
          </td>

        </tr>
      `;
    }
  ).join("");

  return `
    <table class="marks-table">

      <thead>
        <tr>

          <th>S.No.</th>

          <th>Subject</th>

          <th>Theory</th>

          <th>Practical</th>

          <th>Internal</th>

          <th>Project</th>

          <th>Total</th>

          <th>%</th>

          <th>Grade</th>

          <th>Status</th>

        </tr>
      </thead>

      <tbody>
        ${tableRows}
      </tbody>

      <tfoot>
        <tr>

          <td colspan="6">
            GRAND TOTAL
          </td>

          <td>
            ${obtainedTotal}/${maximumTotal}
          </td>

          <td>
            ${
              maximumTotal > 0
                ? (
                    obtainedTotal /
                    maximumTotal *
                    100
                  ).toFixed(2)
                : "0.00"
            }%
          </td>

          <td colspan="2">
            —
          </td>

        </tr>
      </tfoot>

    </table>
  `;
}

/* =========================================================
   SUMMARY CARDS
========================================================= */

function buildSummaryCards(result = {}) {
  const obtained = number(
    result.obtainedMarks ??
    result.obtained ??
    result.totalObtained
  );

  const maximum = number(
    result.maximumMarks ??
    result.maximum ??
    result.totalMaximum
  );

  const percentage = number(
    result.percentage ??
    (
      maximum > 0
        ? obtained / maximum * 100
        : 0
    )
  );

  const grade =
    result.grade ||
    result.overallGrade ||
    "—";

  const division =
    result.division ||
    "—";

  const passedSubjects =
    result.passedSubjects ??
    result.passed ??
    "—";

  const failedSubjects =
    result.failedSubjects ??
    result.failed ??
    "—";

  const status =
    result.status ||
    result.resultStatus ||
    (
      failedSubjects > 0
        ? "FAIL"
        : "PASS"
    );

  return `
    <div class="summary-grid">

      <div class="summary-card green">
        <span>Obtained Marks</span>
        <strong>
          ${obtained}
        </strong>
      </div>

      <div class="summary-card blue">
        <span>Maximum Marks</span>
        <strong>
          ${maximum}
        </strong>
      </div>

      <div class="summary-card purple">
        <span>Percentage</span>
        <strong>
          ${percentage.toFixed(2)}%
        </strong>
      </div>

      <div class="summary-card orange">
        <span>Overall Grade</span>
        <strong>
          ${escapeHtml(grade)}
        </strong>
      </div>

      <div class="summary-card pink">
        <span>Division</span>
        <strong>
          ${escapeHtml(division)}
        </strong>
      </div>

      <div class="summary-card ${
        status === "PASS"
          ? "green"
          : "red"
      }">
        <span>Final Status</span>
        <strong>
          ${escapeHtml(status)}
        </strong>
      </div>

    </div>

    <div class="result-stat-row">

      <div>
        <span>Passed Subjects</span>
        <strong>
          ${escapeHtml(
            passedSubjects
          )}
        </strong>
      </div>

      <div>
        <span>Failed Subjects</span>
        <strong>
          ${escapeHtml(
            failedSubjects
          )}
        </strong>
      </div>

    </div>
  `;
}

/* =========================================================
   PART 2 END
========================================================= */
/* =========================================================
   PERFORMANCE SECTION
========================================================= */

function buildPerformance(result = {}) {
  const percentage = number(
    result.percentage ??
    result.percent ??
    result.overallPercentage
  );

  let title = "Needs Improvement";
  let message =
    "Regular practice and consistent preparation are recommended.";

  if (percentage >= 90) {
    title = "Outstanding Performance";
    message =
      "Excellent academic performance. Keep maintaining this level of consistency.";
  } else if (percentage >= 75) {
    title = "Very Good Performance";
    message =
      "Very good academic performance with strong overall preparation.";
  } else if (percentage >= 60) {
    title = "Good Performance";
    message =
      "Good academic performance. Continued practice can lead to even better results.";
  } else if (percentage >= 45) {
    title = "Satisfactory Performance";
    message =
      "Satisfactory performance. More revision and regular practice are recommended.";
  }

  return `
    <div class="performance-box">

      <div class="performance-icon">
        ★
      </div>

      <div>
        <span>
          Academic Performance
        </span>

        <strong>
          ${escapeHtml(title)}
        </strong>

        <p>
          ${escapeHtml(message)}
        </p>
      </div>

    </div>
  `;
}

/* =========================================================
   REMARKS
========================================================= */

function buildRemarks(result = {}) {
  const status =
    safe(
      result.status ||
      result.resultStatus ||
      "PASS"
    ).toUpperCase();

  const suppliedRemarks =
    result.remarks ||
    result.remark ||
    result.teacherRemarks ||
    "";

  let remarks = suppliedRemarks;

  if (!remarks) {
    if (status === "PASS") {
      remarks =
        "The student has successfully completed the examination.";
    } else if (status === "FAIL") {
      remarks =
        "The student is advised to focus on the subjects requiring improvement.";
    } else {
      remarks =
        "Result information is subject to verification by the school.";
    }
  }

  return `
    <div class="remarks-box">

      <h3>
        Teacher's Remarks
      </h3>

      <p>
        ${escapeHtml(remarks)}
      </p>

    </div>
  `;
}

/* =========================================================
   SIGNATURES
========================================================= */

function buildSignatures(school = {}) {
  const teacherSignature =
    school.teacherSignature ||
    school.teacherSignatureUrl ||
    "";

  const principalSignature =
    school.principalSignature ||
    school.principalSignatureUrl ||
    "";

  const teacher =
    teacherSignature
      ? `
        <img
          src="${escapeHtml(
            teacherSignature
          )}"
          alt="Class Teacher Signature"
        />
      `
      : `
        <div class="signature-space"></div>
      `;

  const principal =
    principalSignature
      ? `
        <img
          src="${escapeHtml(
            principalSignature
          )}"
          alt="Principal Signature"
        />
      `
      : `
        <div class="signature-space"></div>
      `;

  return `
    <div class="signature-grid">

      <div class="signature-box">

        ${teacher}

        <div class="signature-line"></div>

        <strong>
          Class Teacher
        </strong>

        <span>
          Signature
        </span>

      </div>

      <div class="signature-box">

        ${principal}

        <div class="signature-line"></div>

        <strong>
          Principal
        </strong>

        <span>
          Authorized Signature
        </span>

      </div>

    </div>
  `;
}

/* =========================================================
   VERIFICATION
========================================================= */

function buildVerification(
  result = {},
  verificationUrl = ""
) {
  const resultId =
    result.resultId ||
    result.id ||
    result.documentId ||
    result.verificationId ||
    "";

  const url =
    verificationUrl ||
    result.verificationUrl ||
    "";

  return `
    <div class="verification-box">

      <div class="verification-icon">
        ✓
      </div>

      <div>

        <strong>
          Official Result Verification
        </strong>

        <span>
          This marksheet is generated by
          the XYZ School Result System.
        </span>

        ${
          resultId
            ? `
              <small>
                Result ID:
                ${escapeHtml(resultId)}
              </small>
            `
            : ""
        }

        ${
          url
            ? `
              <small>
                Verification:
                ${escapeHtml(url)}
              </small>
            `
            : ""
        }

      </div>

    </div>
  `;
}

/* =========================================================
   SCHOOL HEADER
========================================================= */

function buildSchoolHeader(school) {
  const logo =
    school.logo ||
    school.logoUrl ||
    "";

  const logoHtml = logo
    ? `
      <img
        class="school-logo"
        src="${escapeHtml(logo)}"
        alt="School Logo"
      />
    `
    : `
      <div class="school-logo-placeholder">
        XYZ
      </div>
    `;

  return `
    <div class="school-header">

      <div>
        ${logoHtml}
      </div>

      <div>

        <h2 class="school-name">
          ${escapeHtml(
            school.name ||
            "XYZ PUBLIC SCHOOL"
          )}
        </h2>

        ${
          school.address
            ? `
              <div class="school-address">
                ${escapeHtml(
                  school.address
                )}
              </div>
            `
            : ""
        }

        <div class="school-meta">

          ${
            school.phone
              ? `
                <span>
                  ${escapeHtml(
                    school.phone
                  )}
                </span>
              `
              : ""
          }

          ${
            school.email
              ? `
                <span>
                  ${escapeHtml(
                    school.email
                  )}
                </span>
              `
              : ""
          }

          ${
            school.affiliation
              ? `
                <span>
                  ${escapeHtml(
                    school.affiliation
                  )}
                </span>
              `
              : ""
          }

        </div>

      </div>

      <div class="document-label">

        <span>
          Official Academic Record
        </span>

        <strong>
          MARKSHEET
        </strong>

      </div>

    </div>
  `;
}

/* =========================================================
   PART 3 END
========================================================= */
/* =========================================================
   RESULT NORMALIZATION
========================================================= */

function prepareResult({
  subjects = [],
  formData = {},
  result = null,
} = {}) {
  let calculated = null;

  try {
    calculated = calculateResult(
      subjects,
      formData
    );
  } catch {
    calculated = null;
  }

  const source =
    result ||
    calculated ||
    {};

  let normalized = source;

  try {
    normalized =
      normalizeResult(source);
  } catch {
    normalized = source;
  }

  const obtained = number(
    normalized?.obtainedMarks ??
    normalized?.obtained ??
    normalized?.totalObtained ??
    source?.obtainedMarks ??
    source?.obtained
  );

  const maximum = number(
    normalized?.maximumMarks ??
    normalized?.maximum ??
    normalized?.totalMaximum ??
    source?.maximumMarks ??
    source?.maximum
  );

  const percentage = number(
    normalized?.percentage ??
    normalized?.percent ??
    normalized?.overallPercentage ??
    (
      maximum > 0
        ? obtained / maximum * 100
        : 0
    )
  );

  const failedSubjects = number(
    normalized?.failedSubjects ??
    normalized?.failed ??
    source?.failedSubjects ??
    source?.failed
  );

  const passedSubjects =
    normalized?.passedSubjects ??
    normalized?.passed ??
    source?.passedSubjects ??
    source?.passed ??
    Math.max(
      0,
      subjects.length -
      failedSubjects
    );

  const status =
    normalized?.status ||
    normalized?.resultStatus ||
    source?.status ||
    source?.resultStatus ||
    (
      failedSubjects > 0
        ? "FAIL"
        : "PASS"
    );

  const grade =
    normalized?.grade ||
    normalized?.overallGrade ||
    source?.grade ||
    source?.overallGrade ||
    (
      percentage >= 90
        ? "A+"
        : percentage >= 80
        ? "A"
        : percentage >= 70
        ? "B+"
        : percentage >= 60
        ? "B"
        : percentage >= 50
        ? "C"
        : percentage >= 40
        ? "D"
        : "F"
    );

  const division =
    normalized?.division ||
    source?.division ||
    (
      percentage >= 60
        ? "First Division"
        : percentage >= 45
        ? "Second Division"
        : percentage >= 33
        ? "Third Division"
        : "—"
    );

  return {
    ...source,
    ...normalized,

    obtainedMarks: obtained,
    maximumMarks: maximum,
    percentage,

    passedSubjects,
    failedSubjects,

    status,
    grade,
    division,

    rank:
      normalized?.rank ??
      source?.rank ??
      "—",

    resultId:
      normalized?.resultId ||
      source?.resultId ||
      source?.id ||
      "",

    remarks:
      normalized?.remarks ||
      source?.remarks ||
      "",
  };
}

/* =========================================================
   COMPLETE MARKSHEET HTML
========================================================= */

export function generateMarksheetHtml({
  school: schoolInput = {},
  student: studentInput = {},
  subjects = [],
  formData = {},
  result: suppliedResult = null,
  academicYear = "",
  examinationName = "Annual Examination",
  verificationUrl = "",
} = {}) {
  const school =
    normalizeSchool(schoolInput);

  const student =
    normalizeStudent(studentInput);

  const result =
    prepareResult({
      subjects,
      formData,
      result: suppliedResult,
    });

  const marksTable =
    buildMarksTable({
      subjects,
      formData,
    });

  const studentInfo =
    buildStudentInfo(student);

  const summary =
    buildSummaryCards(result);

  const performance =
    buildPerformance(result);

  const remarks =
    buildRemarks(result);

  const verification =
    buildVerification(
      result,
      verificationUrl
    );

  const signatures =
    buildSignatures(school);

  const examName =
    examinationName ||
    formData?.examinationName ||
    formData?.examName ||
    "Annual Examination";

  const session =
    academicYear ||
    formData?.academicYear ||
    formData?.session ||
    "Current Session";

  const publishedDate =
    formData?.publishedAt ||
    formData?.publishedDate ||
    result?.publishedAt ||
    new Date();

  const resultStatus =
    safe(
      result.status,
      "PASS"
    ).toUpperCase();

  const statusClass =
    resultStatusClass(
      resultStatus
    );

  const logo =
    school.logo ||
    school.logoUrl ||
    "";

  return `
<!DOCTYPE html>

<html lang="en">

<head>

  <meta charset="UTF-8" />

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />

  <title>
    ${escapeHtml(
      student.name
    )} - Marksheet
  </title>

  <style>
    ${buildStyles(school)}

    .result-status {
      margin-top: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 7px 9px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      background: #ffffff;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .result-status-label {
      color: #64748b;
      font-size: 5.5px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: .5px;
    }

    .result-status-value {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 8px;
      border-radius: 999px;
      font-size: 6px;
      font-weight: 950;
    }

    .result-status-value.status-pass {
      background: #d1fae5;
      color: #047857;
      border-color: #a7f3d0;
    }

    .result-status-value.status-fail {
      background: #fee2e2;
      color: #dc2626;
      border-color: #fecaca;
    }

    .result-status-value.status-pending {
      background: #fef3c7;
      color: #b45309;
      border-color: #fde68a;
    }

    .result-stat-row {
      margin-top: 6px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 5px;
    }

    .result-stat-row > div {
      padding: 5px 7px;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      background: #f8fafc;
      text-align: center;
    }

    .result-stat-row span {
      display: block;
      color: #94a3b8;
      font-size: 4.8px;
      font-weight: 900;
      text-transform: uppercase;
    }

    .result-stat-row strong {
      display: block;
      margin-top: 2px;
      color: #0f172a;
      font-size: 6.8px;
      font-weight: 950;
    }

    .empty-result {
      padding: 20px;
      border: 1px dashed #cbd5e1;
      border-radius: 8px;
      color: #64748b;
      text-align: center;
      font-size: 7px;
    }
  </style>

</head>

<body>

  <main class="marksheet">

    <div class="outer-border">

      ${buildSchoolHeader(school)}

      <div class="title-strip">

        <h1>
          Official Student Marksheet
        </h1>

        <p>
          ${escapeHtml(examName)}
          &nbsp; • &nbsp;
          ${escapeHtml(session)}
        </p>

      </div>

      ${studentInfo}

      <div class="result-status">

        <span class="result-status-label">
          Result Status
        </span>

        <span
          class="result-status-value ${statusClass}"
        >
          ${
            resultStatus === "PASS"
              ? "✓"
              : resultStatus === "FAIL"
              ? "!"
              : "•"
          }

          ${escapeHtml(
            resultStatus
          )}
        </span>

      </div>

      <div class="section-heading">
        Subject-wise Academic Performance
      </div>

      ${marksTable}

      <div class="section-heading">
        Overall Result Summary
      </div>

      ${summary}

      ${performance}

      ${remarks}

      ${verification}

      ${signatures}

      <div class="footer">

        <div>
          Published:
          ${escapeHtml(
            formatDate(
              publishedDate
            )
          )}
        </div>

        <div class="official-stamp">
          Computer-generated official academic record
        </div>

      </div>

    </div>

  </main>

</body>

</html>
  `;
}

/* =========================================================
   PART 4 END
========================================================= */
/* =========================================================
   PRINT MARKSHEET
========================================================= */

export function printMarksheet(options = {}) {
  const html =
    generateMarksheetHtml(
      options
    );

  const printWindow =
    window.open(
      "",
      "_blank",
      "width=1000,height=900"
    );

  if (!printWindow) {
    throw new Error(
      "Unable to open print window. Please allow pop-ups."
    );
  }

  printWindow.document.open();

  printWindow.document.write(
    html
  );

  printWindow.document.close();

  const triggerPrint = () => {
    try {
      printWindow.focus();
      printWindow.print();
    } catch (error) {
      console.error(
        "Print failed:",
        error
      );
    }
  };

  if (
    printWindow.document.readyState ===
    "complete"
  ) {
    setTimeout(
      triggerPrint,
      350
    );
  } else {
    printWindow.onload = () => {
      setTimeout(
        triggerPrint,
        350
      );
    };
  }

  return printWindow;
}

/* =========================================================
   DOWNLOAD HTML MARKSHEET
========================================================= */

export function downloadMarksheetHtml(
  options = {},
  filename = "student-marksheet.html"
) {
  const html =
    generateMarksheetHtml(
      options
    );

  const blob =
    new Blob(
      [html],
      {
        type: "text/html;charset=utf-8",
      }
    );

  const url =
    URL.createObjectURL(blob);

  const anchor =
    document.createElement(
      "a"
    );

  anchor.href = url;

  anchor.download =
    filename.endsWith(".html")
      ? filename
      : `${filename}.html`;

  document.body.appendChild(
    anchor
  );

  anchor.click();

  anchor.remove();

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

/* =========================================================
   DOWNLOAD PDF VIA BROWSER PRINT
========================================================= */

export function downloadPdfViaPrint(
  options = {}
) {
  return printMarksheet(
    options
  );
}

/* =========================================================
   STUDENT PDF VALIDATION
========================================================= */

export function canGenerateStudentPdf(
  student
) {
  if (!student) {
    return {
      allowed: false,
      reason:
        "Student information is missing.",
    };
  }

  const name =
    student.name ||
    student.studentName;

  if (!name) {
    return {
      allowed: false,
      reason:
        "Student name is required.",
    };
  }

  return {
    allowed: true,
    reason: "",
  };
}

/* =========================================================
   DEFAULT EXPORT
========================================================= */

export default {
  generateMarksheetHtml,
  printMarksheet,
  downloadMarksheetHtml,
  downloadPdfViaPrint,
  canGenerateStudentPdf,
};