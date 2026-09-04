import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";

import { db } from "../../../config/firebase";

import {
  RESULT_STATUS,
  assertResultAction,
  canViewResult,
} from "../security/ResultPermissions";


/* =========================================================
   COLLECTION
========================================================= */

const RESULTS_COLLECTION =
  "results";


const AUDIT_COLLECTION =
  "resultAudit";


/* =========================================================
   HELPERS
========================================================= */

function cleanString(
  value
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value).trim();
}


function normalizeStatus(
  status
) {
  return cleanString(
    status
  ).toLowerCase();
}


function assertValidResultId(
  resultId
) {
  if (
    !resultId ||
    typeof resultId !==
      "string"
  ) {
    const error =
      new Error(
        "A valid result ID is required."
      );

    error.code =
      "INVALID_RESULT_ID";

    throw error;
  }
}


/* =========================================================
   GET RESULT
========================================================= */

export async function getResult(
  resultId
) {
  assertValidResultId(
    resultId
  );


  const resultRef =
    doc(
      db,
      RESULTS_COLLECTION,
      resultId
    );


  const snapshot =
    await getDoc(
      resultRef
    );


  if (
    !snapshot.exists()
  ) {
    const error =
      new Error(
        "Result not found."
      );

    error.code =
      "RESULT_NOT_FOUND";

    throw error;
  }


  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
}


/* =========================================================
   GET RESULT WITH AUTHORIZATION
========================================================= */

export async function getAuthorizedResult(
  actor,
  resultId
) {
  const result =
    await getResult(
      resultId
    );


  if (
    !canViewResult(
      actor,
      result
    )
  ) {
    const error =
      new Error(
        "You are not authorized to view this result."
      );

    error.code =
      "RESULT_VIEW_UNAUTHORIZED";

    throw error;
  }


  return result;
}


/* =========================================================
   LIST RESULTS
========================================================= */

export async function listResults({
  actor,
  studentId = null,
  classId = null,
  sessionId = null,
  examinationId = null,
  status = null,
  teacherId = null,
  pageSize = 50,
} = {}) {
  if (!actor?.uid) {
    const error =
      new Error(
        "Authenticated user is required."
      );

    error.code =
      "AUTH_REQUIRED";

    throw error;
  }


  const constraints = [];


  /*
   * STUDENT
   *
   * Student queries are restricted
   * to their own student ID and
   * published results.
   */

  if (
    actor.role === "student"
  ) {
    constraints.push(
      where(
        "studentId",
        "==",
        actor.uid
      )
    );

    constraints.push(
      where(
        "status",
        "==",
        RESULT_STATUS.PUBLISHED
      )
    );
  }


  /*
   * TEACHER
   *
   * Only assigned teacher results.
   */

  if (
    actor.role === "teacher"
  ) {
    constraints.push(
      where(
        "teacherId",
        "==",
        actor.uid
      )
    );
  }


  /*
   * OPTIONAL FILTERS
   */

  if (studentId) {
    constraints.push(
      where(
        "studentId",
        "==",
        studentId
      )
    );
  }


  if (classId) {
    constraints.push(
      where(
        "classId",
        "==",
        classId
      )
    );
  }


  if (sessionId) {
    constraints.push(
      where(
        "sessionId",
        "==",
        sessionId
      )
    );
  }


  if (examinationId) {
    constraints.push(
      where(
        "examinationId",
        "==",
        examinationId
      )
    );
  }


  if (
    teacherId &&
    actor.role === "admin"
  ) {
    constraints.push(
      where(
        "teacherId",
        "==",
        teacherId
      )
    );
  }


  /*
   * Only admin may explicitly
   * request a status filter.
   */

  if (
    status &&
    actor.role === "admin"
  ) {
    constraints.push(
      where(
        "status",
        "==",
        normalizeStatus(
          status
        )
      )
    );
  }


  const resultQuery =
    query(
      collection(
        db,
        RESULTS_COLLECTION
      ),
      ...constraints,
      orderBy(
        "updatedAt",
        "desc"
      ),
      limit(
        Math.min(
          Math.max(
            Number(
              pageSize
            ) || 50,
            1
          ),
          100
        )
      )
    );


  const snapshot =
    await getDocs(
      resultQuery
    );


  return snapshot.docs.map(
    (item) => ({
      id: item.id,
      ...item.data(),
    })
  );
}


/* =========================================================
   VALIDATE SUBJECTS
========================================================= */

function validateSubjects(
  subjects
) {
  if (
    !Array.isArray(
      subjects
    )
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


  return subjects.map(
    (subject) => {
      const maximumMarks =
        Number(
          subject?.maximumMarks ??
            subject?.maxMarks ??
            100
        );


      const obtainedMarks =
        Number(
          subject?.obtainedMarks
        );


      if (
        !Number.isFinite(
          maximumMarks
        ) ||
        maximumMarks <= 0
      ) {
        throw new Error(
          "Invalid maximum marks."
        );
      }


      if (
        !Number.isFinite(
          obtainedMarks
        ) ||
        obtainedMarks < 0 ||
        obtainedMarks >
          maximumMarks
      ) {
        throw new Error(
          `Invalid marks for ${
            subject?.subjectName ||
            subject?.name ||
            "subject"
          }.`
        );
      }


      return {
        ...subject,

        maximumMarks,

        obtainedMarks,
      };
    }
  );
}


/* =========================================================
   CALCULATE RESULT
========================================================= */

function calculateResult(
  subjects
) {
  let maximumMarks =
    0;

  let obtainedMarks =
    0;


  subjects.forEach(
    (subject) => {
      maximumMarks +=
        Number(
          subject.maximumMarks
        );

      obtainedMarks +=
        Number(
          subject.obtainedMarks
        );
    }
  );


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


  let grade = "F";

  if (percentage >= 90)
    grade = "A+";
  else if (percentage >= 80)
    grade = "A";
  else if (percentage >= 70)
    grade = "B+";
  else if (percentage >= 60)
    grade = "B";
  else if (percentage >= 50)
    grade = "C";
  else if (percentage >= 40)
    grade = "D";


  let division =
    "Fail";

  if (percentage >= 60)
    division = "First";
  else if (percentage >= 45)
    division = "Second";
  else if (percentage >= 33)
    division = "Third";


  return {
    maximumMarks,

    obtainedMarks,

    percentage,

    grade,

    division,
  };
}


/* =========================================================
   CREATE RESULT DATA
========================================================= */

function buildResultPayload(
  actor,
  data
) {
  const subjects =
    validateSubjects(
      data.subjects
    );


  const calculated =
    calculateResult(
      subjects
    );


  return {
    studentId:
      cleanString(
        data.studentId
      ),

    studentName:
      cleanString(
        data.studentName
      ),

    admissionNumber:
      cleanString(
        data.admissionNumber
      ),

    classId:
      cleanString(
        data.classId
      ),

    className:
      cleanString(
        data.className
      ),

    section:
      cleanString(
        data.section
      ),

    teacherId:
      cleanString(
        data.teacherId ||
          actor.uid
      ),

    sessionId:
      cleanString(
        data.sessionId
      ),

    sessionName:
      cleanString(
        data.sessionName
      ),

    examinationId:
      cleanString(
        data.examinationId
      ),

    examinationName:
      cleanString(
        data.examinationName
      ),

    subjects,

    ...calculated,

    teacherRemarks:
      cleanString(
        data.teacherRemarks
      ),
  };
}


/* =========================================================
   CREATE RESULT
========================================================= */

export async function createResult(
  actor,
  data
) {
  if (
    actor?.role !==
    "teacher" &&
    actor?.role !==
    "admin"
  ) {
    const error =
      new Error(
        "You are not allowed to create results."
      );

    error.code =
      "RESULT_CREATE_UNAUTHORIZED";

    throw error;
  }


  if (!actor?.uid) {
    throw new Error(
      "Authenticated user is required."
    );
  }


  const payload =
    buildResultPayload(
      actor,
      data
    );


  if (
    !payload.studentId
  ) {
    throw new Error(
      "Student ID is required."
    );
  }


  const resultRef =
    doc(
      collection(
        db,
        RESULTS_COLLECTION
      )
    );


  const batch =
    writeBatch(db);


  batch.set(
    resultRef,
    {
      ...payload,

      status:
        RESULT_STATUS.DRAFT,

      createdBy:
        actor.uid,

      createdByRole:
        actor.role,

      createdAt:
        serverTimestamp(),

      updatedAt:
        serverTimestamp(),

      version: 1,
    }
  );


  await writeAuditEntry(
    batch,
    {
      resultId:
        resultRef.id,

      actor,

      action:
        "CREATE",

      fromStatus:
        null,

      toStatus:
        RESULT_STATUS.DRAFT,
    }
  );


  await batch.commit();


  return getResult(
    resultRef.id
  );
}


/* =========================================================
   UPDATE DRAFT
========================================================= */

export async function updateResult(
  actor,
  resultId,
  data
) {
  assertValidResultId(
    resultId
  );


  const current =
    await getResult(
      resultId
    );


  assertResultAction(
    actor,
    current,
    "edit"
  );


  const payload =
    buildResultPayload(
      actor,
      {
        ...current,
        ...data,
      }
    );


  const resultRef =
    doc(
      db,
      RESULTS_COLLECTION,
      resultId
    );


  await updateDoc(
    resultRef,
    {
      ...payload,

      /*
       * Never allow client input
       * to alter workflow status
       * through a normal edit.
       */

      updatedAt:
        serverTimestamp(),

      version:
        Number(
          current.version || 0
        ) + 1,
    }
  );


  const batch =
    writeBatch(db);


  await writeAuditEntry(
    batch,
    {
      resultId,

      actor,

      action:
        "UPDATE",

      fromStatus:
        current.status,

      toStatus:
        current.status,
    }
  );


  await batch.commit();


  return getResult(
    resultId
  );
}


/* =========================================================
   SUBMIT RESULT
========================================================= */

export async function submitResult(
  actor,
  resultId
) {
  assertValidResultId(
    resultId
  );


  const current =
    await getResult(
      resultId
    );


  assertResultAction(
    actor,
    current,
    "submit"
  );


  const resultRef =
    doc(
      db,
      RESULTS_COLLECTION,
      resultId
    );


  const batch =
    writeBatch(db);


  batch.update(
    resultRef,
    {
      status:
        RESULT_STATUS.SUBMITTED,

      submittedBy:
        actor.uid,

      submittedAt:
        serverTimestamp(),

      updatedAt:
        serverTimestamp(),

      version:
        Number(
          current.version || 0
        ) + 1,
    }
  );


  await writeAuditEntry(
    batch,
    {
      resultId,

      actor,

      action:
        "SUBMIT",

      fromStatus:
        current.status,

      toStatus:
        RESULT_STATUS.SUBMITTED,
    }
  );


  await batch.commit();


  return getResult(
    resultId
  );
}


/* =========================================================
   VERIFY RESULT
========================================================= */

export async function verifyResult(
  actor,
  resultId
) {
  assertValidResultId(
    resultId
  );


  const current =
    await getResult(
      resultId
    );


  assertResultAction(
    actor,
    current,
    "verify"
  );


  const resultRef =
    doc(
      db,
      RESULTS_COLLECTION,
      resultId
    );


  const batch =
    writeBatch(db);


  batch.update(
    resultRef,
    {
      status:
        RESULT_STATUS.VERIFIED,

      verifiedBy:
        actor.uid,

      verifiedAt:
        serverTimestamp(),

      updatedAt:
        serverTimestamp(),

      version:
        Number(
          current.version || 0
        ) + 1,
    }
  );


  await writeAuditEntry(
    batch,
    {
      resultId,

      actor,

      action:
        "VERIFY",

      fromStatus:
        current.status,

      toStatus:
        RESULT_STATUS.VERIFIED,
    }
  );


  await batch.commit();


  return getResult(
    resultId
  );
}


/* =========================================================
   REJECT RESULT
========================================================= */

export async function rejectResult(
  actor,
  resultId,
  reason
) {
  assertValidResultId(
    resultId
  );


  const rejectionReason =
    cleanString(
      reason
    );


  if (
    !rejectionReason
  ) {
    const error =
      new Error(
        "Rejection reason is required."
      );

    error.code =
      "REJECTION_REASON_REQUIRED";

    throw error;
  }


  if (
    rejectionReason.length >
    1000
  ) {
    throw new Error(
      "Rejection reason is too long."
    );
  }


  const current =
    await getResult(
      resultId
    );


  assertResultAction(
    actor,
    current,
    "reject"
  );


  const resultRef =
    doc(
      db,
      RESULTS_COLLECTION,
      resultId
    );


  const batch =
    writeBatch(db);


  batch.update(
    resultRef,
    {
      status:
        RESULT_STATUS.REJECTED,

      rejectionReason,

      rejectedBy:
        actor.uid,

      rejectedAt:
        serverTimestamp(),

      updatedAt:
        serverTimestamp(),

      version:
        Number(
          current.version || 0
        ) + 1,
    }
  );


  await writeAuditEntry(
    batch,
    {
      resultId,

      actor,

      action:
        "REJECT",

      fromStatus:
        current.status,

      toStatus:
        RESULT_STATUS.REJECTED,

      reason:
        rejectionReason,
    }
  );


  await batch.commit();


  return getResult(
    resultId
  );
}


/* =========================================================
   PUBLISH RESULT
========================================================= */

export async function publishResult(
  actor,
  resultId
) {
  assertValidResultId(
    resultId
  );


  const current =
    await getResult(
      resultId
    );


  assertResultAction(
    actor,
    current,
    "publish"
  );


  const resultRef =
    doc(
      db,
      RESULTS_COLLECTION,
      resultId
    );


  const batch =
    writeBatch(db);


  batch.update(
    resultRef,
    {
      status:
        RESULT_STATUS.PUBLISHED,

      publishedBy:
        actor.uid,

      publishedAt:
        serverTimestamp(),

      updatedAt:
        serverTimestamp(),

      version:
        Number(
          current.version || 0
        ) + 1,
    }
  );


  await writeAuditEntry(
    batch,
    {
      resultId,

      actor,

      action:
        "PUBLISH",

      fromStatus:
        current.status,

      toStatus:
        RESULT_STATUS.PUBLISHED,
    }
  );


  await batch.commit();


  return getResult(
    resultId
  );
}


/* =========================================================
   UNPUBLISH RESULT
========================================================= */

export async function unpublishResult(
  actor,
  resultId,
  reason = ""
) {
  assertValidResultId(
    resultId
  );


  const current =
    await getResult(
      resultId
    );


  assertResultAction(
    actor,
    current,
    "unpublish"
  );


  const resultRef =
    doc(
      db,
      RESULTS_COLLECTION,
      resultId
    );


  const batch =
    writeBatch(db);


  batch.update(
    resultRef,
    {
      status:
        RESULT_STATUS.VERIFIED,

      unpublishedBy:
        actor.uid,

      unpublishedAt:
        serverTimestamp(),

      unpublishReason:
        cleanString(
          reason
        ),

      updatedAt:
        serverTimestamp(),

      version:
        Number(
          current.version || 0
        ) + 1,
    }
  );


  await writeAuditEntry(
    batch,
    {
      resultId,

      actor,

      action:
        "UNPUBLISH",

      fromStatus:
        current.status,

      toStatus:
        RESULT_STATUS.VERIFIED,

      reason:
        cleanString(
          reason
        ),
    }
  );


  await batch.commit();


  return getResult(
    resultId
  );
}


/* =========================================================
   AUDIT ENTRY
========================================================= */

async function writeAuditEntry(
  batch,
  {
    resultId,
    actor,
    action,
    fromStatus,
    toStatus,
    reason = "",
  }
) {
  const auditRef =
    doc(
      collection(
        db,
        AUDIT_COLLECTION
      )
    );


  batch.set(
    auditRef,
    {
      resultId,

      actorUid:
        actor?.uid || "",

      actorRole:
        actor?.role || "",

      action,

      fromStatus:
        fromStatus || null,

      toStatus:
        toStatus || null,

      reason:
        cleanString(
          reason
        ),

      createdAt:
        serverTimestamp(),
    }
  );
}


/* =========================================================
   RESULT AUDIT
========================================================= */

export async function getResultAudit(
  actor,
  resultId
) {
  if (
    actor?.role !==
    "admin"
  ) {
    const error =
      new Error(
        "Only Admin can access result audit records."
      );

    error.code =
      "AUDIT_UNAUTHORIZED";

    throw error;
  }


  assertValidResultId(
    resultId
  );


  const auditQuery =
    query(
      collection(
        db,
        AUDIT_COLLECTION
      ),
      where(
        "resultId",
        "==",
        resultId
      ),
      orderBy(
        "createdAt",
        "desc"
      ),
      limit(100)
    );


  const snapshot =
    await getDocs(
      auditQuery
    );


  return snapshot.docs.map(
    (item) => ({
      id: item.id,
      ...item.data(),
    })
  );
}