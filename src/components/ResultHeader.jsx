import React from "react";

/* =========================================================
   RESULT HEADER
   ---------------------------------------------------------
   Responsibility:
   - School information
   - Student information
   - Academic session
   - Exam information
   - Student photo
   - Result type

   No Firebase
   No calculation
   No navigation
   No PDF
========================================================= */

function safeText(value, fallback = "—") {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  ) {
    return fallback;
  }

  return String(value);
}

function getStudentName(student = {}) {
  return (
    student.name ||
    student.studentName ||
    student.fullName ||
    "Student"
  );
}

function getFatherName(student = {}) {
  return (
    student.fatherName ||
    student.father_name ||
    student.father ||
    student.parentName ||
    "—"
  );
}

function getClassName(student = {}) {
  return (
    student.className ||
    student.class ||
    student.grade ||
    student.standard ||
    "—"
  );
}

function getSection(student = {}) {
  return (
    student.section ||
    student.classSection ||
    "—"
  );
}

function getRollNumber(student = {}) {
  return (
    student.rollNumber ||
    student.rollNo ||
    student.roll ||
    "—"
  );
}

function getAdmissionNumber(student = {}) {
  return (
    student.admissionNumber ||
    student.admissionNo ||
    student.registrationNumber ||
    student.registrationNo ||
    "—"
  );
}

function getSession(student = {}, result = {}) {
  return (
    result.academicSession ||
    result.session ||
    student.academicSession ||
    student.session ||
    "—"
  );
}

function getExamName(result = {}) {
  return (
    result.examName ||
    result.examinationName ||
    result.exam ||
    result.title ||
    "Examination"
  );
}

function getExamType(result = {}) {
  const type =
    result.examType ||
    result.resultType ||
    result.type ||
    "";

  if (!type) {
    return "RESULT";
  }

  return String(type)
    .replace(/_/g, " ")
    .toUpperCase();
}

export default function ResultHeader({
  student = {},
  result = {},
  school = {},
  theme = {},
}) {
  const primary =
    theme.primary ||
    "var(--student-primary, #059669)";

  const soft =
    theme.soft ||
    "var(--student-soft, #ecfdf5)";

  const dark =
    theme.dark ||
    "var(--student-dark, #064e3b)";

  const studentPhoto =
    student.photoURL ||
    student.photo ||
    student.profilePhoto ||
    student.image ||
    student.photoUrl ||
    "";

  const schoolLogo =
    school.logoURL ||
    school.logoUrl ||
    school.logo ||
    "";

  const schoolName =
    school.name ||
    school.schoolName ||
    "School Name";

  const schoolAddress =
    school.address ||
    school.schoolAddress ||
    "";

  const schoolPhone =
    school.phone ||
    school.phoneNumber ||
    "";

  const schoolEmail =
    school.email ||
    school.emailAddress ||
    "";

  return (
    <section
      className="overflow-hidden rounded-3xl border bg-white shadow-sm"
      style={{
        borderColor: `${primary}30`,
      }}
    >
      {/* =====================================================
          SCHOOL HEADER
      ===================================================== */}

      <div
        className="px-5 py-6 sm:px-7"
        style={{
          background: soft,
        }}
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">

          {/* SCHOOL LOGO */}

          <div
            className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 bg-white shadow-sm"
            style={{
              borderColor: `${primary}40`,
            }}
          >
            {schoolLogo ? (
              <img
                src={schoolLogo}
                alt={`${schoolName} logo`}
                className="h-full w-full object-contain p-2"
              />
            ) : (
              <div
                className="text-3xl font-black"
                style={{
                  color: primary,
                }}
              >
                S
              </div>
            )}
          </div>

          {/* SCHOOL DETAILS */}

          <div className="min-w-0 flex-1">

            <p
              className="text-[9px] font-black uppercase tracking-[0.25em]"
              style={{
                color: primary,
              }}
            >
              Official Academic Result
            </p>

            <h1
              className="mt-1 break-words text-2xl font-black sm:text-3xl"
              style={{
                color: dark,
              }}
            >
              {schoolName}
            </h1>

            {schoolAddress && (
              <p className="mt-2 text-sm text-slate-600">
                {schoolAddress}
              </p>
            )}

            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">

              {schoolPhone && (
                <span>
                  {schoolPhone}
                </span>
              )}

              {schoolEmail && (
                <span className="break-all">
                  {schoolEmail}
                </span>
              )}

            </div>
          </div>

          {/* EXAM TYPE */}

          <div className="shrink-0">

            <div
              className="rounded-2xl px-4 py-3 text-center"
              style={{
                background: primary,
                color: "#ffffff",
              }}
            >
              <p className="text-[8px] font-black uppercase tracking-widest opacity-80">
                {getExamType(result)}
              </p>

              <p className="mt-1 text-sm font-black">
                {getExamName(result)}
              </p>
            </div>

          </div>

        </div>
      </div>

      {/* =====================================================
          STUDENT INFORMATION
      ===================================================== */}

      <div className="border-t border-slate-100 p-5 sm:p-7">

        <div className="grid gap-5 lg:grid-cols-[1fr_auto]">

          {/* INFORMATION */}

          <div>

            <div className="mb-4 flex items-center justify-between gap-3">

              <div>
                <p
                  className="text-[9px] font-black uppercase tracking-[0.2em]"
                  style={{
                    color: primary,
                  }}
                >
                  Student Information
                </p>

                <h2 className="mt-1 text-xl font-black text-slate-900">
                  {getStudentName(student)}
                </h2>
              </div>

              <span
                className="rounded-full px-3 py-1.5 text-[9px] font-black uppercase"
                style={{
                  background: soft,
                  color: primary,
                }}
              >
                {getExamType(result)}
              </span>

            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">

              <InfoItem
                label="Father's Name"
                value={getFatherName(student)}
              />

              <InfoItem
                label="Class"
                value={getClassName(student)}
              />

              <InfoItem
                label="Section"
                value={getSection(student)}
              />

              <InfoItem
                label="Roll Number"
                value={getRollNumber(student)}
              />

              <InfoItem
                label="Admission Number"
                value={getAdmissionNumber(student)}
              />

              <InfoItem
                label="Academic Session"
                value={getSession(
                  student,
                  result
                )}
              />

            </div>

          </div>

          {/* STUDENT PHOTO */}

          <div className="flex justify-start lg:justify-end">

            <div
              className="h-28 w-24 overflow-hidden rounded-2xl border-2 bg-slate-50"
              style={{
                borderColor: `${primary}40`,
              }}
            >
              {studentPhoto ? (
                <img
                  src={studentPhoto}
                  alt={getStudentName(student)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-center text-[9px] font-black uppercase text-slate-400">
                  Student
                  <br />
                  Photo
                </div>
              )}
            </div>

          </div>

        </div>

      </div>

    </section>
  );
}


/* =========================================================
   INFORMATION ITEM
========================================================= */

function InfoItem({
  label,
  value,
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">

      <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-bold text-slate-800">
        {safeText(value)}
      </p>

    </div>
  );
}