/* =========================================================
   FILE 29 — ADVANCED RESULT SECURITY ENGINE
   =========================================================

   Security responsibilities:
   - Role normalization
   - Result ownership
   - Teacher class/section access
   - Status protection
   - Action authorization
   - Published-result protection
   - Student isolation
   - Security denial information

   FINAL SECURITY:
   Firebase Authentication
          +
   Firestore Security Rules

   This file is an application-level security layer.
========================================================= */


/* =========================================================
   ROLES
========================================================= */

export const SECURITY_ROLES =
  Object.freeze({
    ADMIN: "admin",
    TEACHER: "teacher",
    STUDENT: "student",
  });


/* =========================================================
   RESULT STATUS
========================================================= */

export const SECURITY_STATUS =
  Object.freeze({
    DRAFT: "draft",
    SUBMITTED: "submitted",
    VERIFIED: "verified",
    REJECTED: "rejected",
    PUBLISHED: "published",
  });


/* =========================================================
   SECURITY ACTIONS
========================================================= */

export const SECURITY_ACTIONS =
  Object.freeze({
    VIEW: "VIEW",
    READ: "READ",

    CREATE: "CREATE",
    EDIT: "EDIT",
    SAVE: "SAVE",

    SUBMIT: "SUBMIT",

    VERIFY: "VERIFY",
    REJECT: "REJECT",

    PUBLISH: "PUBLISH",
    UNPUBLISH: "UNPUBLISH",

    DELETE: "DELETE",

    DOWNLOAD: "DOWNLOAD",
    EXPORT: "EXPORT",
    PRINT: "PRINT",
  });


/* =========================================================
   NORMALIZERS
========================================================= */

export function normalizeRole(
  role
) {
  return String(
    role || ""
  )
    .trim()
    .toLowerCase();
}


export function normalizeStatus(
  status
) {
  return String(
    status || ""
  )
    .trim()
    .toLowerCase();
}


export function normalizeAction(
  action
) {
  return String(
    action || ""
  )
    .trim()
    .toUpperCase()
    .replace(
      /[\s-]+/g,
      "_"
    );
}


/* =========================================================
   BASIC ROLE CHECKS
========================================================= */

export function isAdmin(
  actor
) {
  return (
    normalizeRole(
      actor?.role
    ) ===
    SECURITY_ROLES.ADMIN
  );
}


export function isTeacher(
  actor
) {
  return (
    normalizeRole(
      actor?.role
    ) ===
    SECURITY_ROLES.TEACHER
  );
}


export function isStudent(
  actor
) {
  return (
    normalizeRole(
      actor?.role
    ) ===
    SECURITY_ROLES.STUDENT
  );
}


/* =========================================================
   ACTOR UID
========================================================= */

export function getActorUid(
  actor
) {
  return (
    actor?.uid ||
    actor?.id ||
    actor?.userId ||
    null
  );
}


/* =========================================================
   RESULT STUDENT UID
========================================================= */

export function getResultStudentUid(
  result
) {
  return (
    result?.studentUid ||
    result?.studentId ||
    result?.uid ||
    null
  );
}


/* =========================================================
   RESULT OWNERSHIP
========================================================= */

export function isResultOwner({
  actor,
  result,
} = {}) {
  const actorUid =
    getActorUid(
      actor
    );

  const studentUid =
    getResultStudentUid(
      result
    );


  if (
    !actorUid ||
    !studentUid
  ) {
    return false;
  }


  return (
    actorUid ===
    studentUid
  );
}


/* =========================================================
   ASSIGNED CLASS EXTRACTION
========================================================= */

function getAssignedClasses(
  actor
) {
  const assignments =
    actor?.assignedClasses ||
    actor?.assignedClassIds ||
    actor?.classes ||
    [];


  if (
    !Array.isArray(
      assignments
    )
  ) {
    return [];
  }


  return assignments;
}


/* =========================================================
   CLASS MATCHING
========================================================= */

function classAssignmentMatches({
  assignment,
  result,
} = {}) {
  if (
    assignment === null ||
    assignment === undefined
  ) {
    return false;
  }


  /*
   * Simple class ID format.
   */

  if (
    typeof assignment ===
    "string"
  ) {
    return (
      assignment ===
        result?.classId ||
      assignment ===
        result?.className
    );
  }


  /*
   * Object format.
   */

  if (
    typeof assignment ===
    "object"
  ) {
    const assignmentClassId =
      assignment.classId ||
      assignment.id ||
      assignment.class ||
      assignment.className;


    const assignmentSection =
      assignment.section ||
      null;


    const classMatches =
      !assignmentClassId ||
      assignmentClassId ===
        result?.classId ||
      assignmentClassId ===
        result?.className;


    const sectionMatches =
      !assignmentSection ||
      assignmentSection ===
        result?.section;


    return (
      classMatches &&
      sectionMatches
    );
  }


  return false;
}


/* =========================================================
   TEACHER CLASS ACCESS
========================================================= */

export function canAccessResultClass({
  actor,
  result,
} = {}) {
  if (
    !isTeacher(
      actor
    )
  ) {
    return false;
  }


  const assignments =
    getAssignedClasses(
      actor
    );


  if (
    assignments.length === 0
  ) {
    return false;
  }


  return assignments.some(
    (assignment) =>
      classAssignmentMatches({
        assignment,

        result,
      })
  );
}


/* =========================================================
   RESULT STATUS HELPERS
========================================================= */

export function isDraft(
  result
) {
  return (
    normalizeStatus(
      result?.status
    ) ===
    SECURITY_STATUS.DRAFT
  );
}


export function isSubmitted(
  result
) {
  return (
    normalizeStatus(
      result?.status
    ) ===
    SECURITY_STATUS.SUBMITTED
  );
}


export function isVerified(
  result
) {
  return (
    normalizeStatus(
      result?.status
    ) ===
    SECURITY_STATUS.VERIFIED
  );
}


export function isRejected(
  result
) {
  return (
    normalizeStatus(
      result?.status
    ) ===
    SECURITY_STATUS.REJECTED
  );
}


export function isPublished(
  result
) {
  return (
    normalizeStatus(
      result?.status
    ) ===
    SECURITY_STATUS.PUBLISHED
  );
}


/* =========================================================
   PUBLISHED LOCK
========================================================= */

export function isResultLocked(
  result
) {
  return isPublished(
    result
  );
}


/* =========================================================
   CAN VIEW
========================================================= */

export function canViewResult({
  actor,
  result,
} = {}) {
  if (
    !actor ||
    !result
  ) {
    return false;
  }


  /*
   * Admin sees everything.
   */

  if (
    isAdmin(
      actor
    )
  ) {
    return true;
  }


  /*
   * Teacher sees assigned class only.
   */

  if (
    isTeacher(
      actor
    )
  ) {
    return canAccessResultClass({
      actor,

      result,
    });
  }


  /*
   * Student:
   * own + published only.
   */

  if (
    isStudent(
      actor
    )
  ) {
    return (
      isResultOwner({
        actor,

        result,
      }) &&
      isPublished(
        result
      )
    );
  }


  return false;
}


/* =========================================================
   CAN CREATE
========================================================= */

export function canCreateResult({
  actor,
  result = {},
} = {}) {
  if (
    isAdmin(
      actor
    )
  ) {
    return true;
  }


  if (
    isTeacher(
      actor
    )
  ) {
    return canAccessResultClass({
      actor,

      result,
    });
  }


  return false;
}


/* =========================================================
   CAN EDIT
========================================================= */

export function canEditResult({
  actor,
  result,
} = {}) {
  if (
    !actor ||
    !result
  ) {
    return false;
  }


  /*
   * Published results are immutable
   * through normal application flow.
   */

  if (
    isResultLocked(
      result
    )
  ) {
    return false;
  }


  /*
   * Submitted and verified results
   * are workflow locked.
   */

  if (
    isSubmitted(
      result
    ) ||
    isVerified(
      result
    )
  ) {
    return false;
  }


  /*
   * Admin can edit draft/rejected.
   */

  if (
    isAdmin(
      actor
    )
  ) {
    return (
      isDraft(
        result
      ) ||
      isRejected(
        result
      )
    );
  }


  /*
   * Teacher can edit only assigned
   * class/section.
   */

  if (
    isTeacher(
      actor
    )
  ) {
    return (
      (
        isDraft(
          result
        ) ||
        isRejected(
          result
        )
      ) &&
      canAccessResultClass({
        actor,

        result,
      })
    );
  }


  return false;
}


/* =========================================================
   CAN SUBMIT
========================================================= */

export function canSubmitResult({
  actor,
  result,
} = {}) {
  if (
    !isDraft(
      result
    )
  ) {
    return false;
  }


  if (
    isAdmin(
      actor
    )
  ) {
    return true;
  }


  if (
    isTeacher(
      actor
    ) &&
    canAccessResultClass({
      actor,

      result,
    })
  ) {
    return true;
  }


  return false;
}


/* =========================================================
   CAN VERIFY
========================================================= */

export function canVerifyResult({
  actor,
  result,
} = {}) {
  return (
    isAdmin(
      actor
    ) &&
    isSubmitted(
      result
    )
  );
}


/* =========================================================
   CAN REJECT
========================================================= */

export function canRejectResult({
  actor,
  result,
} = {}) {
  return (
    isAdmin(
      actor
    ) &&
    isSubmitted(
      result
    )
  );
}


/* =========================================================
   CAN PUBLISH
========================================================= */

export function canPublishResult({
  actor,
  result,
} = {}) {
  return (
    isAdmin(
      actor
    ) &&
    isVerified(
      result
    )
  );
}


/* =========================================================
   CAN UNPUBLISH
========================================================= */

export function canUnpublishResult({
  actor,
  result,
} = {}) {
  return (
    isAdmin(
      actor
    ) &&
    isPublished(
      result
    )
  );
}


/* =========================================================
   CAN DELETE
========================================================= */

export function canDeleteResult({
  actor,
  result,
} = {}) {
  /*
   * Only Admin.
   */

  if (
    !isAdmin(
      actor
    )
  ) {
    return false;
  }


  /*
   * Published result cannot be
   * deleted normally.
   */

  return !isPublished(
    result
  );
}


/* =========================================================
   CAN DOWNLOAD
========================================================= */

export function canDownloadResult({
  actor,
  result,
} = {}) {
  if (
    isAdmin(
      actor
    )
  ) {
    return true;
  }


  if (
    isTeacher(
      actor
    )
  ) {
    return canAccessResultClass({
      actor,

      result,
    });
  }


  if (
    isStudent(
      actor
    )
  ) {
    return (
      isResultOwner({
        actor,

        result,
      }) &&
      isPublished(
        result
      )
    );
  }


  return false;
}


/* =========================================================
   CAN PRINT
========================================================= */

export function canPrintResult({
  actor,
  result,
} = {}) {
  return canDownloadResult({
    actor,

    result,
  });
}


/* =========================================================
   GENERIC ACTION CHECK
========================================================= */

export function canPerformSecurityAction({
  actor,
  result,
  action,
} = {}) {
  const normalizedAction =
    normalizeAction(
      action
    );


  switch (
    normalizedAction
  ) {
    case SECURITY_ACTIONS.VIEW:
    case SECURITY_ACTIONS.READ:
      return canViewResult({
        actor,

        result,
      });


    case SECURITY_ACTIONS.CREATE:
      return canCreateResult({
        actor,

        result,
      });


    case SECURITY_ACTIONS.EDIT:
    case SECURITY_ACTIONS.SAVE:
      return canEditResult({
        actor,

        result,
      });


    case SECURITY_ACTIONS.SUBMIT:
      return canSubmitResult({
        actor,

        result,
      });


    case SECURITY_ACTIONS.VERIFY:
      return canVerifyResult({
        actor,

        result,
      });


    case SECURITY_ACTIONS.REJECT:
      return canRejectResult({
        actor,

        result,
      });


    case SECURITY_ACTIONS.PUBLISH:
      return canPublishResult({
        actor,

        result,
      });


    case SECURITY_ACTIONS.UNPUBLISH:
      return canUnpublishResult({
        actor,

        result,
      });


    case SECURITY_ACTIONS.DELETE:
      return canDeleteResult({
        actor,

        result,
      });


    case SECURITY_ACTIONS.DOWNLOAD:
    case SECURITY_ACTIONS.EXPORT:
      return canDownloadResult({
        actor,

        result,
      });


    case SECURITY_ACTIONS.PRINT:
      return canPrintResult({
        actor,

        result,
      });


    default:
      return false;
  }
}


/* =========================================================
   SECURITY DECISION
========================================================= */

export function getSecurityDecision({
  actor,
  result,
  action,
} = {}) {
  const normalizedAction =
    normalizeAction(
      action
    );


  const allowed =
    canPerformSecurityAction({
      actor,

      result,

      action:
        normalizedAction,
    });


  if (
    allowed
  ) {
    return {
      allowed: true,

      action:
        normalizedAction,

      role:
        normalizeRole(
          actor?.role
        ),

      reason: null,
    };
  }


  return {
    allowed: false,

    action:
      normalizedAction,

    role:
      normalizeRole(
        actor?.role
      ),

    reason:
      getSecurityDenialReason({
        actor,

        result,

        action:
          normalizedAction,
      }),
  };
}


/* =========================================================
   SECURITY DENIAL REASON
========================================================= */

export function getSecurityDenialReason({
  actor,
  result,
  action,
} = {}) {
  const normalizedAction =
    normalizeAction(
      action
    );


  const role =
    normalizeRole(
      actor?.role
    );


  if (
    !role
  ) {
    return "Authentication is required.";
  }


  if (
    role ===
    SECURITY_ROLES.STUDENT
  ) {
    if (
      !isResultOwner({
        actor,

        result,
      })
    ) {
      return "Students can access only their own result.";
    }


    if (
      !isPublished(
        result
      )
    ) {
      return "This result has not been published yet.";
    }


    return "Students have read-only access to published results.";
  }


  if (
    role ===
    SECURITY_ROLES.TEACHER
  ) {
    if (
      normalizedAction ===
      SECURITY_ACTIONS.VERIFY
    ) {
      return "Only Admin can verify results.";
    }


    if (
      normalizedAction ===
      SECURITY_ACTIONS.REJECT
    ) {
      return "Only Admin can reject results.";
    }


    if (
      normalizedAction ===
      SECURITY_ACTIONS.PUBLISH
    ) {
      return "Only Admin can publish results.";
    }


    if (
      normalizedAction ===
      SECURITY_ACTIONS.UNPUBLISH
    ) {
      return "Only Admin can unpublish results.";
    }


    if (
      !canAccessResultClass({
        actor,

        result,
      })
    ) {
      return "This result does not belong to your assigned class/section.";
    }


    if (
      isPublished(
        result
      )
    ) {
      return "Published results are locked.";
    }


    if (
      isSubmitted(
        result
      ) ||
      isVerified(
        result
      )
    ) {
      return "This result is locked by the verification workflow.";
    }
  }


  if (
    role ===
    SECURITY_ROLES.ADMIN
  ) {
    if (
      isPublished(
        result
      ) &&
      (
        normalizedAction ===
          SECURITY_ACTIONS.EDIT ||
        normalizedAction ===
          SECURITY_ACTIONS.SAVE ||
        normalizedAction ===
          SECURITY_ACTIONS.DELETE
      )
    ) {
      return "Published results cannot be modified through this action.";
    }
  }


  return "You do not have permission to perform this action.";
}


/* =========================================================
   SECURE ACTION GUARD
========================================================= */

export function requireSecurityPermission({
  actor,
  result,
  action,
} = {}) {
  const decision =
    getSecurityDecision({
      actor,

      result,

      action,
    });


  if (
    !decision.allowed
  ) {
    const error =
      new Error(
        decision.reason
      );


    error.code =
      "RESULT_SECURITY_DENIED";

    error.action =
      decision.action;

    error.role =
      decision.role;


    throw error;
  }


  return true;
}


/* =========================================================
   ROLE SECURITY PROFILE
========================================================= */

export function getSecurityProfile(
  role
) {
  const normalizedRole =
    normalizeRole(
      role
    );


  switch (
    normalizedRole
  ) {
    case SECURITY_ROLES.ADMIN:
      return {
        role:
          normalizedRole,

        fullAccess: true,

        canView: true,
        canCreate: true,
        canEdit: true,
        canSave: true,
        canSubmit: true,

        canVerify: true,
        canReject: true,
        canPublish: true,
        canUnpublish: true,

        canDelete: true,

        canDownload: true,
        canPrint: true,

        assignedClassOnly: false,
        ownResultOnly: false,
      };


    case SECURITY_ROLES.TEACHER:
      return {
        role:
          normalizedRole,

        fullAccess: false,

        canView: true,
        canCreate: true,
        canEdit: true,
        canSave: true,
        canSubmit: true,

        canVerify: false,
        canReject: false,
        canPublish: false,
        canUnpublish: false,

        canDelete: false,

        canDownload: true,
        canPrint: true,

        assignedClassOnly: true,
        ownResultOnly: false,
      };


    case SECURITY_ROLES.STUDENT:
      return {
        role:
          normalizedRole,

        fullAccess: false,

        canView: true,
        canCreate: false,
        canEdit: false,
        canSave: false,
        canSubmit: false,

        canVerify: false,
        canReject: false,
        canPublish: false,
        canUnpublish: false,

        canDelete: false,

        canDownload: true,
        canPrint: true,

        assignedClassOnly: false,
        ownResultOnly: true,
      };


    default:
      return {
        role:
          normalizedRole,

        fullAccess: false,

        canView: false,
        canCreate: false,
        canEdit: false,
        canSave: false,
        canSubmit: false,

        canVerify: false,
        canReject: false,
        canPublish: false,
        canUnpublish: false,

        canDelete: false,

        canDownload: false,
        canPrint: false,

        assignedClassOnly: false,
        ownResultOnly: false,
      };
  }
}


/* =========================================================
   EXPORT
========================================================= */

export default {
  SECURITY_ROLES,
  SECURITY_STATUS,
  SECURITY_ACTIONS,

  normalizeRole,
  normalizeStatus,
  normalizeAction,

  isAdmin,
  isTeacher,
  isStudent,

  getActorUid,
  getResultStudentUid,

  isResultOwner,
  canAccessResultClass,

  isDraft,
  isSubmitted,
  isVerified,
  isRejected,
  isPublished,
  isResultLocked,

  canViewResult,
  canCreateResult,
  canEditResult,
  canSubmitResult,

  canVerifyResult,
  canRejectResult,
  canPublishResult,
  canUnpublishResult,

  canDeleteResult,
  canDownloadResult,
  canPrintResult,

  canPerformSecurityAction,

  getSecurityDecision,
  getSecurityDenialReason,

  requireSecurityPermission,

  getSecurityProfile,
};