/* =========================================================
   ADVANCED RESULT AUDIT ENGINE
   =========================================================

   PURPOSE
   -------
   Central audit utility for the Result Module.

   Tracks:
   - Result creation
   - Result updates
   - Marks changes
   - Subject changes
   - Submit
   - Verify
   - Reject
   - Publish
   - Unpublish
   - Return to draft
   - Delete
   - View
   - Download
   - Print
   - Security events

   IMPORTANT
   ----------
   This file CREATES audit objects.

   It does NOT by itself make the database secure.

   Final audit persistence should be protected by:
   Firebase Authentication
   +
   Firestore Security Rules
   +
   preferably trusted server/Admin SDK for immutable audit logs.
========================================================= */


/* =========================================================
   ACTIONS
========================================================= */

export const AUDIT_ACTIONS = Object.freeze({
  CREATE: "CREATE",
  UPDATE: "UPDATE",
  MARKS_UPDATED: "MARKS_UPDATED",
  SUBJECT_UPDATED: "SUBJECT_UPDATED",

  SUBMIT: "SUBMIT",
  VERIFY: "VERIFY",
  REJECT: "REJECT",
  PUBLISH: "PUBLISH",
  UNPUBLISH: "UNPUBLISH",
  RETURN_TO_DRAFT: "RETURN_TO_DRAFT",

  DELETE: "DELETE",

  VIEW: "VIEW",
  DOWNLOAD: "DOWNLOAD",
  PRINT: "PRINT",

  SECURITY_DENIED: "SECURITY_DENIED",
  SECURITY_WARNING: "SECURITY_WARNING",
});


/* =========================================================
   CATEGORIES
========================================================= */

export const AUDIT_CATEGORIES = Object.freeze({
  RESULT: "RESULT",
  MARKS: "MARKS",
  WORKFLOW: "WORKFLOW",
  SECURITY: "SECURITY",
  DOCUMENT: "DOCUMENT",
  SYSTEM: "SYSTEM",
});


/* =========================================================
   ROLES
========================================================= */

export const AUDIT_ROLES = Object.freeze({
  TEACHER: "teacher",
  ADMIN: "admin",
  STUDENT: "student",
  SYSTEM: "system",
});


/* =========================================================
   NORMALIZATION
========================================================= */

export function normalizeAuditAction(action) {
  return String(action || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}


export function normalizeAuditRole(role) {
  return String(role || "")
    .trim()
    .toLowerCase();
}


export function normalizeAuditCategory(category) {
  return String(category || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}


/* =========================================================
   SAFE VALUE NORMALIZATION
========================================================= */

export function normalizeAuditValue(value) {
  if (value === undefined || value === null) {
    return null;
  }


  if (typeof value === "number") {
    return Number.isFinite(value)
      ? value
      : null;
  }


  if (typeof value === "boolean") {
    return value;
  }


  if (typeof value === "string") {
    return value;
  }


  /*
   * Firebase Timestamp / compatible object.
   */

  if (
    typeof value?.toDate === "function"
  ) {
    try {
      return value.toDate().toISOString();
    } catch {
      return null;
    }
  }


  /*
   * JS Date.
   */

  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? null
      : value.toISOString();
  }


  /*
   * Firestore Timestamp-like object.
   */

  if (
    typeof value === "object" &&
    typeof value?.seconds === "number"
  ) {
    try {
      const milliseconds =
        value.seconds * 1000 +
        Math.floor(
          (value.nanoseconds || 0) / 1000000
        );

      return new Date(
        milliseconds
      ).toISOString();
    } catch {
      return null;
    }
  }


  /*
   * Prevent unsupported objects from
   * breaking the audit system.
   */

  try {
    return JSON.parse(
      JSON.stringify(value)
    );
  } catch {
    return String(value);
  }
}


/* =========================================================
   SAFE ACTOR
========================================================= */

export function normalizeAuditActor(actor = {}) {
  if (typeof actor === "string") {
    return {
      id: actor,
      name: "",
      email: "",
      role: "",
    };
  }


  return {
    id:
      actor?.uid ||
      actor?.id ||
      actor?.userId ||
      null,

    name:
      actor?.displayName ||
      actor?.name ||
      "",

    /*
     * Email is retained for administrative audit
     * display but should not be exposed unnecessarily
     * in student-facing UI.
     */
    email:
      actor?.email ||
      "",

    role:
      normalizeAuditRole(
        actor?.role
      ),
  };
}


/* =========================================================
   FIELD LABEL
========================================================= */

export function formatAuditField(field) {
  if (!field) {
    return "Field";
  }


  return String(field)
    .replace(
      /\[(\d+)\]/g,
      " $1"
    )
    .replace(
      /([a-z])([A-Z])/g,
      "$1 $2"
    )
    .replace(
      /[_-]+/g,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim()
    .replace(
      /\b\w/g,
      (char) =>
        char.toUpperCase()
    );
}


/* =========================================================
   VALUE COMPARISON
========================================================= */

export function areValuesEqual(
  first,
  second
) {
  const a =
    normalizeAuditValue(
      first
    );

  const b =
    normalizeAuditValue(
      second
    );


  try {
    return (
      JSON.stringify(a) ===
      JSON.stringify(b)
    );
  } catch {
    return a === b;
  }
}


/* =========================================================
   FIELD CHANGE
========================================================= */

export function createFieldChange({
  field,
  oldValue,
  newValue,
  label = "",
  category =
    AUDIT_CATEGORIES.RESULT,
} = {}) {
  const changed =
    !areValuesEqual(
      oldValue,
      newValue
    );


  return {
    field:
      field || "",

    label:
      label ||
      formatAuditField(
        field
      ),

    oldValue:
      normalizeAuditValue(
        oldValue
      ),

    newValue:
      normalizeAuditValue(
        newValue
      ),

    category:
      normalizeAuditCategory(
        category
      ),

    changed,
  };
}


/* =========================================================
   OBJECT DIFF
========================================================= */

export function createObjectDiff(
  oldObject = {},
  newObject = {},
  options = {}
) {
  const {
    ignoredFields = [],
    category =
      AUDIT_CATEGORIES.RESULT,
  } = options;


  const changes = [];


  const keys =
    new Set([
      ...Object.keys(
        oldObject || {}
      ),

      ...Object.keys(
        newObject || {}
      ),
    ]);


  keys.forEach(
    (field) => {
      if (
        ignoredFields.includes(
          field
        )
      ) {
        return;
      }


      const oldValue =
        oldObject?.[field];

      const newValue =
        newObject?.[field];


      if (
        areValuesEqual(
          oldValue,
          newValue
        )
      ) {
        return;
      }


      changes.push(
        createFieldChange({
          field,
          oldValue,
          newValue,
          category,
        })
      );
    }
  );


  return changes;
}


/* =========================================================
   MARKS CHANGE
========================================================= */

export function createMarksChange({
  subjectId = null,
  subjectCode = "",
  subjectName = "",
  component = "",
  oldMarks,
  newMarks,
} = {}) {
  const field =
    `marks.${subjectCode}.${component}`;


  return createFieldChange({
    field,

    label:
      `${subjectName || subjectCode} — ${component}`,

    oldValue:
      oldMarks,

    newValue:
      newMarks,

    category:
      AUDIT_CATEGORIES.MARKS,
  });
}


/* =========================================================
   MARKS DIFF
========================================================= */

export function createMarksDiff({
  oldMarks = {},
  newMarks = {},
  subjects = [],
} = {}) {
  const changes = [];


  const subjectMap =
    new Map();


  subjects.forEach(
    (subject) => {
      const code =
        subject?.subjectCode ||
        subject?.code ||
        subject?.id;


      if (code) {
        subjectMap.set(
          String(code),
          subject
        );
      }
    }
  );


  const subjectCodes =
    new Set([
      ...Object.keys(
        oldMarks || {}
      ),

      ...Object.keys(
        newMarks || {}
      ),
    ]);


  subjectCodes.forEach(
    (subjectCode) => {
      const oldSubject =
        oldMarks?.[
          subjectCode
        ] || {};


      const newSubject =
        newMarks?.[
          subjectCode
        ] || {};


      const components =
        new Set([
          ...Object.keys(
            oldSubject
          ),

          ...Object.keys(
            newSubject
          ),
        ]);


      const subject =
        subjectMap.get(
          String(subjectCode)
        );


      components.forEach(
        (component) => {
          const oldValue =
            oldSubject?.[
              component
            ];

          const newValue =
            newSubject?.[
              component
            ];


          if (
            areValuesEqual(
              oldValue,
              newValue
            )
          ) {
            return;
          }


          changes.push(
            createMarksChange({
              subjectId:
                subject?.id ||
                subject?.subjectId ||
                null,

              subjectCode,

              subjectName:
                subject?.subjectName ||
                subject?.name ||
                "",

              component,

              oldMarks:
                oldValue,

              newMarks:
                newValue,
            })
          );
        }
      );
    }
  );


  return changes;
}


/* =========================================================
   AUDIT MESSAGE
========================================================= */

export function createAuditMessage({
  action,
  actorName = "",
  role = "",
  field = "",
  subjectName = "",
  component = "",
  reason = "",
} = {}) {
  const normalized =
    normalizeAuditAction(
      action
    );


  const actor =
    actorName ||
    "User";


  switch (
    normalized
  ) {
    case AUDIT_ACTIONS.CREATE:
      return `${actor} created the result.`;

    case AUDIT_ACTIONS.UPDATE:
      return `${actor} updated the result.`;

    case AUDIT_ACTIONS.MARKS_UPDATED:
      return `${actor} updated marks${
        subjectName
          ? ` for ${subjectName}`
          : ""
      }${
        component
          ? ` (${component})`
          : ""
      }.`;

    case AUDIT_ACTIONS.SUBJECT_UPDATED:
      return `${actor} updated subject information.`;

    case AUDIT_ACTIONS.SUBMIT:
      return `${actor} submitted the result for verification.`;

    case AUDIT_ACTIONS.VERIFY:
      return `${actor} verified the result.`;

    case AUDIT_ACTIONS.REJECT:
      return `${actor} rejected the result${
        reason
          ? `: ${reason}`
          : "."
      }`;

    case AUDIT_ACTIONS.PUBLISH:
      return `${actor} published the result.`;

    case AUDIT_ACTIONS.UNPUBLISH:
      return `${actor} unpublished the result.`;

    case AUDIT_ACTIONS.RETURN_TO_DRAFT:
      return `${actor} returned the result to draft.`;

    case AUDIT_ACTIONS.DELETE:
      return `${actor} deleted the result.`;

    case AUDIT_ACTIONS.VIEW:
      return `${actor} viewed the result.`;

    case AUDIT_ACTIONS.DOWNLOAD:
      return `${actor} downloaded the result document.`;

    case AUDIT_ACTIONS.PRINT:
      return `${actor} printed the result document.`;

    case AUDIT_ACTIONS.SECURITY_DENIED:
      return `${actor} was denied access to a result action.`;

    case AUDIT_ACTIONS.SECURITY_WARNING:
      return `${actor} triggered a security warning.`;

    default:
      return field
        ? `${actor} changed ${formatAuditField(field)}.`
        : `${actor} performed ${normalized}.`;
  }
}


/* =========================================================
   CREATE AUDIT ENTRY
========================================================= */

export function createAuditEntry({
  action,
  category =
    AUDIT_CATEGORIES.RESULT,

  actor = null,

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


  const normalizedAction =
    normalizeAuditAction(
      action
    );


  const normalizedCategory =
    normalizeAuditCategory(
      category
    );


  const timestamp =
    new Date().toISOString();


  const safeChanges =
    Array.isArray(changes)
      ? changes.map(
          (change) => ({
            field:
              change?.field ||
              "",

            label:
              change?.label ||
              formatAuditField(
                change?.field
              ),

            oldValue:
              normalizeAuditValue(
                change?.oldValue
              ),

            newValue:
              normalizeAuditValue(
                change?.newValue
              ),

            category:
              normalizeAuditCategory(
                change?.category ||
                normalizedCategory
              ),

            changed:
              change?.changed !==
              false,
          })
        )
      : [];


  return {
    id: null,

    action:
      normalizedAction,

    category:
      normalizedCategory,

    resultId:
      resultId || null,

    studentId:
      studentId || null,

    actor: {
      id:
        normalizedActor.id,

      name:
        normalizedActor.name,

      role:
        normalizedActor.role,
    },

    /*
     * Email deliberately excluded from the persisted
     * audit object by default.
     */
    field:
      field || null,

    oldValue:
      normalizeAuditValue(
        oldValue
      ),

    newValue:
      normalizeAuditValue(
        newValue
      ),

    changes:
      safeChanges,

    previousStatus:
      previousStatus || null,

    nextStatus:
      nextStatus || null,

    reason:
      String(
        reason || ""
      ).trim(),

    message:
      createAuditMessage({
        action:
          normalizedAction,

        actorName:
          normalizedActor.name,

        role:
          normalizedActor.role,

        field,

        reason,
      }),

    metadata:
      normalizeAuditValue(
        metadata
      ),

    timestamp,

    createdAt:
      timestamp,

    schemaVersion:
      2,
  };
}


/* =========================================================
   WORKFLOW AUDIT
========================================================= */

export function createStatusAudit({
  action,
  resultId,
  studentId,
  actor,
  previousStatus,
  nextStatus,
  reason = "",
} = {}) {
  return createAuditEntry({
    action,

    category:
      AUDIT_CATEGORIES.WORKFLOW,

    resultId,

    studentId,

    actor,

    previousStatus,

    nextStatus,

    reason,

    metadata: {
      workflow:
        true,
    },
  });
}


/* =========================================================
   MARKS AUDIT
========================================================= */

export function createMarksAudit({
  resultId,
  studentId,
  actor,
  changes = [],
} = {}) {
  const safeChanges =
    Array.isArray(changes)
      ? changes.filter(
          (change) =>
            change?.changed !==
            false
        )
      : [];


  return createAuditEntry({
    action:
      AUDIT_ACTIONS.MARKS_UPDATED,

    category:
      AUDIT_CATEGORIES.MARKS,

    resultId,

    studentId,

    actor,

    changes:
      safeChanges,

    metadata: {
      totalChanges:
        safeChanges.length,

      hasMarksChanges:
        safeChanges.length > 0,
    },
  });
}


/* =========================================================
   RESULT UPDATE AUDIT
========================================================= */

export function createResultUpdateAudit({
  resultId,
  studentId,
  actor,
  oldResult = {},
  newResult = {},
  ignoredFields = [
    "updatedAt",
    "createdAt",
    "workflowHistory",
    "audit",
    "auditHistory",
  ],
} = {}) {
  const changes =
    createObjectDiff(
      oldResult,
      newResult,
      {
        ignoredFields,

        category:
          AUDIT_CATEGORIES.RESULT,
      }
    );


  return createAuditEntry({
    action:
      AUDIT_ACTIONS.UPDATE,

    category:
      AUDIT_CATEGORIES.RESULT,

    resultId,

    studentId,

    actor,

    changes,

    metadata: {
      totalChanges:
        changes.length,
    },
  });
}


/* =========================================================
   DOCUMENT AUDIT
========================================================= */

export function createDocumentAudit({
  action,
  resultId,
  studentId,
  actor,
  documentType =
    "marksheet",
  format = "pdf",
} = {}) {
  return createAuditEntry({
    action,

    category:
      AUDIT_CATEGORIES.DOCUMENT,

    resultId,

    studentId,

    actor,

    metadata: {
      documentType:
        String(
          documentType ||
          "marksheet"
        ),

      format:
        String(
          format ||
          "pdf"
        ),
    },
  });
}


/* =========================================================
   SECURITY AUDIT
========================================================= */

export function createSecurityAudit({
  action,
  resultId = null,
  studentId = null,
  actor = null,
  reason = "",
  metadata = {},
} = {}) {
  return createAuditEntry({
    action:
      normalizeAuditAction(
        action
      ),

    category:
      AUDIT_CATEGORIES.SECURITY,

    resultId,

    studentId,

    actor,

    reason,

    metadata: {
      securityEvent:
        true,

      ...(
        metadata &&
        typeof metadata ===
          "object"
          ? metadata
          : {}
      ),
    },
  });
}


/* =========================================================
   AUDIT SUMMARY
========================================================= */

export function summarizeAuditEntries(
  entries = []
) {
  const summary = {
    total: 0,

    byAction: {},

    byCategory: {},

    byRole: {},

    marksChanges: 0,

    workflowChanges: 0,

    documentActions: 0,

    securityEvents: 0,
  };


  if (
    !Array.isArray(
      entries
    )
  ) {
    return summary;
  }


  entries.forEach(
    (entry) => {
      summary.total += 1;


      const action =
        normalizeAuditAction(
          entry?.action
        );


      const category =
        normalizeAuditCategory(
          entry?.category ||
          AUDIT_CATEGORIES.RESULT
        );


      const role =
        normalizeAuditRole(
          entry?.actor?.role
        );


      summary.byAction[
        action
      ] =
        (
          summary.byAction[
            action
          ] || 0
        ) + 1;


      summary.byCategory[
        category
      ] =
        (
          summary.byCategory[
            category
          ] || 0
        ) + 1;


      if (role) {
        summary.byRole[
          role
        ] =
          (
            summary.byRole[
              role
            ] || 0
          ) + 1;
      }


      if (
        category ===
        AUDIT_CATEGORIES.MARKS
      ) {
        summary.marksChanges +=
          Array.isArray(
            entry?.changes
          )
            ? entry.changes.length
            : 1;
      }


      if (
        category ===
        AUDIT_CATEGORIES.WORKFLOW
      ) {
        summary.workflowChanges +=
          1;
      }


      if (
        category ===
        AUDIT_CATEGORIES.DOCUMENT
      ) {
        summary.documentActions +=
          1;
      }


      if (
        category ===
        AUDIT_CATEGORIES.SECURITY
      ) {
        summary.securityEvents +=
          1;
      }
    }
  );


  return summary;
}


/* =========================================================
   FILTER AUDIT ENTRIES
========================================================= */

export function filterAuditEntries(
  entries = [],
  filters = {}
) {
  if (
    !Array.isArray(
      entries
    )
  ) {
    return [];
  }


  const {
    action,
    category,
    role,
    actorId,
    resultId,
    studentId,
    field,
    fromDate,
    toDate,
  } = filters;


  return entries.filter(
    (entry) => {
      if (
        action &&
        normalizeAuditAction(
          entry?.action
        ) !==
          normalizeAuditAction(
            action
          )
      ) {
        return false;
      }


      if (
        category &&
        normalizeAuditCategory(
          entry?.category
        ) !==
          normalizeAuditCategory(
            category
          )
      ) {
        return false;
      }


      if (
        role &&
        normalizeAuditRole(
          entry?.actor?.role
        ) !==
          normalizeAuditRole(
            role
          )
      ) {
        return false;
      }


      if (
        actorId &&
        entry?.actor?.id !==
          actorId
      ) {
        return false;
      }


      if (
        resultId &&
        entry?.resultId !==
          resultId
      ) {
        return false;
      }


      if (
        studentId &&
        entry?.studentId !==
          studentId
      ) {
        return false;
      }


      if (
        field &&
        entry?.field !==
          field
      ) {
        return false;
      }


      if (
        fromDate &&
        new Date(
          entry?.timestamp
        ) <
          new Date(
            fromDate
          )
      ) {
        return false;
      }


      if (
        toDate &&
        new Date(
          entry?.timestamp
        ) >
          new Date(
            toDate
          )
      ) {
        return false;
      }


      return true;
    }
  );
}


/* =========================================================
   SORT
========================================================= */

export function sortAuditEntries(
  entries = [],
  direction = "desc"
) {
  if (
    !Array.isArray(
      entries
    )
  ) {
    return [];
  }


  const sorted = [
    ...entries,
  ];


  sorted.sort(
    (a, b) => {
      const timeA =
        new Date(
          a?.timestamp
        ).getTime();

      const timeB =
        new Date(
          b?.timestamp
        ).getTime();


      return direction ===
        "asc"
        ? timeA - timeB
        : timeB - timeA;
    }
  );


  return sorted;
}


/* =========================================================
   HUMAN READABLE CHANGE
========================================================= */

export function formatAuditChange(
  change
) {
  if (!change) {
    return "";
  }


  const label =
    change.label ||
    formatAuditField(
      change.field
    );


  const oldValue =
    formatAuditDisplayValue(
      change.oldValue
    );


  const newValue =
    formatAuditDisplayValue(
      change.newValue
    );


  return `${label}: ${oldValue} → ${newValue}`;
}


/* =========================================================
   DISPLAY VALUE
========================================================= */

export function formatAuditDisplayValue(
  value
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "Empty";
  }


  if (
    typeof value ===
    "boolean"
  ) {
    return value
      ? "Yes"
      : "No";
  }


  if (
    value instanceof Date
  ) {
    return value.toLocaleString();
  }


  if (
    typeof value ===
    "object"
  ) {
    try {
      return JSON.stringify(
        value
      );
    } catch {
      return "[Object]";
    }
  }


  return String(
    value
  );
}


/* =========================================================
   LATEST ENTRY
========================================================= */

export function getLatestAuditEntry(
  entries = []
) {
  if (
    !Array.isArray(
      entries
    ) ||
    !entries.length
  ) {
    return null;
  }


  return sortAuditEntries(
    entries,
    "desc"
  )[0] || null;
}


/* =========================================================
   LATEST MARKS AUDIT
========================================================= */

export function getLatestMarksAudit(
  entries = []
) {
  const marksEntries =
    filterAuditEntries(
      entries,
      {
        category:
          AUDIT_CATEGORIES.MARKS,
      }
    );


  return getLatestAuditEntry(
    marksEntries
  );
}


/* =========================================================
   LATEST WORKFLOW AUDIT
========================================================= */

export function getLatestWorkflowAudit(
  entries = []
) {
  const workflowEntries =
    filterAuditEntries(
      entries,
      {
        category:
          AUDIT_CATEGORIES.WORKFLOW,
      }
    );


  return getLatestAuditEntry(
    workflowEntries
  );
}


/* =========================================================
   SECURITY EVENTS
========================================================= */

export function getSecurityAuditEntries(
  entries = []
) {
  return filterAuditEntries(
    entries,
    {
      category:
        AUDIT_CATEGORIES.SECURITY,
    }
  );
}


/* =========================================================
   RESULT HISTORY
========================================================= */

export function getResultHistory(
  entries = []
) {
  return sortAuditEntries(
    filterAuditEntries(
      entries,
      {
        category:
          AUDIT_CATEGORIES.RESULT,
      }
    ),
    "desc"
  );
}


/* =========================================================
   WORKFLOW HISTORY
========================================================= */

export function getWorkflowHistory(
  entries = []
) {
  return sortAuditEntries(
    filterAuditEntries(
      entries,
      {
        category:
          AUDIT_CATEGORIES.WORKFLOW,
      }
    ),
    "asc"
  );
}


/* =========================================================
   AUDIT EXPORT
========================================================= */

export function prepareAuditExport(
  entries = []
) {
  if (
    !Array.isArray(
      entries
    )
  ) {
    return [];
  }


  return entries.map(
    (entry) => ({
      timestamp:
        entry?.timestamp ||
        "",

      action:
        entry?.action ||
        "",

      category:
        entry?.category ||
        "",

      actor:
        entry?.actor?.name ||
        entry?.actor?.id ||
        "Unknown",

      role:
        entry?.actor?.role ||
        "",

      resultId:
        entry?.resultId ||
        "",

      studentId:
        entry?.studentId ||
        "",

      previousStatus:
        entry?.previousStatus ||
        "",

      nextStatus:
        entry?.nextStatus ||
        "",

      field:
        entry?.field ||
        "",

      oldValue:
        formatAuditDisplayValue(
          entry?.oldValue
        ),

      newValue:
        formatAuditDisplayValue(
          entry?.newValue
        ),

      changes:
        Array.isArray(
          entry?.changes
        )
          ? entry.changes
              .map(
                formatAuditChange
              )
              .join(" | ")
          : "",

      reason:
        entry?.reason ||
        "",

      message:
        entry?.message ||
        "",
    })
  );
}


/* =========================================================
   AUDIT VALIDATION
========================================================= */

export function validateAuditEntry(
  entry
) {
  const errors = [];


  if (
    !entry ||
    typeof entry !==
      "object"
  ) {
    errors.push(
      "Audit entry is invalid."
    );
  }


  if (
    !entry?.action
  ) {
    errors.push(
      "Audit action is required."
    );
  }


  if (
    !entry?.category
  ) {
    errors.push(
      "Audit category is required."
    );
  }


  if (
    !entry?.timestamp
  ) {
    errors.push(
      "Audit timestamp is required."
    );
  }


  if (
    !entry?.actor?.id
  ) {
    errors.push(
      "Audit actor ID is required."
    );
  }


  if (
    !entry?.actor?.role
  ) {
    errors.push(
      "Audit actor role is required."
    );
  }


  return {
    valid:
      errors.length === 0,

    errors,
  };
}


/* =========================================================
   CREATE SECURITY DENIAL ENTRY
========================================================= */

export function createSecurityDeniedAudit({
  actor,
  resultId = null,
  studentId = null,
  action,
  reason = "",
  metadata = {},
} = {}) {
  return createSecurityAudit({
    action:
      AUDIT_ACTIONS.SECURITY_DENIED,

    resultId,

    studentId,

    actor,

    reason,

    metadata: {
      attemptedAction:
        normalizeAuditAction(
          action
        ),

      ...metadata,
    },
  });
}


/* =========================================================
   CREATE SIMPLE WORKFLOW ENTRY
========================================================= */

export function createWorkflowAudit({
  action,
  actor,
  resultId = null,
  studentId = null,
  previousStatus = null,
  nextStatus = null,
  reason = "",
} = {}) {
  return createStatusAudit({
    action,

    actor,

    resultId,

    studentId,

    previousStatus,

    nextStatus,

    reason,
  });
}


/* =========================================================
   DEFAULT EXPORT
========================================================= */

export default {
  AUDIT_ACTIONS,
  AUDIT_CATEGORIES,
  AUDIT_ROLES,

  normalizeAuditAction,
  normalizeAuditRole,
  normalizeAuditCategory,
  normalizeAuditValue,
  normalizeAuditActor,

  formatAuditField,
  formatAuditDisplayValue,

  areValuesEqual,

  createFieldChange,
  createObjectDiff,

  createMarksChange,
  createMarksDiff,

  createAuditMessage,
  createAuditEntry,

  createStatusAudit,
  createWorkflowAudit,
  createMarksAudit,
  createResultUpdateAudit,

  createDocumentAudit,
  createSecurityAudit,
  createSecurityDeniedAudit,

  summarizeAuditEntries,
  filterAuditEntries,
  sortAuditEntries,

  getLatestAuditEntry,
  getLatestMarksAudit,
  getLatestWorkflowAudit,

  getSecurityAuditEntries,
  getResultHistory,
  getWorkflowHistory,

  formatAuditChange,
  prepareAuditExport,

  validateAuditEntry,
};