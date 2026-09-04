import { useMemo } from "react";


/* =========================================================
   HELPERS
========================================================= */

function safeText(
  value,
  fallback = "—"
) {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  ) {
    return fallback;
  }

  return String(value);
}


function safeNumber(
  value,
  fallback = 0
) {
  const number =
    Number(value);

  return Number.isFinite(
    number
  )
    ? number
    : fallback;
}


function formatDate(
  value
) {
  if (!value) {
    return "—";
  }

  try {
    /*
     * Firebase Timestamp
     */

    if (
      typeof value?.toDate ===
      "function"
    ) {
      return value
        .toDate()
        .toLocaleDateString(
          "en-IN"
        );
    }


    const date =
      new Date(value);


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return safeText(
        value
      );
    }


    return date.toLocaleDateString(
      "en-IN"
    );
  } catch {
    return safeText(
      value
    );
  }
}


/* =========================================================
   SUBJECT ROW
========================================================= */

function SubjectRow({
  subject,
  index,
}) {
  const maximum =
    safeNumber(
      subject?.maximumMarks ??
        subject?.maxMarks,
      100
    );

  const obtained =
    safeNumber(
      subject?.obtainedMarks,
      0
    );


  const percentage =
    maximum > 0
      ? (
          (obtained /
            maximum) *
          100
        ).toFixed(1)
      : "0.0";


  return (
    <tr>
      <td className="marksheet-center">
        {index + 1}
      </td>

      <td>
        <strong>
          {safeText(
            subject?.subjectName ||
              subject?.name ||
              subject?.subjectCode,
            `Subject ${
              index + 1
            }`
          )}
        </strong>

        {subject?.subjectCode && (
          <small className="marksheet-sub-code">
            {subject.subjectCode}
          </small>
        )}
      </td>

      <td className="marksheet-center">
        {maximum}
      </td>

      <td className="marksheet-center marksheet-obtained">
        {obtained}
      </td>

      <td className="marksheet-center">
        {percentage}%
      </td>
    </tr>
  );
}


/* =========================================================
   INFORMATION FIELD
========================================================= */

function InfoField({
  label,
  value,
}) {
  return (
    <div className="marksheet-info-field">
      <span>
        {label}
      </span>

      <strong>
        {safeText(value)}
      </strong>
    </div>
  );
}


/* =========================================================
   SUMMARY BOX
========================================================= */

function SummaryBox({
  label,
  value,
  highlight = false,
}) {
  return (
    <div
      className={
        highlight
          ? "marksheet-summary-box marksheet-summary-highlight"
          : "marksheet-summary-box"
      }
    >
      <span>
        {label}
      </span>

      <strong>
        {safeText(value)}
      </strong>
    </div>
  );
}


/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function MarksheetPDF({
  result,

  school = {},
  branding = {},

  signatures = {},

  autoPrint = false,
}) {
  const subjects =
    Array.isArray(
      result?.subjects
    )
      ? result.subjects
      : [];


  /* =======================================================
     CALCULATE SUMMARY
  ======================================================= */

  const summary =
    useMemo(() => {
      let maximum = 0;
      let obtained = 0;


      subjects.forEach(
        (subject) => {
          maximum +=
            safeNumber(
              subject?.maximumMarks ??
                subject?.maxMarks,
              100
            );

          obtained +=
            safeNumber(
              subject?.obtainedMarks,
              0
            );
        }
      );


      /*
       * Prefer stored service-layer
       * values when available.
       */

      const finalMaximum =
        result?.maximumMarks ??
        maximum;

      const finalObtained =
        result?.obtainedMarks ??
        obtained;


      const calculatedPercentage =
        finalMaximum > 0
          ? (
              (finalObtained /
                finalMaximum) *
              100
            )
          : 0;


      return {
        maximum:
          finalMaximum,

        obtained:
          finalObtained,

        percentage:
          result?.percentage ??
          calculatedPercentage,

        grade:
          result?.grade ||
          "—",

        division:
          result?.division ||
          "—",

        rank:
          result?.rank ??
          "—",
      };
    }, [
      result,
      subjects,
    ]);


  /* =======================================================
     AUTO PRINT
  ======================================================= */

  if (autoPrint) {
    setTimeout(() => {
      window.print();
    }, 300);
  }


  /* =======================================================
     SCHOOL DATA
  ======================================================= */

  const schoolName =
    school.name ||
    branding.schoolName ||
    result?.schoolName ||
    "XYZ SCHOOL";


  const schoolAddress =
    school.address ||
    branding.address ||
    result?.schoolAddress ||
    "";


  const schoolPhone =
    school.phone ||
    branding.phone ||
    result?.schoolPhone ||
    "";


  const schoolEmail =
    school.email ||
    branding.email ||
    result?.schoolEmail ||
    "";


  const schoolLogo =
    school.logoUrl ||
    branding.logoUrl ||
    result?.schoolLogo ||
    "";


  /* =======================================================
     STUDENT DATA
  ======================================================= */

  const studentName =
    result?.studentName ||
    "Student";


  const admissionNumber =
    result?.admissionNumber ||
    result?.rollNumber ||
    "";


  const className =
    result?.className ||
    "";


  const section =
    result?.section ||
    "";


  const session =
    result?.sessionName ||
    result?.sessionId ||
    "";


  const examination =
    result?.examinationName ||
    "Annual Examination";


  /* =======================================================
     SIGNATURES
  ======================================================= */

  const teacherName =
    signatures.teacherName ||
    result?.teacherName ||
    "Class Teacher";


  const principalName =
    signatures.principalName ||
    result?.principalName ||
    "Principal";


  const teacherSignature =
    signatures.teacherSignature ||
    "";


  const principalSignature =
    signatures.principalSignature ||
    "";


  return (
    <>
      {/* ===================================================
          SCREEN TOOLBAR
      =================================================== */}

      <div className="marksheet-toolbar no-print">
        <div>
          <p className="marksheet-toolbar-title">
            Professional Marksheet
          </p>

          <p className="marksheet-toolbar-subtitle">
            A4 print-ready result document
          </p>
        </div>

        <div className="marksheet-toolbar-actions">
          <button
            type="button"
            onClick={() =>
              window.print()
            }
            className="marksheet-button marksheet-button-primary"
          >
            🖨 Print / Save PDF
          </button>
        </div>
      </div>


      {/* ===================================================
          A4 DOCUMENT
      =================================================== */}

      <article className="marksheet-page">
        {/* ================================================
            HEADER
        ================================================= */}

        <header className="marksheet-header">
          <div className="marksheet-logo-area">
            {schoolLogo ? (
              <img
                src={schoolLogo}
                alt="School Logo"
                className="marksheet-logo"
              />
            ) : (
              <div className="marksheet-logo-placeholder">
                XYZ
              </div>
            )}
          </div>


          <div className="marksheet-school">
            <h1>
              {schoolName}
            </h1>

            {schoolAddress && (
              <p>
                {schoolAddress}
              </p>
            )}

            <div className="marksheet-contact">
              {schoolPhone && (
                <span>
                  ☎ {schoolPhone}
                </span>
              )}

              {schoolEmail && (
                <span>
                  ✉ {schoolEmail}
                </span>
              )}
            </div>
          </div>


          <div className="marksheet-document-label">
            <span>
              ACADEMIC
            </span>

            <strong>
              MARKSHEET
            </strong>
          </div>
        </header>


        {/* ================================================
            EXAM TITLE
        ================================================= */}

        <section className="marksheet-exam-title">
          <p>
            {session}
          </p>

          <h2>
            {examination}
          </h2>

          <span>
            Academic Performance Statement
          </span>
        </section>


        {/* ================================================
            STUDENT INFORMATION
        ================================================= */}

        <section className="marksheet-section">
          <div className="marksheet-section-heading">
            <span>
              STUDENT INFORMATION
            </span>
          </div>


          <div className="marksheet-info-grid">
            <InfoField
              label="Student Name"
              value={
                studentName
              }
            />

            <InfoField
              label="Admission / Roll No."
              value={
                admissionNumber
              }
            />

            <InfoField
              label="Class"
              value={
                className
              }
            />

            <InfoField
              label="Section"
              value={
                section
              }
            />

            <InfoField
              label="Academic Session"
              value={
                session
              }
            />

            <InfoField
              label="Result Status"
              value={
                String(
                  result?.status ||
                    "Published"
                ).toUpperCase()
              }
            />
          </div>
        </section>


        {/* ================================================
            MARKS TABLE
        ================================================= */}

        <section className="marksheet-section">
          <div className="marksheet-section-heading">
            <span>
              SUBJECT-WISE PERFORMANCE
            </span>
          </div>


          <table className="marksheet-table">
            <thead>
              <tr>
                <th>
                  S.No.
                </th>

                <th>
                  Subject
                </th>

                <th>
                  Maximum
                </th>

                <th>
                  Obtained
                </th>

                <th>
                  Percentage
                </th>
              </tr>
            </thead>

            <tbody>
              {subjects.length >
              0 ? (
                subjects.map(
                  (
                    subject,
                    index
                  ) => (
                    <SubjectRow
                      key={
                        subject?.id ||
                        subject?.subjectId ||
                        subject?.subjectCode ||
                        index
                      }
                      subject={
                        subject
                      }
                      index={
                        index
                      }
                    />
                  )
                )
              ) : (
                <tr>
                  <td
                    colSpan="5"
                    className="marksheet-empty"
                  >
                    No subject marks
                    available.
                  </td>
                </tr>
              )}
            </tbody>


            <tfoot>
              <tr>
                <td
                  colSpan="2"
                  className="marksheet-total-label"
                >
                  TOTAL
                </td>

                <td className="marksheet-center">
                  {
                    summary.maximum
                  }
                </td>

                <td className="marksheet-center marksheet-obtained">
                  {
                    summary.obtained
                  }
                </td>

                <td className="marksheet-center">
                  {safeNumber(
                    summary.percentage
                  ).toFixed(
                    2
                  )}
                  %
                </td>
              </tr>
            </tfoot>
          </table>
        </section>


        {/* ================================================
            RESULT SUMMARY
        ================================================= */}

        <section className="marksheet-summary-grid">
          <SummaryBox
            label="Percentage"
            value={`${safeNumber(
              summary.percentage
            ).toFixed(2)}%`}
            highlight
          />

          <SummaryBox
            label="Grade"
            value={
              summary.grade
            }
            highlight
          />

          <SummaryBox
            label="Division"
            value={
              summary.division
            }
          />

          <SummaryBox
            label="Class Rank"
            value={
              summary.rank
            }
          />
        </section>


        {/* ================================================
            RESULT REMARK
        ================================================= */}

        {(result?.teacherRemarks ||
          result?.adminRemarks) && (
          <section className="marksheet-remarks">
            <strong>
              Remarks
            </strong>

            <p>
              {result?.adminRemarks ||
                result?.teacherRemarks}
            </p>
          </section>
        )}


        {/* ================================================
            RESULT DATE
        ================================================= */}

        <div className="marksheet-result-date">
          <span>
            Result Date
          </span>

          <strong>
            {formatDate(
              result?.publishedAt ||
                result?.resultDate ||
                new Date()
            )}
          </strong>
        </div>


        {/* ================================================
            SIGNATURE AREA
        ================================================= */}

        <section className="marksheet-signatures">
          <div className="marksheet-signature">
            <div className="marksheet-signature-space">
              {teacherSignature && (
                <img
                  src={
                    teacherSignature
                  }
                  alt="Teacher Signature"
                />
              )}
            </div>

            <div className="marksheet-signature-line" />

            <strong>
              {teacherName}
            </strong>

            <span>
              Class Teacher
            </span>
          </div>


          <div className="marksheet-signature">
            <div className="marksheet-signature-space">
              {principalSignature && (
                <img
                  src={
                    principalSignature
                  }
                  alt="Principal Signature"
                />
              )}
            </div>

            <div className="marksheet-signature-line" />

            <strong>
              {principalName}
            </strong>

            <span>
              Principal
            </span>
          </div>
        </section>


        {/* ================================================
            FOOTER
        ================================================= */}

        <footer className="marksheet-footer">
          <span>
            This is a computer-generated
            academic marksheet.
          </span>

          <span>
            Result ID:{" "}
            {safeText(
              result?.id,
              "N/A"
            )}
          </span>
        </footer>
      </article>


      {/* ===================================================
          PRINT CSS
      ================================================= */}

      <style>{`
        * {
          box-sizing: border-box;
        }

        .marksheet-toolbar {
          position: sticky;
          top: 0;
          z-index: 50;

          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 16px;

          padding: 14px 18px;

          background:
            rgba(15, 23, 42, 0.96);

          border-bottom:
            1px solid rgba(255, 255, 255, 0.08);

          backdrop-filter:
            blur(18px);
        }

        .marksheet-toolbar-title {
          margin: 0;

          color: white;

          font-size: 15px;
          font-weight: 900;
        }

        .marksheet-toolbar-subtitle {
          margin: 3px 0 0;

          color: #94a3b8;

          font-size: 11px;
        }

        .marksheet-toolbar-actions {
          display: flex;
          gap: 8px;
        }

        .marksheet-button {
          min-height: 42px;

          border: 0;
          border-radius: 11px;

          padding:
            0 16px;

          cursor: pointer;

          font-size: 13px;
          font-weight: 900;
        }

        .marksheet-button-primary {
          color: white;

          background:
            linear-gradient(
              135deg,
              #06b6d4,
              #4f46e5
            );
        }

        .marksheet-page {
          width: 210mm;
          min-height: 297mm;

          margin: 24px auto;

          padding:
            14mm 14mm 12mm;

          background: white;

          color: #111827;

          box-shadow:
            0 20px 70px
            rgba(0, 0, 0, 0.25);

          font-family:
            Arial,
            Helvetica,
            sans-serif;

          position: relative;

          overflow: hidden;
        }

        .marksheet-page::before {
          content: "";

          position: absolute;

          inset: 5mm;

          border:
            1px solid #cbd5e1;

          pointer-events: none;
        }

        .marksheet-header {
          display: grid;

          grid-template-columns:
            72px 1fr auto;

          align-items: center;

          gap: 14px;

          padding-bottom: 12px;

          border-bottom:
            2px solid #111827;

          position: relative;

          z-index: 1;
        }

        .marksheet-logo {
          width: 62px;
          height: 62px;

          object-fit: contain;

          border-radius: 10px;
        }

        .marksheet-logo-placeholder {
          width: 62px;
          height: 62px;

          display: flex;
          align-items: center;
          justify-content: center;

          border:
            2px solid #111827;

          border-radius: 10px;

          font-size: 16px;
          font-weight: 900;
        }

        .marksheet-school h1 {
          margin: 0;

          font-size: 23px;
          line-height: 1.15;

          font-weight: 950;

          letter-spacing: 0.3px;
        }

        .marksheet-school p {
          margin: 5px 0 0;

          font-size: 10px;

          color: #475569;
        }

        .marksheet-contact {
          display: flex;

          flex-wrap: wrap;

          gap: 10px;

          margin-top: 4px;

          color: #64748b;

          font-size: 9px;
        }

        .marksheet-document-label {
          display: flex;

          flex-direction: column;

          align-items: center;

          justify-content: center;

          min-width: 90px;

          padding: 8px;

          border:
            1px solid #94a3b8;

          border-radius: 8px;

          text-align: center;
        }

        .marksheet-document-label span {
          font-size: 8px;

          font-weight: 900;

          letter-spacing: 1.5px;

          color: #64748b;
        }

        .marksheet-document-label strong {
          margin-top: 2px;

          font-size: 13px;

          letter-spacing: 1px;
        }

        .marksheet-exam-title {
          text-align: center;

          padding: 13px 0 11px;
        }

        .marksheet-exam-title p {
          margin: 0;

          font-size: 9px;

          color: #64748b;

          text-transform: uppercase;

          letter-spacing: 1px;
        }

        .marksheet-exam-title h2 {
          margin: 4px 0;

          font-size: 18px;

          font-weight: 950;

          text-transform: uppercase;
        }

        .marksheet-exam-title span {
          font-size: 9px;

          color: #64748b;
        }

        .marksheet-section {
          margin-top: 8px;
        }

        .marksheet-section-heading {
          padding: 6px 9px;

          background: #f1f5f9;

          border:
            1px solid #cbd5e1;

          border-bottom: 0;

          font-size: 9px;

          font-weight: 950;

          letter-spacing: 0.8px;
        }

        .marksheet-info-grid {
          display: grid;

          grid-template-columns:
            repeat(3, 1fr);

          border:
            1px solid #cbd5e1;
        }

        .marksheet-info-field {
          min-height: 42px;

          padding: 7px 9px;

          border-right:
            1px solid #e2e8f0;

          border-bottom:
            1px solid #e2e8f0;
        }

        .marksheet-info-field:nth-child(3n) {
          border-right: 0;
        }

        .marksheet-info-field:nth-last-child(-n+3) {
          border-bottom: 0;
        }

        .marksheet-info-field span {
          display: block;

          margin-bottom: 3px;

          font-size: 7px;

          color: #64748b;

          text-transform: uppercase;

          font-weight: 900;

          letter-spacing: 0.5px;
        }

        .marksheet-info-field strong {
          display: block;

          font-size: 10px;

          color: #111827;

          overflow-wrap: anywhere;
        }

        .marksheet-table {
          width: 100%;

          border-collapse: collapse;

          font-size: 9px;
        }

        .marksheet-table th,
        .marksheet-table td {
          border:
            1px solid #cbd5e1;

          padding: 7px 8px;

          vertical-align: middle;
        }

        .marksheet-table th {
          background: #e2e8f0;

          font-size: 8px;

          text-transform: uppercase;

          letter-spacing: 0.4px;

          font-weight: 950;

          white-space: nowrap;
        }

        .marksheet-table td {
          height: 31px;
        }

        .marksheet-center {
          text-align: center;
        }

        .marksheet-obtained {
          font-weight: 950;
        }

        .marksheet-sub-code {
          display: block;

          margin-top: 2px;

          font-size: 7px;

          color: #64748b;
        }

        .marksheet-total-label {
          text-align: right;

          font-weight: 950;

          background: #f8fafc;
        }

        .marksheet-empty {
          padding: 20px !important;

          text-align: center;

          color: #64748b;
        }

        .marksheet-summary-grid {
          display: grid;

          grid-template-columns:
            repeat(4, 1fr);

          gap: 7px;

          margin-top: 9px;
        }

        .marksheet-summary-box {
          padding: 9px;

          text-align: center;

          border:
            1px solid #cbd5e1;

          border-radius: 6px;

          background: #f8fafc;
        }

        .marksheet-summary-box span {
          display: block;

          font-size: 7px;

          text-transform: uppercase;

          letter-spacing: 0.6px;

          color: #64748b;

          font-weight: 900;
        }

        .marksheet-summary-box strong {
          display: block;

          margin-top: 4px;

          font-size: 14px;

          font-weight: 950;
        }

        .marksheet-summary-highlight {
          background: #eef2ff;

          border-color: #c7d2fe;
        }

        .marksheet-remarks {
          margin-top: 9px;

          padding: 8px 10px;

          border:
            1px solid #cbd5e1;

          border-radius: 6px;

          background: #fafafa;
        }

        .marksheet-remarks strong {
          font-size: 8px;

          text-transform: uppercase;

          letter-spacing: 0.6px;
        }

        .marksheet-remarks p {
          margin: 4px 0 0;

          font-size: 9px;

          line-height: 1.45;

          color: #475569;
        }

        .marksheet-result-date {
          display: flex;

          justify-content: flex-end;

          gap: 7px;

          margin-top: 12px;

          font-size: 8px;

          color: #64748b;
        }

        .marksheet-result-date strong {
          color: #111827;
        }

        .marksheet-signatures {
          display: grid;

          grid-template-columns:
            1fr 1fr;

          gap: 80px;

          margin-top: 28px;

          padding: 0 22px;
        }

        .marksheet-signature {
          text-align: center;
        }

        .marksheet-signature-space {
          height: 34px;

          display: flex;

          align-items: flex-end;

          justify-content: center;
        }

        .marksheet-signature-space img {
          max-width: 110px;

          max-height: 32px;

          object-fit: contain;
        }

        .marksheet-signature-line {
          border-top:
            1px solid #111827;
        }

        .marksheet-signature strong {
          display: block;

          margin-top: 5px;

          font-size: 9px;
        }

        .marksheet-signature span {
          display: block;

          margin-top: 2px;

          font-size: 8px;

          color: #64748b;
        }

        .marksheet-footer {
          display: flex;

          justify-content: space-between;

          gap: 10px;

          margin-top: 18px;

          padding-top: 7px;

          border-top:
            1px solid #e2e8f0;

          font-size: 7px;

          color: #94a3b8;
        }

        @media screen and (max-width: 900px) {
          .marksheet-toolbar {
            position: static;

            flex-direction: column;

            align-items: stretch;
          }

          .marksheet-toolbar-actions {
            width: 100%;
          }

          .marksheet-button {
            width: 100%;
          }

          .marksheet-page {
            width: calc(100% - 20px);

            min-height: auto;

            margin: 10px;

            padding:
              8mm 6mm;
          }

          .marksheet-header {
            grid-template-columns:
              55px 1fr;

            gap: 9px;
          }

          .marksheet-logo,
          .marksheet-logo-placeholder {
            width: 48px;
            height: 48px;
          }

          .marksheet-school h1 {
            font-size: 17px;
          }

          .marksheet-document-label {
            grid-column: 1 / -1;

            width: 100%;
          }

          .marksheet-info-grid {
            grid-template-columns:
              repeat(2, 1fr);
          }

          .marksheet-info-field:nth-child(3n) {
            border-right:
              1px solid #e2e8f0;
          }

          .marksheet-info-field:nth-child(2n) {
            border-right: 0;
          }

          .marksheet-info-field:nth-last-child(-n+3) {
            border-bottom:
              1px solid #e2e8f0;
          }

          .marksheet-info-field:nth-last-child(-n+2) {
            border-bottom: 0;
          }

          .marksheet-summary-grid {
            grid-template-columns:
              repeat(2, 1fr);
          }

          .marksheet-table {
            font-size: 8px;
          }

          .marksheet-table th,
          .marksheet-table td {
            padding: 6px 4px;
          }

          .marksheet-signatures {
            gap: 25px;

            padding: 0;
          }
        }

        @media screen and (max-width: 520px) {
          .marksheet-page {
            width: 100%;

            margin: 0;

            padding:
              7mm 4mm;

            box-shadow: none;
          }

          .marksheet-page::before {
            display: none;
          }

          .marksheet-school h1 {
            font-size: 15px;
          }

          .marksheet-school p,
          .marksheet-contact {
            font-size: 8px;
          }

          .marksheet-exam-title h2 {
            font-size: 15px;
          }

          .marksheet-info-grid {
            grid-template-columns: 1fr;
          }

          .marksheet-info-field,
          .marksheet-info-field:nth-child(2n),
          .marksheet-info-field:nth-child(3n) {
            border-right: 0;

            border-bottom:
              1px solid #e2e8f0;
          }

          .marksheet-info-field:last-child {
            border-bottom: 0;
          }

          .marksheet-summary-grid {
            grid-template-columns: 1fr 1fr;
          }

          .marksheet-summary-box strong {
            font-size: 12px;
          }

          .marksheet-table {
            min-width: 0;
          }

          .marksheet-table th,
          .marksheet-table td {
            padding: 5px 3px;
          }

          .marksheet-signatures {
            gap: 12px;

            margin-top: 22px;
          }

          .marksheet-footer {
            flex-direction: column;

            text-align: center;
          }
        }

        @media print {
          @page {
            size: A4 portrait;

            margin: 0;
          }

          html,
          body {
            margin: 0 !important;

            padding: 0 !important;

            background: white !important;
          }

          .no-print {
            display: none !important;
          }

          .marksheet-page {
            width: 210mm;

            min-height: 297mm;

            margin: 0;

            padding:
              14mm 14mm 12mm;

            box-shadow: none;

            page-break-after: avoid;
          }

          .marksheet-page::before {
            display: block;
          }

          .marksheet-section,
          .marksheet-summary-grid,
          .marksheet-remarks,
          .marksheet-signatures {
            break-inside: avoid;
          }

          .marksheet-table {
            break-inside: auto;
          }

          .marksheet-table tr {
            break-inside: avoid;

            page-break-inside: avoid;
          }
        }
      `}</style>
    </>
  );
}