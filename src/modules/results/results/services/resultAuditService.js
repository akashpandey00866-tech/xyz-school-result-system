import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";

import { db } from "../../../config/firebase";

import {
  createAuditEntry,
  normalizeAuditActor,
  validateAuditEntry,
} from "../utils/resultAudit";


/* =========================================================
   COLLECTION
========================================================= */

const AUDIT_COLLECTION =
  "resultAudit";


/* =========================================================
   INTERNAL HELPERS
========================================================= */

function cleanValue(value) {
  if (
    value === undefined
  ) {
    return null;
  }

  if (
    value === null
  ) {
    return null;
  }

  if (
    typeof value === "number" ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  try {
    return JSON.parse(
      JSON.stringify(value)
    );
  } catch {
    return String(value);
  }
}


/* =========================================================
   CREATE AUDIT DOCUMENT
========================================================= */

export async function saveAuditEntry({
  action,
  category,
  actor,
  resultId = null,
  studentId = null,
  field = null,
  oldValue = null,
  newValue = null,
  changes = [],
  previousStatus = null,
  nextStatus = null,
  reason = "",
  metadata = {},
} = {}) {
  const normalizedActor =
    normalizeAuditActor(
      actor
    );


  const entry =
    createAuditEntry({
      action,
      category,
      actor:
        normalizedActor,

      resultId,
      studentId,

      field,
      oldValue,
      newValue,

      changes,

      previousStatus,
      nextStatus,

      reason,

      metadata,
    });


  const validation =
    validateAuditEntry(
      entry
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
   * Never allow undefined values
   * to reach Firestore.
   */

  const firestoreEntry = {
    action:
      entry.action,

    category:
      entry.category,

    resultId:
      entry.resultId,

    studentId:
      entry.studentId,

    actor: {
      id:
        entry.actor.id,

      name:
        entry.actor.name,

      role:
        entry.actor.role,
    },

    field:
      entry.field,

    oldValue:
      cleanValue(
        entry.oldValue
      ),

    newValue:
      cleanValue(
        entry.newValue
      ),

    changes:
      cleanValue(
        entry.changes
      ),

    previousStatus:
      entry.previousStatus,

    nextStatus:
      entry.nextStatus,

    reason:
      entry.reason,

    message:
      entry.message,

    metadata:
      cleanValue(
        entry.metadata
      ),

    /*
     * Client-generated timestamp is useful for local
     * object creation, but Firestore serverTimestamp
     * becomes the authoritative persistence timestamp.
     */
    timestamp:
      serverTimestamp(),

    createdAt:
      serverTimestamp(),

    schemaVersion:
      2,
  };


  const reference =
    await addDoc(
      collection(
        db,
        AUDIT_COLLECTION
      ),
      firestoreEntry
    );


  return {
    ...entry,

    id:
      reference.id,
  };
}


/* =========================================================
   SAVE MULTIPLE AUDIT ENTRIES
========================================================= */

export async function saveAuditEntries(
  entries = []
) {
  if (
    !Array.isArray(entries) ||
    entries.length === 0
  ) {
    return [];
  }


  const results = [];


  for (
    const entry of entries
  ) {
    const saved =
      await saveAuditEntry(
        entry
      );

    results.push(
      saved
    );
  }


  return results;
}


/* =========================================================
   RESULT AUDIT HISTORY
========================================================= */

export async function getResultAuditHistory(
  resultId,
  options = {}
) {
  if (
    !resultId
  ) {
    throw new Error(
      "resultId is required."
    );
  }


  const {
    maxResults = 100,
  } = options;


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

      limit(
        safeLimit
      )
    );


  const snapshot =
    await getDocs(
      auditQuery
    );


  return snapshot.docs.map(
    (doc) => ({
      id:
        doc.id,

      ...doc.data(),
    })
  );
}


/* =========================================================
   STUDENT AUDIT HISTORY
========================================================= */

export async function getStudentAuditHistory(
  studentId,
  options = {}
) {
  if (
    !studentId
  ) {
    throw new Error(
      "studentId is required."
    );
  }


  const {
    maxResults = 100,
  } = options;


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


  const auditQuery =
    query(
      collection(
        db,
        AUDIT_COLLECTION
      ),

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
      )
    );


  const snapshot =
    await getDocs(
      auditQuery
    );


  return snapshot.docs.map(
    (doc) => ({
      id:
        doc.id,

      ...doc.data(),
    })
  );
}


/* =========================================================
   WORKFLOW AUDIT
========================================================= */

export async function saveWorkflowAudit({
  action,
  actor,
  resultId,
  studentId,
  previousStatus,
  nextStatus,
  reason = "",
  metadata = {},
} = {}) {
  return saveAuditEntry({
    action,

    category:
      "WORKFLOW",

    actor,

    resultId,

    studentId,

    previousStatus,

    nextStatus,

    reason,

    metadata: {
      workflow:
        true,

      ...metadata,
    },
  });
}


/* =========================================================
   MARKS AUDIT
========================================================= */

export async function saveMarksAudit({
  actor,
  resultId,
  studentId,
  changes = [],
} = {}) {
  return saveAuditEntry({
    action:
      "MARKS_UPDATED",

    category:
      "MARKS",

    actor,

    resultId,

    studentId,

    changes,

    metadata: {
      totalChanges:
        Array.isArray(
          changes
        )
          ? changes.length
          : 0,
    },
  });
}


/* =========================================================
   SECURITY AUDIT
========================================================= */

export async function saveSecurityAudit({
  actor,
  action =
    "SECURITY_DENIED",
  resultId = null,
  studentId = null,
  reason = "",
  metadata = {},
} = {}) {
  return saveAuditEntry({
    action,

    category:
      "SECURITY",

    actor,

    resultId,

    studentId,

    reason,

    metadata: {
      securityEvent:
        true,

      ...metadata,
    },
  });
}


/* =========================================================
   DOCUMENT AUDIT
========================================================= */

export async function saveDocumentAudit({
  action,
  actor,
  resultId,
  studentId,
  documentType =
    "marksheet",
  format =
    "pdf",
} = {}) {
  return saveAuditEntry({
    action,

    category:
      "DOCUMENT",

    actor,

    resultId,

    studentId,

    metadata: {
      documentType,

      format,
    },
  });
}


/* =========================================================
   DEFAULT EXPORT
========================================================= */

export default {
  saveAuditEntry,
  saveAuditEntries,

  getResultAuditHistory,
  getStudentAuditHistory,

  saveWorkflowAudit,
  saveMarksAudit,
  saveSecurityAudit,
  saveDocumentAudit,
};