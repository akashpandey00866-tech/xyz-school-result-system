/* =========================================================
   RESULT CRUD SERVICE
   ---------------------------------------------------------
   Purpose:
   - Validate result data before saving
   - Keep marks calculation centralized
   - Prevent invalid marks
   - Prevent client-side workflow status manipulation
   - Prepare clean payload for resultService
========================================================= */

import {
  createResult,
  updateResult,
  deleteResult,
} from "./resultService";


/* =========================================================
   CONSTANTS
========================================================= */

const MAX_SUBJECTS = 100;

const MAX_REMARK_LENGTH = 1000;


/* =========================================================
   HELPERS
========================================================= */

function cleanString(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value).trim();
}


function requireActor(actor) {
  if (!actor?.uid) {
    const error =
      new Error(
        "Authenticated user is required."
      );

    error.code =
      "AUTH_REQUIRED";

    throw error;
  }

  return actor;
}


function normalizeRole(role) {
  return cleanString(
    role
  ).toLowerCase();
}


/* =========================================================
   SUBJECT VALIDATION
========================================================= */

function validateSubjects(subjects) {
  if (
    !Array.isArray(subjects)
  ) {
    throw new Error(
      "Subjects must be an array."
    );
  }


  if (
    subjects.length === 0
  ) {
    throw new Error(
      "At least one subject is required."
    );
  }


  if (
    subjects.length >
    MAX_SUBJECTS
  ) {
    throw new Error(
      `A maximum of ${MAX_SUBJECTS} subjects is allowed.`
    );
  }


  const subjectIds =
    new Set();


  return subjects.map(
    (subject, index) => {

      const subjectId =
        cleanString(
          subject?.subjectId ||
          subject?.id
        );


      const subjectName =
        cleanString(
          subject?.subjectName ||
          subject?.name
        );


      const maximumMarks =
        Number(
          subject?.maximumMarks ??
          subject?.maxMarks ??
          100
        );


      const obtainedMarks =
        Number(
          subject?.obtainedMarks ??
          0
        );


      if (
        !subjectId
      ) {
        throw new Error(
          `Subject ${index + 1} is missing a subject ID.`
        );
      }


      if (
        subjectIds.has(
          subjectId
        )
      ) {
        throw new Error(
          `Duplicate subject found: ${subjectName || subjectId}.`
        );
      }


      subjectIds.add(
        subjectId
      );


      if (
        !subjectName
      ) {
        throw new Error(
          `Subject ${index + 1} is missing a name.`
        );
      }


      if (
        !Number.isFinite(
          maximumMarks
        ) ||
        maximumMarks <= 0
      ) {
        throw new Error(
          `Invalid maximum marks for ${subjectName}.`
        );
      }


      if (
        !Number.isFinite(
          obtainedMarks
        )
      ) {
        throw new Error(
          `Invalid obtained marks for ${subjectName}.`
        );
      }


      if (
        obtainedMarks < 0
      ) {
        throw new Error(
          `Marks cannot be negative for ${subjectName}.`
        );
      }


      if (
        obtainedMarks >
        maximumMarks
      ) {
        throw new Error(
          `${subjectName}: obtained marks cannot exceed maximum marks.`
        );
      }


      return {
        ...subject,

        subjectId,

        subjectName,

        maximumMarks,

        obtainedMarks,
      };
    }
  );
}


/* =========================================================
   CALCULATE TOTALS
========================================================= */

function calculateMarks(
  subjects
) {
  let maximumMarks = 0;
  let obtainedMarks = 0;


  for (
    const subject of subjects
  ) {
    maximumMarks +=
      subject.maximumMarks;

    obtainedMarks +=
      subject.obtainedMarks;
  }


  const percentage =
    maximumMarks > 0
      ? Number(
          (
            (obtainedMarks /
              maximumMarks) *
            100
          ).toFixed(2)
        )
      : 0;


  return {
    maximumMarks,

    obtainedMarks,

    percentage,
  };
}


/* =========================================================
   GRADE
========================================================= */

function calculateGrade(
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


/* =========================================================
   DIVISION
========================================================= */

function calculateDivision(
  percentage
) {
  if (percentage >= 60)
    return "First";

  if (percentage >= 45)
    return "Second";

  if (percentage >= 33)
    return "Third";

  return "Fail";
}


/* =========================================================
   BUILD SAFE PAYLOAD
========================================================= */

function buildSafePayload(
  actor,
  data,
  existingResult = null
) {
  requireActor(
    actor
  );


  const role =
    normalizeRole(
      actor.role
    );


  if (
    role !== "admin" &&
    role !== "teacher"
  ) {
    const error =
      new Error(
        "Only Admin or Teacher can manage results."
      );

    error.code =
      "RESULT_MANAGE_UNAUTHORIZED";

    throw error;
  }


  const studentId =
    cleanString(
      data?.studentId
    );


  if (!studentId) {
    throw new Error(
      "Student ID is required."
    );
  }


  const subjects =
    validateSubjects(
      data?.subjects
    );


  const calculated =
    calculateMarks(
      subjects
    );


  const percentage =
    calculated.percentage;


  const payload = {

    /* ---------------------------------------------
       Student
    --------------------------------------------- */

    studentId,

    studentName:
      cleanString(
        data?.studentName
      ),

    admissionNumber:
      cleanString(
        data?.admissionNumber
      ),


    /* ---------------------------------------------
       Academic
    --------------------------------------------- */

    classId:
      cleanString(
        data?.classId
      ),

    className:
      cleanString(
        data?.className
      ),

    section:
      cleanString(
        data?.section
      ),

    sessionId:
      cleanString(
        data?.sessionId
      ),

    sessionName:
      cleanString(
        data?.sessionName
      ),

    examinationId:
      cleanString(
        data?.examinationId
      ),

    examinationName:
      cleanString(
        data?.examinationName
      ),


    /* ---------------------------------------------
       Teacher ownership
    --------------------------------------------- */

    /*
     * Existing teacherId is preserved during update.
     * A teacher cannot transfer a result to another
     * teacher through this service.
     */

    teacherId:
      existingResult?.teacherId ||
      (
        role === "teacher"
          ? actor.uid
          : cleanString(
              data?.teacherId
            )
      ),


    /* ---------------------------------------------
       Marks
    --------------------------------------------- */

    subjects,

    maximumMarks:
      calculated.maximumMarks,

    obtainedMarks:
      calculated.obtainedMarks,

    percentage,

    grade:
      calculateGrade(
        percentage
      ),

    division:
      calculateDivision(
        percentage
      ),


    /* ---------------------------------------------
       Remarks
    --------------------------------------------- */

    teacherRemarks:
      cleanString(
        data?.teacherRemarks
      ),

    adminRemarks:
      cleanString(
        data?.adminRemarks
      ),
  };


  if (
    payload.teacherRemarks
      .length >
    MAX_REMARK_LENGTH
  ) {
    throw new Error(
      "Teacher remarks are too long."
    );
  }


  if (
    payload.adminRemarks
      .length >
    MAX_REMARK_LENGTH
  ) {
    throw new Error(
      "Admin remarks are too long."
    );
  }


  /*
   * IMPORTANT:
   *
   * We intentionally do NOT accept these
   * workflow fields from the form:
   *
   * status
   * verifiedBy
   * verifiedAt
   * publishedBy
   * publishedAt
   * rejectedBy
   * rejectedAt
   * submittedBy
   * submittedAt
   *
   * Workflow is controlled separately.
   */

  return payload;
}


/* =========================================================
   CREATE
========================================================= */

export async function createManagedResult(
  actor,
  data
) {
  const payload =
    buildSafePayload(
      actor,
      data
    );


  /*
   * Teacher ownership:
   * createResult() will associate
   * the result with the current teacher.
   */

  return createResult(
    actor,
    payload
  );
}


/* =========================================================
   UPDATE
========================================================= */

export async function updateManagedResult(
  actor,
  result,
  data
) {
  if (
    !result?.id
  ) {
    throw new Error(
      "Existing result is required for update."
    );
  }


  const payload =
    buildSafePayload(
      actor,
      data,
      result
    );


  /*
   * Never allow update form data
   * to change these identity fields.
   */

  payload.studentId =
    result.studentId;


  payload.teacherId =
    result.teacherId;


  /*
   * Keep current workflow status
   * outside the editable payload.
   */

  return updateResult(
    actor,
    result.id,
    payload
  );
}


/* =========================================================
   DELETE
========================================================= */

export async function deleteManagedResult(
  actor,
  result
) {
  requireActor(
    actor
  );


  if (
    !result?.id
  ) {
    throw new Error(
      "Result ID is required."
    );
  }


  /*
   * Students must never delete
   * results.
   */

  const role =
    normalizeRole(
      actor.role
    );


  if (
    role !== "admin" &&
    role !== "teacher"
  ) {
    const error =
      new Error(
        "You are not authorized to delete results."
      );

    error.code =
      "RESULT_DELETE_UNAUTHORIZED";

    throw error;
  }


  /*
   * Published results should not be
   * permanently deleted from the UI.
   */

  if (
    normalizeRole(
      result.status
    ) ===
    "published"
  ) {
    throw new Error(
      "Published results cannot be deleted. Unpublish the result first."
    );
  }


  /*
   * Teacher can delete only their
   * own result.
   */

  if (
    role === "teacher" &&
    result.teacherId !==
      actor.uid
  ) {
    const error =
      new Error(
        "You can only delete your assigned results."
      );

    error.code =
      "RESULT_DELETE_FORBIDDEN";

    throw error;
  }


  return deleteResult(
    actor,
    result.id
  );
}


/* =========================================================
   EXPORT
========================================================= */

export const resultCrudService =
  Object.freeze({
    create:
      createManagedResult,

    update:
      updateManagedResult,

    delete:
      deleteManagedResult,
  });