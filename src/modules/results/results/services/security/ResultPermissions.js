/* =========================================================
   RESULT PERMISSIONS
   Centralized role + status authorization
========================================================= */

export const RESULT_ROLES = {
  ADMIN: "admin",
  TEACHER: "teacher",
  STUDENT: "student",
};


export const RESULT_STATUS = {
  DRAFT: "draft",
  SUBMITTED: "submitted",
  VERIFIED: "verified",
  REJECTED: "rejected",
  PUBLISHED: "published",
};


/* =========================================================
   NORMALIZERS
========================================================= */

function normalizeRole(role) {
  return String(
    role || ""
  )
    .trim()
    .toLowerCase();
}


function normalizeStatus(status) {
  return String(
    status || ""
  )
    .trim()
    .toLowerCase();
}


/* =========================================================
   ROLE CHECKS
========================================================= */

export function isAdmin(
  actor
) {
  return (
    normalizeRole(
      actor?.role
    ) ===
    RESULT_ROLES.ADMIN
  );
}


export function isTeacher(
  actor
) {
  return (
    normalizeRole(
      actor?.role
    ) ===
    RESULT_ROLES.TEACHER
  );
}


export function isStudent(
  actor
) {
  return (
    normalizeRole(
      actor?.role
    ) ===
    RESULT_ROLES.STUDENT
  );
}


/* =========================================================
   STUDENT OWNERSHIP
========================================================= */

export function isOwnStudentResult(
  actor,
  result
) {
  if (!isStudent(actor)) {
    return false;
  }

  if (
    !actor?.uid ||
    !result?.studentId
  ) {
    return false;
  }

  return (
    actor.uid ===
    result.studentId
  );
}


/* =========================================================
   TEACHER OWNERSHIP
========================================================= */

export function isAssignedTeacher(
  actor,
  result
) {
  if (!isTeacher(actor)) {
    return false;
  }

  if (
    !actor?.uid ||
    !result
  ) {
    return false;
  }

  /*
   * Support multiple existing
   * teacher-field conventions.
   */

  const teacherId =
    result.teacherId ||
    result.createdBy ||
    result.assignedTeacherId;


  if (!teacherId) {
    return false;
  }

  return (
    teacherId ===
    actor.uid
  );
}


/* =========================================================
   VIEW PERMISSION
========================================================= */

export function canViewResult(
  actor,
  result
) {
  if (!actor || !result) {
    return false;
  }


  if (isAdmin(actor)) {
    return true;
  }


  if (
    isTeacher(actor)
  ) {
    return isAssignedTeacher(
      actor,
      result
    );
  }


  if (
    isStudent(actor)
  ) {
    return (
      isOwnStudentResult(
        actor,
        result
      ) &&
      normalizeStatus(
        result.status
      ) ===
        RESULT_STATUS.PUBLISHED
    );
  }


  return false;
}


/* =========================================================
   EDIT
========================================================= */

export function canEditResult(
  actor,
  result
) {
  if (!actor || !result) {
    return false;
  }


  const status =
    normalizeStatus(
      result.status
    );


  /*
   * Admin can edit non-published
   * results.
   *
   * Published results should not
   * be silently edited.
   */

  if (isAdmin(actor)) {
    return (
      status !==
      RESULT_STATUS.PUBLISHED
    );
  }


  /*
   * Teacher can edit only their
   * assigned result and only while
   * result is editable.
   */

  if (isTeacher(actor)) {
    return (
      isAssignedTeacher(
        actor,
        result
      ) &&
      (
        status ===
          RESULT_STATUS.DRAFT ||
        status ===
          RESULT_STATUS.REJECTED
      )
    );
  }


  return false;
}


/* =========================================================
   SUBMIT
========================================================= */

export function canSubmitResult(
  actor,
  result
) {
  if (!actor || !result) {
    return false;
  }


  if (!isTeacher(actor)) {
    return false;
  }


  const status =
    normalizeStatus(
      result.status
    );


  return (
    isAssignedTeacher(
      actor,
      result
    ) &&
    (
      status ===
        RESULT_STATUS.DRAFT ||
      status ===
        RESULT_STATUS.REJECTED
    )
  );
}


/* =========================================================
   VERIFY
========================================================= */

export function canVerifyResult(
  actor,
  result
) {
  if (!isAdmin(actor)) {
    return false;
  }


  return (
    normalizeStatus(
      result?.status
    ) ===
    RESULT_STATUS.SUBMITTED
  );
}


/* =========================================================
   REJECT
========================================================= */

export function canRejectResult(
  actor,
  result
) {
  if (!isAdmin(actor)) {
    return false;
  }


  return (
    normalizeStatus(
      result?.status
    ) ===
    RESULT_STATUS.SUBMITTED
  );
}


/* =========================================================
   PUBLISH
========================================================= */

export function canPublishResult(
  actor,
  result
) {
  if (!isAdmin(actor)) {
    return false;
  }


  /*
   * Publishing is allowed only
   * after administrative verification.
   */

  return (
    normalizeStatus(
      result?.status
    ) ===
    RESULT_STATUS.VERIFIED
  );
}


/* =========================================================
   UNPUBLISH
========================================================= */

export function canUnpublishResult(
  actor,
  result
) {
  if (!isAdmin(actor)) {
    return false;
  }


  return (
    normalizeStatus(
      result?.status
    ) ===
    RESULT_STATUS.PUBLISHED
  );
}


/* =========================================================
   DOWNLOAD
========================================================= */

export function canDownloadResult(
  actor,
  result
) {
  if (!actor || !result) {
    return false;
  }


  if (isAdmin(actor)) {
    return true;
  }


  if (isTeacher(actor)) {
    return isAssignedTeacher(
      actor,
      result
    );
  }


  if (isStudent(actor)) {
    return (
      isOwnStudentResult(
        actor,
        result
      ) &&
      normalizeStatus(
        result.status
      ) ===
        RESULT_STATUS.PUBLISHED
    );
  }


  return false;
}


/* =========================================================
   PRINT
========================================================= */

export function canPrintResult(
  actor,
  result
) {
  return canDownloadResult(
    actor,
    result
  );
}


/* =========================================================
   ALL PERMISSIONS
========================================================= */

export function getResultPermissions(
  actor,
  result
) {
  return {
    view:
      canViewResult(
        actor,
        result
      ),

    edit:
      canEditResult(
        actor,
        result
      ),

    submit:
      canSubmitResult(
        actor,
        result
      ),

    verify:
      canVerifyResult(
        actor,
        result
      ),

    reject:
      canRejectResult(
        actor,
        result
      ),

    publish:
      canPublishResult(
        actor,
        result
      ),

    unpublish:
      canUnpublishResult(
        actor,
        result
      ),

    download:
      canDownloadResult(
        actor,
        result
      ),

    print:
      canPrintResult(
        actor,
        result
      ),
  };
}


/* =========================================================
   WORKFLOW VALIDATION
========================================================= */

export function getNextAllowedActions(
  actor,
  result
) {
  const permissions =
    getResultPermissions(
      actor,
      result
    );


  return Object.entries(
    permissions
  )
    .filter(
      ([, allowed]) =>
        allowed === true
    )
    .map(
      ([action]) =>
        action
    );
}


/* =========================================================
   SECURITY-SAFE ACTION GUARD
========================================================= */

export function assertResultAction(
  actor,
  result,
  action
) {
  const permissions =
    getResultPermissions(
      actor,
      result
    );


  if (
    permissions[action] !==
    true
  ) {
    const error =
      new Error(
        `Unauthorized result action: ${action}`
      );


    error.code =
      "RESULT_ACTION_UNAUTHORIZED";

    throw error;
  }


  return true;
}