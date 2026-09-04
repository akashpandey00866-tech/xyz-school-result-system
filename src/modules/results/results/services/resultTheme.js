/* =========================================================
   FILE 28 — ADVANCED RESULT SERVICE
   =========================================================

   Central Result data/service layer.

   Responsibilities:
   - Result create
   - Result read
   - Result update
   - Workflow actions
   - Permission checks
   - Audit integration
   - Safe payload normalization

   IMPORTANT:
   Frontend permissions improve UX, but Firestore
   Security Rules must remain the final security boundary.
========================================================= */

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "../../../config/firebase";

import {
  canCreateResult,
  canEditResult,
  canSubmitResult,
  canVerifyResult,
  canRejectResult,
  canPublishResult,
  canUnpublishResult,
  canDeleteResult,
  canViewResult,
  requireResultPermission,
} from "../utils/resultPermissions";

import {
  saveAuditEntry,
  saveWorkflowAudit,
  saveMarksAudit,
} from "./resultAuditService";

import {
  generateResult,
  validateResult,
} from "../utils/resultCalculations";


/* =========================================================
   COLLECTION
========================================================= */

const RESULT_COLLECTION =
  "results";


/* =========================================================
   STATUS
========================================================= */

export const RESULT_STATUS =
  Object.freeze({
    DRAFT: "draft",
    SUBMITTED: "submitted",
    VERIFIED: "verified",
    REJECTED: "rejected",
    PUBLISHED: "published",
  });


/* =========================================================
   ACTIONS
========================================================= */

export const RESULT_ACTIONS =
  Object.freeze({
    CREATE: "CREATE",
    UPDATE: "UPDATE",
    SUBMIT: "SUBMIT",
    VERIFY: "VERIFY",
    REJECT: "REJECT",
    PUBLISH: "PUBLISH",
    UNPUBLISH: "UNPUBLISH",
    DELETE: "DELETE",
  });


/* =========================================================
   NORMALIZATION
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

  return String(
    value
  ).trim();
}


function cleanNumber(
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


function cleanArray(
  value
) {
  return Array.isArray(
    value
  )
    ? value
    : [];
}


function cleanObject(
  value
) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return {};
  }

  return {
    ...value,
  };
}


/* =========================================================
   ACTOR
========================================================= */

function normalizeActor(
  actor = {}
) {
  return {
    uid:
      actor.uid ||
      actor.id ||
      null,

    name:
      cleanString(
        actor.name ||
        actor.displayName
      ),

    role:
      cleanString(
        actor.role
      ).toLowerCase(),

    email:
      cleanString(
        actor.email
      ),
  };
}


/* =========================================================
   RESULT PAYLOAD
========================================================= */

function normalizeResultPayload(
  payload = {}
) {
  return {
    studentId:
      cleanString(
        payload.studentId
      ),

    studentName:
      cleanString(
        payload.studentName
      ),

    admissionNumber:
      cleanString(
        payload.admissionNumber
      ),

    classId:
      cleanString(
        payload.classId
      ),

    className:
      cleanString(
        payload.className
      ),

    section:
      cleanString(
        payload.section
      ),

    sessionId:
      cleanString(
        payload.sessionId
      ),

    sessionName:
      cleanString(
        payload.sessionName
      ),

    examinationId:
      cleanString(
        payload.examinationId
      ),

    examinationName:
      cleanString(
        payload.examinationName
      ),

    subjects:
      cleanArray(
        payload.subjects
      ),

    formData:
      cleanObject(
        payload.formData
      ),

    totalSubjects:
      cleanNumber(
        payload.totalSubjects
      ),

    maximumMarks:
      cleanNumber(
        payload.maximumMarks
      ),

    obtainedMarks:
      cleanNumber(
        payload.obtainedMarks
      ),

    percentage:
      cleanNumber(
        payload.percentage
      ),

    grade:
      cleanString(
        payload.grade
      ),

    division:
      cleanString(
        payload.division
      ),

    status:
      cleanString(
        payload.status
      ).toLowerCase() ||
      RESULT_STATUS.DRAFT,

    teacherRemarks:
      cleanString(
        payload.teacherRemarks
      ),

    adminRemarks:
      cleanString(
        payload.adminRemarks
      ),

    rejectionReason:
      cleanString(
        payload.rejectionReason
      ),

    rank:
      payload.rank === null ||
      payload.rank === undefined
        ? null
        : cleanNumber(
            payload.rank,
            null
          ),

    metadata:
      cleanObject(
        payload.metadata
      ),
  };
}


/* =========================================================
   REQUIRED FIELD VALIDATION
========================================================= */

function validateRequiredFields(
  payload
) {
  const errors = [];


  if (
    !payload.studentId
  ) {
    errors.push(
      "Student is required."
    );
  }


  if (
    !payload.classId &&
    !payload.className
  ) {
    errors.push(
      "Class is required."
    );
  }


  if (
    !payload.sessionId
  ) {
    errors.push(
      "Academic session is required."
    );
  }


  if (
    !payload.examinationId &&
    !payload.examinationName
  ) {
    errors.push(
      "Examination is required."
    );
  }


  return {
    valid:
      errors.length === 0,

    errors,
  };
}


/* =========================================================
   CREATE RESULT
========================================================= */

export async function createResult({
  actor,
  data,
} = {}) {
  const normalizedActor =
    normalizeActor(
      actor
    );

  const payload =
    normalizeResultPayload(
      data
    );


  /*
   * Permission.
   */

  if (
    !canCreateResult({
      actor:
        normalizedActor,

      classId:
        payload.classId,

      className:
        payload.className,

      section:
        payload.section,
    })
  ) {
    throw new Error(
      "You do not have permission to create this result."
    );
  }


  /*
   * Required fields.
   */

  const required =
    validateRequiredFields(
      payload
    );


  if (
    !required.valid
  ) {
    throw new Error(
      required.errors.join(
        " "
      )
    );
  }


  /*
   * Validate marks.
   */

  const validation =
    validateResult(
      payload.subjects,

      payload.formData
    );


  if (
    !validation.valid
  ) {
    throw new Error(
      validation.errors.join(
        " "
      )
    );
  }


  /*
   * Calculate result again on the service layer.
   * Never trust totals coming from UI.
   */

  let calculated = {};

  try {
    calculated =
      generateResult(
        payload.subjects,

        payload.formData
      ) || {};
  } catch {
    calculated = {};
  }


  const finalPayload = {
    ...payload,

    totalSubjects:
      calculated.totalSubjects ??
      payload.totalSubjects,

    maximumMarks:
      calculated.maximumMarks ??
      payload.maximumMarks,

    obtainedMarks:
      calculated.obtainedMarks ??
      payload.obtainedMarks,

    percentage:
      calculated.percentage ??
      payload.percentage,

    grade:
      calculated.grade ??
      payload.grade,

    division:
      calculated.division ??
      payload.division,

    status:
      RESULT_STATUS.DRAFT,

    createdBy:
      normalizedActor.uid,

    createdByName:
      normalizedActor.name,

    createdByRole:
      normalizedActor.role,

    createdAt:
      serverTimestamp(),

    updatedAt:
      serverTimestamp(),

    submittedAt:
      null,

    verifiedAt:
      null,

    publishedAt:
      null,

    rejectedAt:
      null,

    version:
      1,

    schemaVersion:
      2,
  };


  const reference =
    await addDoc(
      collection(
        db,
        RESULT_COLLECTION
      ),
      finalPayload
    );


  const savedResult = {
    id:
      reference.id,

    ...payload,

    ...calculated,

    status:
      RESULT_STATUS.DRAFT,
  };


  /*
   * Audit.
   */

  try {
    await saveAuditEntry({
      action:
        RESULT_ACTIONS.CREATE,

      category:
        "RESULT",

      actor:
        normalizedActor,

      resultId:
        reference.id,

      studentId:
        payload.studentId,

      nextStatus:
        RESULT_STATUS.DRAFT,

      metadata: {
        classId:
          payload.classId,

        section:
          payload.section,

        examinationId:
          payload.examinationId,
      },
    });
  } catch (
    auditError
  ) {
    console.warn(
      "Result audit failed:",
      auditError
    );
  }


  return savedResult;
}


/* =========================================================
   GET RESULT BY ID
========================================================= */

export async function getResultById({
  actor,
  resultId,
} = {}) {
  if (
    !resultId
  ) {
    throw new Error(
      "Result ID is required."
    );
  }


  const reference =
    doc(
      db,
      RESULT_COLLECTION,
      resultId
    );


  const snapshot =
    await getDoc(
      reference
    );


  if (
    !snapshot.exists()
  ) {
    return null;
  }


  const result = {
    id:
      snapshot.id,

    ...snapshot.data(),
  };


  if (
    !canViewResult({
      actor,

      result,
    })
  ) {
    throw new Error(
      "You do not have permission to view this result."
    );
  }


  return result;
}


/* =========================================================
   GET RESULT WITHOUT ACTOR
   Internal/admin-safe helper.
========================================================= */

export async function getResultRaw(
  resultId
) {
  if (
    !resultId
  ) {
    throw new Error(
      "Result ID is required."
    );
  }


  const snapshot =
    await getDoc(
      doc(
        db,
        RESULT_COLLECTION,
        resultId
      )
    );


  if (
    !snapshot.exists()
  ) {
    return null;
  }


  return {
    id:
      snapshot.id,

    ...snapshot.data(),
  };
}


/* =========================================================
   UPDATE RESULT
========================================================= */

export async function updateResult({
  actor,
  resultId,
  data,
} = {}) {
  const normalizedActor =
    normalizeActor(
      actor
    );


  if (
    !resultId
  ) {
    throw new Error(
      "Result ID is required."
    );
  }


  const existing =
    await getResultRaw(
      resultId
    );


  if (
    !existing
  ) {
    throw new Error(
      "Result not found."
    );
  }


  if (
    !canEditResult({
      actor:
        normalizedActor,

      result:
        existing,
    })
  ) {
    throw new Error(
      "This result cannot be edited."
    );
  }


  const payload =
    normalizeResultPayload({
      ...existing,

      ...data,
    });


  const validation =
    validateResult(
      payload.subjects,

      payload.formData
    );


  if (
    !validation.valid
  ) {
    throw new Error(
      validation.errors.join(
        " "
      )
    );
  }


  let calculated = {};

  try {
    calculated =
      generateResult(
        payload.subjects,

        payload.formData
      ) || {};
  } catch {
    calculated = {};
  }


  const changes = [];


  const fieldsToTrack = [
    "formData",
    "teacherRemarks",
    "adminRemarks",
  ];


  fieldsToTrack.forEach(
    (field) => {
      const oldValue =
        JSON.stringify(
          existing[field] ??
            null
        );

      const newValue =
        JSON.stringify(
          payload[field] ??
            null
        );


      if (
        oldValue !==
        newValue
      ) {
        changes.push({
          field,

          oldValue:
            existing[field] ??
            null,

          newValue:
            payload[field] ??
            null,
        });
      }
    }
  );


  const updatePayload = {
    ...payload,

    ...calculated,

    updatedAt:
      serverTimestamp(),

    version:
      cleanNumber(
        existing.version,
        1
      ) + 1,
  };


  /*
   * Do not allow client-side workflow
   * fields to be silently changed.
   */

  delete updatePayload.createdAt;
  delete updatePayload.createdBy;
  delete updatePayload.createdByName;
  delete updatePayload.createdByRole;

  delete updatePayload.submittedAt;
  delete updatePayload.verifiedAt;
  delete updatePayload.publishedAt;
  delete updatePayload.rejectedAt;


  await updateDoc(
    doc(
      db,
      RESULT_COLLECTION,
      resultId
    ),
    updatePayload
  );


  /*
   * Marks audit.
   */

  if (
    changes.length
  ) {
    try {
      await saveMarksAudit({
        actor:
          normalizedActor,

        resultId,

        studentId:
          existing.studentId,

        changes,
      });
    } catch (
      auditError
    ) {
      console.warn(
        "Marks audit failed:",
        auditError
      );
    }
  }


  return {
    ...existing,

    ...updatePayload,

    id:
      resultId,
  };
}


/* =========================================================
   SUBMIT RESULT
========================================================= */

export async function submitResult({
  actor,
  resultId,
} = {}) {
  return transitionResult({
    actor,

    resultId,

    action:
      RESULT_ACTIONS.SUBMIT,

    nextStatus:
      RESULT_STATUS.SUBMITTED,
  });
}


/* =========================================================
   VERIFY RESULT
========================================================= */

export async function verifyResult({
  actor,
  resultId,
} = {}) {
  return transitionResult({
    actor,

    resultId,

    action:
      RESULT_ACTIONS.VERIFY,

    nextStatus:
      RESULT_STATUS.VERIFIED,
  });
}


/* =========================================================
   REJECT RESULT
========================================================= */

export async function rejectResult({
  actor,
  resultId,
  reason = "",
} = {}) {
  const result =
    await getResultRaw(
      resultId
    );


  if (
    !result
  ) {
    throw new Error(
      "Result not found."
    );
  }


  if (
    !canRejectResult({
      actor,

      result,
    })
  ) {
    throw new Error(
      "Only Admin can reject a submitted result."
    );
  }


  const cleanReason =
    cleanString(
      reason
    );


  if (
    !cleanReason
  ) {
    throw new Error(
      "A rejection reason is required."
    );
  }


  await updateDoc(
    doc(
      db,
      RESULT_COLLECTION,
      resultId
    ),
    {
      status:
        RESULT_STATUS.REJECTED,

      rejectionReason:
        cleanReason,

      rejectedAt:
        serverTimestamp(),

      rejectedBy:
        normalizeActor(
          actor
        ).uid,

      rejectedByName:
        normalizeActor(
          actor
        ).name,

      updatedAt:
        serverTimestamp(),

      version:
        cleanNumber(
          result.version,
          1
        ) + 1,
    }
  );


  try {
    await saveWorkflowAudit({
      action:
        RESULT_ACTIONS.REJECT,

      actor,

      resultId,

      studentId:
        result.studentId,

      previousStatus:
        result.status,

      nextStatus:
        RESULT_STATUS.REJECTED,

      reason:
        cleanReason,
    });
  } catch (
    auditError
  ) {
    console.warn(
      "Reject audit failed:",
      auditError
    );
  }


  return {
    ...result,

    status:
      RESULT_STATUS.REJECTED,

    rejectionReason:
      cleanReason,
  };
}


/* =========================================================
   PUBLISH RESULT
========================================================= */

export async function publishResult({
  actor,
  resultId,
  validation = null,
} = {}) {
  const result =
    await getResultRaw(
      resultId
    );


  if (
    !result
  ) {
    throw new Error(
      "Result not found."
    );
  }


  if (
    !canPublishResult({
      actor,

      result,

      validation,
    })
  ) {
    throw new Error(
      "Only a verified result can be published by Admin."
    );
  }


  /*
   * Defensive validation.
   */

  if (
    validation &&
    validation.valid ===
      false
  ) {
    throw new Error(
      "Result validation failed."
    );
  }


  await updateDoc(
    doc(
      db,
      RESULT_COLLECTION,
      resultId
    ),
    {
      status:
        RESULT_STATUS.PUBLISHED,

      publishedAt:
        serverTimestamp(),

      publishedBy:
        normalizeActor(
          actor
        ).uid,

      publishedByName:
        normalizeActor(
          actor
        ).name,

      updatedAt:
        serverTimestamp(),

      version:
        cleanNumber(
          result.version,
          1
        ) + 1,
    }
  );


  try {
    await saveWorkflowAudit({
      action:
        RESULT_ACTIONS.PUBLISH,

      actor,

      resultId,

      studentId:
        result.studentId,

      previousStatus:
        result.status,

      nextStatus:
        RESULT_STATUS.PUBLISHED,
    });
  } catch (
    auditError
  ) {
    console.warn(
      "Publish audit failed:",
      auditError
    );
  }


  return {
    ...result,

    status:
      RESULT_STATUS.PUBLISHED,
  };
}


/* =========================================================
   UNPUBLISH RESULT
========================================================= */

export async function unpublishResult({
  actor,
  resultId,
  reason = "",
} = {}) {
  const result =
    await getResultRaw(
      resultId
    );


  if (
    !result
  ) {
    throw new Error(
      "Result not found."
    );
  }


  if (
    !canUnpublishResult({
      actor,

      result,
    })
  ) {
    throw new Error(
      "Only Admin can unpublish a published result."
    );
  }


  const cleanReason =
    cleanString(
      reason
    );


  await updateDoc(
    doc(
      db,
      RESULT_COLLECTION,
      resultId
    ),
    {
      status:
        RESULT_STATUS.VERIFIED,

      unpublishedAt:
        serverTimestamp(),

      unpublishedBy:
        normalizeActor(
          actor
        ).uid,

      unpublishReason:
        cleanReason,

      updatedAt:
        serverTimestamp(),

      version:
        cleanNumber(
          result.version,
          1
        ) + 1,
    }
  );


  try {
    await saveWorkflowAudit({
      action:
        RESULT_ACTIONS.UNPUBLISH,

      actor,

      resultId,

      studentId:
        result.studentId,

      previousStatus:
        result.status,

      nextStatus:
        RESULT_STATUS.VERIFIED,

      reason:
        cleanReason,
    });
  } catch (
    auditError
  ) {
    console.warn(
      "Unpublish audit failed:",
      auditError
    );
  }


  return {
    ...result,

    status:
      RESULT_STATUS.VERIFIED,
  };
}


/* =========================================================
   DELETE RESULT
========================================================= */

export async function deleteResult({
  actor,
  resultId,
} = {}) {
  const result =
    await getResultRaw(
      resultId
    );


  if (
    !result
  ) {
    throw new Error(
      "Result not found."
    );
  }


  if (
    !canDeleteResult({
      actor,

      result,
    })
  ) {
    throw new Error(
      "This result cannot be deleted."
    );
  }


  await deleteDoc(
    doc(
      db,
      RESULT_COLLECTION,
      resultId
    )
  );


  try {
    await saveAuditEntry({
      action:
        RESULT_ACTIONS.DELETE,

      category:
        "RESULT",

      actor,

      resultId,

      studentId:
        result.studentId,

      metadata: {
        deletedStatus:
          result.status,
      },
    });
  } catch (
    auditError
  ) {
    console.warn(
      "Delete audit failed:",
      auditError
    );
  }


  return true;
}


/* =========================================================
   GENERIC WORKFLOW TRANSITION
========================================================= */

async function transitionResult({
  actor,
  resultId,
  action,
  nextStatus,
} = {}) {
  const result =
    await getResultRaw(
      resultId
    );


  if (
    !result
  ) {
    throw new Error(
      "Result not found."
    );
  }


  let allowed =
    false;


  if (
    action ===
    RESULT_ACTIONS.SUBMIT
  ) {
    allowed =
      canSubmitResult({
        actor,

        result,
      });
  }


  if (
    action ===
    RESULT_ACTIONS.VERIFY
  ) {
    allowed =
      canVerifyResult({
        actor,

        result,
      });
  }


  if (
    !allowed
  ) {
    throw new Error(
      `You do not have permission to ${action.toLowerCase()} this result.`
    );
  }


  await updateDoc(
    doc(
      db,
      RESULT_COLLECTION,
      resultId
    ),
    {
      status:
        nextStatus,

      updatedAt:
        serverTimestamp(),

      version:
        cleanNumber(
          result.version,
          1
        ) + 1,

      ...(nextStatus ===
        RESULT_STATUS.SUBMITTED
        ? {
            submittedAt:
              serverTimestamp(),

            submittedBy:
              normalizeActor(
                actor
              ).uid,
          }
        : {}),

      ...(nextStatus ===
        RESULT_STATUS.VERIFIED
        ? {
            verifiedAt:
              serverTimestamp(),

            verifiedBy:
              normalizeActor(
                actor
              ).uid,

            verifiedByName:
              normalizeActor(
                actor
              ).name,
          }
        : {}),
    }
  );


  try {
    await saveWorkflowAudit({
      action,

      actor,

      resultId,

      studentId:
        result.studentId,

      previousStatus:
        result.status,

      nextStatus,
    });
  } catch (
    auditError
  ) {
    console.warn(
      "Workflow audit failed:",
      auditError
    );
  }


  return {
    ...result,

    status:
      nextStatus,
  };
}


/* =========================================================
   FIND RESULTS
========================================================= */

export async function getResultsByStudent({
  actor,
  studentId,
  includeDrafts = false,
  maxResults = 100,
} = {}) {
  if (
    !studentId
  ) {
    throw new Error(
      "Student ID is required."
    );
  }


  const safeLimit =
    Math.min(
      Math.max(
        Number(
          maxResults
        ) || 100,
        1
      ),
      500
    );


  const constraints = [
    where(
      "studentId",
      "==",
      studentId
    ),

    orderBy(
      "createdAt",
      "desc"
    ),

    limit(
      safeLimit
    ),
  ];


  if (
    !includeDrafts
  ) {
    constraints.unshift(
      where(
        "status",
        "==",
        RESULT_STATUS.PUBLISHED
      )
    );
  }


  const snapshot =
    await getDocs(
      query(
        collection(
          db,
          RESULT_COLLECTION
        ),
        ...constraints
      )
    );


  const results =
    snapshot.docs.map(
      (item) => ({
        id:
          item.id,

        ...item.data(),
      })
    );


  /*
   * Final application-level protection.
   */

  return results.filter(
    (result) =>
      canViewResult({
        actor,

        result,
      })
  );
}


/* =========================================================
   CLASS RESULTS
========================================================= */

export async function getResultsByClass({
  actor,
  classId,
  sessionId,
  examinationId,
  maxResults = 500,
} = {}) {
  if (
    !classId
  ) {
    throw new Error(
      "Class ID is required."
    );
  }


  const safeLimit =
    Math.min(
      Math.max(
        Number(
          maxResults
        ) || 500,
        1
      ),
      500
    );


  const conditions = [
    where(
      "classId",
      "==",
      classId
    ),
  ];


  if (
    sessionId
  ) {
    conditions.push(
      where(
        "sessionId",
        "==",
        sessionId
      )
    );
  }


  if (
    examinationId
  ) {
    conditions.push(
      where(
        "examinationId",
        "==",
        examinationId
      )
    );
  }


  const snapshot =
    await getDocs(
      query(
        collection(
          db,
          RESULT_COLLECTION
        ),
        ...conditions,
        limit(
          safeLimit
        )
      )
    );


  const results =
    snapshot.docs.map(
      (item) => ({
        id:
          item.id,

        ...item.data(),
      })
    );


  return results.filter(
    (result) =>
      canViewResult({
        actor,

        result,
      })
  );
}


/* =========================================================
   RESULT EXISTS CHECK
========================================================= */

export async function resultExists({
  studentId,
  sessionId,
  examinationId,
} = {}) {
  if (
    !studentId ||
    !sessionId ||
    !examinationId
  ) {
    return false;
  }


  const snapshot =
    await getDocs(
      query(
        collection(
          db,
          RESULT_COLLECTION
        ),

        where(
          "studentId",
          "==",
          studentId
        ),

        where(
          "sessionId",
          "==",
          sessionId
        ),

        where(
          "examinationId",
          "==",
          examinationId
        ),

        limit(1)
      )
    );


  return !snapshot.empty;
}


/* =========================================================
   SAFE ACTION WRAPPER
========================================================= */

export async function executeResultAction({
  actor,
  resultId,
  action,
  data = {},
} = {}) {
  switch (
    String(
      action || ""
    )
      .trim()
      .toUpperCase()
  ) {
    case RESULT_ACTIONS.UPDATE:
      return updateResult({
        actor,

        resultId,

        data,
      });


    case RESULT_ACTIONS.SUBMIT:
      return submitResult({
        actor,

        resultId,
      });


    case RESULT_ACTIONS.VERIFY:
      return verifyResult({
        actor,

        resultId,
      });


    case RESULT_ACTIONS.REJECT:
      return rejectResult({
        actor,

        resultId,

        reason:
          data.reason,
      });


    case RESULT_ACTIONS.PUBLISH:
      return publishResult({
        actor,

        resultId,

        validation:
          data.validation,
      });


    case RESULT_ACTIONS.UNPUBLISH:
      return unpublishResult({
        actor,

        resultId,

        reason:
          data.reason,
      });


    case RESULT_ACTIONS.DELETE:
      return deleteResult({
        actor,

        resultId,
      });


    default:
      throw new Error(
        "Unsupported result action."
      );
  }
}


/* =========================================================
   EXPORTS
========================================================= */

export default {
  RESULT_STATUS,
  RESULT_ACTIONS,

  createResult,

  getResultById,
  getResultRaw,

  updateResult,

  submitResult,
  verifyResult,
  rejectResult,

  publishResult,
  unpublishResult,

  deleteResult,

  getResultsByStudent,
  getResultsByClass,

  resultExists,

  executeResultAction,
};