/* =========================================================
   FILE 18 — ADVANCED RESULT PERMISSIONS ENGINE
   =========================================================

   ROLE MODEL

   TEACHER
   ✓ View assigned-class students
   ✓ Enter marks
   ✓ Edit draft/rejected marks
   ✓ Save draft
   ✓ Submit result
   ✗ Verify
   ✗ Publish
   ✗ Unpublish

   ADMIN
   ✓ Full result access
   ✓ View all students
   ✓ Edit results
   ✓ Verify
   ✓ Reject
   ✓ Publish
   ✓ Unpublish

   STUDENT
   ✓ View own PUBLISHED result
   ✓ Download own PUBLISHED marksheet
   ✓ Print own PUBLISHED marksheet
   ✗ View another student's result
   ✗ Edit
   ✗ Verify
   ✗ Publish

   IMPORTANT:
   This is frontend authorization logic.
   Firestore Security Rules/backend authorization must
   enforce the same restrictions server-side.
========================================================= */


/* =========================================================
   ROLES
========================================================= */

export const RESULT_ROLES =
  Object.freeze({
    ADMIN: "admin",
    TEACHER: "teacher",
    STUDENT: "student",
  });


/* =========================================================
   PERMISSIONS
========================================================= */

export const RESULT_PERMISSIONS =
  Object.freeze({
    VIEW_ANY_RESULT:
      "VIEW_ANY_RESULT",

    VIEW_ASSIGNED_RESULT:
      "VIEW_ASSIGNED_RESULT",

    VIEW_OWN_RESULT:
      "VIEW_OWN_RESULT",

    CREATE_RESULT:
      "CREATE_RESULT",

    EDIT_RESULT:
      "EDIT_RESULT",

    EDIT_DRAFT:
      "EDIT_DRAFT",

    EDIT_REJECTED:
      "EDIT_REJECTED",

    SAVE_DRAFT:
      "SAVE_DRAFT",

    SUBMIT_RESULT:
      "SUBMIT_RESULT",

    VERIFY_RESULT:
      "VERIFY_RESULT",

    REJECT_RESULT:
      "REJECT_RESULT",

    PUBLISH_RESULT:
      "PUBLISH_RESULT",

    UNPUBLISH_RESULT:
      "UNPUBLISH_RESULT",

    DELETE_RESULT:
      "DELETE_RESULT",

    DOWNLOAD_RESULT:
      "DOWNLOAD_RESULT",

    PRINT_RESULT:
      "PRINT_RESULT",

    VIEW_AUDIT:
      "VIEW_AUDIT",

    EXPORT_RESULTS:
      "EXPORT_RESULTS",

    MANAGE_RESULT_SETTINGS:
      "MANAGE_RESULT_SETTINGS",
  });


/* =========================================================
   ROLE PERMISSION MAP
========================================================= */

const ROLE_PERMISSION_MAP =
  Object.freeze({
    [RESULT_ROLES.ADMIN]: [
      RESULT_PERMISSIONS.VIEW_ANY_RESULT,

      RESULT_PERMISSIONS.VIEW_ASSIGNED_RESULT,

      RESULT_PERMISSIONS.VIEW_OWN_RESULT,

      RESULT_PERMISSIONS.CREATE_RESULT,

      RESULT_PERMISSIONS.EDIT_RESULT,

      RESULT_PERMISSIONS.EDIT_DRAFT,

      RESULT_PERMISSIONS.EDIT_REJECTED,

      RESULT_PERMISSIONS.SAVE_DRAFT,

      RESULT_PERMISSIONS.SUBMIT_RESULT,

      RESULT_PERMISSIONS.VERIFY_RESULT,

      RESULT_PERMISSIONS.REJECT_RESULT,

      RESULT_PERMISSIONS.PUBLISH_RESULT,

      RESULT_PERMISSIONS.UNPUBLISH_RESULT,

      RESULT_PERMISSIONS.DELETE_RESULT,

      RESULT_PERMISSIONS.DOWNLOAD_RESULT,

      RESULT_PERMISSIONS.PRINT_RESULT,

      RESULT_PERMISSIONS.VIEW_AUDIT,

      RESULT_PERMISSIONS.EXPORT_RESULTS,

      RESULT_PERMISSIONS.MANAGE_RESULT_SETTINGS,
    ],


    [RESULT_ROLES.TEACHER]: [
      RESULT_PERMISSIONS.VIEW_ASSIGNED_RESULT,

      RESULT_PERMISSIONS.CREATE_RESULT,

      RESULT_PERMISSIONS.EDIT_DRAFT,

      RESULT_PERMISSIONS.EDIT_REJECTED,

      RESULT_PERMISSIONS.SAVE_DRAFT,

      RESULT_PERMISSIONS.SUBMIT_RESULT,

      RESULT_PERMISSIONS.DOWNLOAD_RESULT,

      RESULT_PERMISSIONS.PRINT_RESULT,
    ],


    [RESULT_ROLES.STUDENT]: [
      RESULT_PERMISSIONS.VIEW_OWN_RESULT,

      RESULT_PERMISSIONS.DOWNLOAD_RESULT,

      RESULT_PERMISSIONS.PRINT_RESULT,
    ],
  });


/* =========================================================
   NORMALIZE ROLE
========================================================= */

export function normalizeResultRole(
  role
) {
  return String(
    role || ""
  )
    .trim()
    .toLowerCase();
}


/* =========================================================
   NORMALIZE PERMISSION
========================================================= */

export function normalizePermission(
  permission
) {
  return String(
    permission || ""
  )
    .trim()
    .toUpperCase()
    .replace(
      /[\s-]+/g,
      "_"
    );
}


/* =========================================================
   VALID ROLE
========================================================= */

export function isValidResultRole(
  role
) {
  return Object.values(
    RESULT_ROLES
  ).includes(
    normalizeResultRole(
      role
    )
  );
}


/* =========================================================
   ROLE HAS PERMISSION
========================================================= */

export function hasPermission(
  role,
  permission
) {
  const normalizedRole =
    normalizeResultRole(
      role
    );

  const normalizedPermission =
    normalizePermission(
      permission
    );


  return (
    ROLE_PERMISSION_MAP[
      normalizedRole
    ]?.includes(
      normalizedPermission
    ) || false
  );
}


/* =========================================================
   ANY PERMISSION
========================================================= */

export function hasAnyPermission(
  role,
  permissions = []
) {
  return permissions.some(
    (permission) =>
      hasPermission(
        role,
        permission
      )
  );
}


/* =========================================================
   ALL PERMISSIONS
========================================================= */

export function hasAllPermissions(
  role,
  permissions = []
) {
  return permissions.every(
    (permission) =>
      hasPermission(
        role,
        permission
      )
  );
}


/* =========================================================
   GET ROLE PERMISSIONS
========================================================= */

export function getRolePermissions(
  role
) {
  const normalizedRole =
    normalizeResultRole(
      role
    );


  return [
    ...(ROLE_PERMISSION_MAP[
      normalizedRole
    ] || []),
  ];
}


/* =========================================================
   STUDENT OWNERSHIP
========================================================= */

export function isStudentOwner({
  user,
  studentId,
  studentUid,
} = {}) {
  if (!user) {
    return false;
  }


  const userId =
    user.uid ||
    user.id ||
    user.userId;


  if (
    studentUid &&
    userId === studentUid
  ) {
    return true;
  }


  if (
    studentId &&
    (
      user.studentId ===
        studentId ||
      user.profileId ===
        studentId
    )
  ) {
    return true;
  }


  return false;
}


/* =========================================================
   TEACHER CLASS OWNERSHIP
========================================================= */

export function getTeacherAssignedClasses(
  teacher
) {
  if (!teacher) {
    return [];
  }


  const classes =
    teacher.assignedClasses ||
    teacher.assignedClassIds ||
    teacher.classes ||
    [];


  if (
    !Array.isArray(
      classes
    )
  ) {
    return [];
  }


  return classes
    .map(
      (item) => {
        if (
          typeof item ===
          "string"
        ) {
          return item;
        }


        return (
          item?.id ||
          item?.classId ||
          item?.className ||
          null
        );
      }
    )
    .filter(Boolean);
}


/* =========================================================
   NORMALIZE CLASS
========================================================= */

export function normalizeClassValue(
  value
) {
  return String(
    value || ""
  )
    .trim()
    .toLowerCase();
}


/* =========================================================
   TEACHER ASSIGNED CLASS CHECK
========================================================= */

export function isTeacherAssignedToClass({
  teacher,
  classId,
  className,
} = {}) {
  const assignedClasses =
    getTeacherAssignedClasses(
      teacher
    );


  if (
    !assignedClasses.length
  ) {
    return false;
  }


  const targets = [
    classId,
    className,
  ]
    .filter(Boolean)
    .map(
      normalizeClassValue
    );


  return assignedClasses.some(
    (assigned) =>
      targets.includes(
        normalizeClassValue(
          assigned
        )
      )
  );
}


/* =========================================================
   TEACHER RESULT ACCESS
========================================================= */

export function canTeacherAccessResult({
  teacher,
  result,
  student,
} = {}) {
  if (
    !teacher ||
    !result
  ) {
    return false;
  }


  const classId =
    result.classId ||
    student?.classId;


  const className =
    result.className ||
    student?.className ||
    student?.class;


  return isTeacherAssignedToClass({
    teacher,
    classId,
    className,
  });
}


/* =========================================================
   RESULT STATUS
========================================================= */

export function normalizeResultStatus(
  status
) {
  return String(
    status || ""
  )
    .trim()
    .toUpperCase()
    .replace(
      /[\s-]+/g,
      "_"
    );
}


/* =========================================================
   PUBLISHED CHECK
========================================================= */

export function isPublishedResult(
  result
) {
  return (
    normalizeResultStatus(
      result?.status
    ) === "PUBLISHED"
  );
}


/* =========================================================
   EDITABLE STATUS
========================================================= */

export function isEditableResult(
  result
) {
  const status =
    normalizeResultStatus(
      result?.status
    );


  return (
    status === "DRAFT" ||
    status === "REJECTED"
  );
}


/* =========================================================
   VERIFIED LOCK
========================================================= */

export function isVerifiedResult(
  result
) {
  return (
    normalizeResultStatus(
      result?.status
    ) === "VERIFIED"
  );
}


/* =========================================================
   PUBLISHED LOCK
========================================================= */

export function isLockedResult(
  result
) {
  const status =
    normalizeResultStatus(
      result?.status
    );


  return (
    status === "VERIFIED" ||
    status === "PUBLISHED"
  );
}


/* =========================================================
   ADMIN ACCESS
========================================================= */

export function canAdminAccessResult({
  role,
} = {}) {
  return (
    normalizeResultRole(
      role
    ) ===
    RESULT_ROLES.ADMIN
  );
}


/* =========================================================
   STUDENT RESULT VISIBILITY
========================================================= */

export function canStudentViewResult({
  user,
  result,
  studentId,
} = {}) {
  if (
    !isPublishedResult(
      result
    )
  ) {
    return false;
  }


  if (
    !isStudentOwner({
      user,
      studentId:
        result?.studentId ||
        studentId,
      studentUid:
        result?.studentUid,
    })
  ) {
    return false;
  }


  return hasPermission(
    RESULT_ROLES.STUDENT,
    RESULT_PERMISSIONS.VIEW_OWN_RESULT
  );
}


/* =========================================================
   VIEW RESULT
========================================================= */

export function canViewResult({
  role,
  user,
  result,
  student,
  teacher,
  studentId,
} = {}) {
  const normalizedRole =
    normalizeResultRole(
      role
    );


  /*
   * ADMIN
   */

  if (
    normalizedRole ===
    RESULT_ROLES.ADMIN
  ) {
    return hasPermission(
      normalizedRole,
      RESULT_PERMISSIONS
        .VIEW_ANY_RESULT
    );
  }


  /*
   * TEACHER
   */

  if (
    normalizedRole ===
    RESULT_ROLES.TEACHER
  ) {
    return (
      hasPermission(
        normalizedRole,
        RESULT_PERMISSIONS
          .VIEW_ASSIGNED_RESULT
      ) &&
      canTeacherAccessResult({
        teacher:
          teacher || user,

        result,

        student,
      })
    );
  }


  /*
   * STUDENT
   */

  if (
    normalizedRole ===
    RESULT_ROLES.STUDENT
  ) {
    return canStudentViewResult({
      user,

      result,

      studentId,
    });
  }


  return false;
}


/* =========================================================
   CREATE RESULT
========================================================= */

export function canCreateResult({
  role,
  teacher,
  student,
  classId,
  className,
} = {}) {
  const normalizedRole =
    normalizeResultRole(
      role
    );


  if (
    !hasPermission(
      normalizedRole,
      RESULT_PERMISSIONS
        .CREATE_RESULT
    )
  ) {
    return false;
  }


  /*
   * Admin can create
   * for anyone.
   */

  if (
    normalizedRole ===
    RESULT_ROLES.ADMIN
  ) {
    return true;
  }


  /*
   * Teacher can create
   * only for assigned class.
   */

  if (
    normalizedRole ===
    RESULT_ROLES.TEACHER
  ) {
    return isTeacherAssignedToClass({
      teacher,
      classId:
        classId ||
        student?.classId,

      className:
        className ||
        student?.className ||
        student?.class,
    });
  }


  return false;
}


/* =========================================================
   EDIT RESULT
========================================================= */

export function canEditResult({
  role,
  user,
  teacher,
  result,
  student,
} = {}) {
  const normalizedRole =
    normalizeResultRole(
      role
    );


  /*
   * Student can NEVER edit.
   */

  if (
    normalizedRole ===
    RESULT_ROLES.STUDENT
  ) {
    return false;
  }


  /*
   * Admin can edit,
   * except locked published/verified
   * result unless explicitly
   * handled by an admin workflow.
   */

  if (
    normalizedRole ===
    RESULT_ROLES.ADMIN
  ) {
    return (
      hasPermission(
        normalizedRole,
        RESULT_PERMISSIONS
          .EDIT_RESULT
      ) &&
      !isLockedResult(
        result
      )
    );
  }


  /*
   * Teacher
   */

  if (
    normalizedRole ===
    RESULT_ROLES.TEACHER
  ) {
    if (
      !canTeacherAccessResult({
        teacher:
          teacher || user,

        result,

        student,
      })
    ) {
      return false;
    }


    if (
      !isEditableResult(
        result
      )
    ) {
      return false;
    }


    return (
      hasPermission(
        normalizedRole,
        RESULT_PERMISSIONS
          .EDIT_DRAFT
      ) ||
      hasPermission(
        normalizedRole,
        RESULT_PERMISSIONS
          .EDIT_REJECTED
      )
    );
  }


  return false;
}


/* =========================================================
   SAVE DRAFT
========================================================= */

export function canSaveDraft({
  role,
  user,
  teacher,
  result,
  student,
} = {}) {
  if (
    !hasPermission(
      role,
      RESULT_PERMISSIONS
        .SAVE_DRAFT
    )
  ) {
    return false;
  }


  return canEditResult({
    role,
    user,
    teacher,
    result,
    student,
  });
}


/* =========================================================
   SUBMIT RESULT
========================================================= */

export function canSubmitResult({
  role,
  user,
  teacher,
  result,
  student,
  validation,
} = {}) {
  if (
    !hasPermission(
      role,
      RESULT_PERMISSIONS
        .SUBMIT_RESULT
    )
  ) {
    return false;
  }


  if (
    !canEditResult({
      role,
      user,
      teacher,
      result,
      student,
    })
  ) {
    return false;
  }


  /*
   * Final validation.
   */

  if (
    validation &&
    (
      !validation.valid ||
      !validation.completeness
        ?.complete
    )
  ) {
    return false;
  }


  return true;
}


/* =========================================================
   VERIFY RESULT
========================================================= */

export function canVerifyResult({
  role,
  result,
  validation,
} = {}) {
  if (
    normalizeResultRole(
      role
    ) !==
    RESULT_ROLES.ADMIN
  ) {
    return false;
  }


  if (
    !hasPermission(
      role,
      RESULT_PERMISSIONS
        .VERIFY_RESULT
    )
  ) {
    return false;
  }


  if (
    normalizeResultStatus(
      result?.status
    ) !== "SUBMITTED"
  ) {
    return false;
  }


  if (
    validation &&
    !validation.valid
  ) {
    return false;
  }


  return true;
}


/* =========================================================
   REJECT RESULT
========================================================= */

export function canRejectResult({
  role,
  result,
} = {}) {
  if (
    normalizeResultRole(
      role
    ) !==
    RESULT_ROLES.ADMIN
  ) {
    return false;
  }


  if (
    !hasPermission(
      role,
      RESULT_PERMISSIONS
        .REJECT_RESULT
    )
  ) {
    return false;
  }


  return (
    normalizeResultStatus(
      result?.status
    ) === "SUBMITTED"
  );
}


/* =========================================================
   PUBLISH RESULT
========================================================= */

export function canPublishResult({
  role,
  result,
  validation,
} = {}) {
  /*
   * ADMIN ONLY
   */

  if (
    normalizeResultRole(
      role
    ) !==
    RESULT_ROLES.ADMIN
  ) {
    return false;
  }


  if (
    !hasPermission(
      role,
      RESULT_PERMISSIONS
        .PUBLISH_RESULT
    )
  ) {
    return false;
  }


  /*
   * Must be verified.
   */

  if (
    normalizeResultStatus(
      result?.status
    ) !== "VERIFIED"
  ) {
    return false;
  }


  /*
   * Validation must pass.
   */

  if (
    validation &&
    !validation.valid
  ) {
    return false;
  }


  return true;
}


/* =========================================================
   UNPUBLISH RESULT
========================================================= */

export function canUnpublishResult({
  role,
  result,
} = {}) {
  if (
    normalizeResultRole(
      role
    ) !==
    RESULT_ROLES.ADMIN
  ) {
    return false;
  }


  if (
    !hasPermission(
      role,
      RESULT_PERMISSIONS
        .UNPUBLISH_RESULT
    )
  ) {
    return false;
  }


  return (
    normalizeResultStatus(
      result?.status
    ) === "PUBLISHED"
  );
}


/* =========================================================
   DELETE RESULT
========================================================= */

export function canDeleteResult({
  role,
  result,
} = {}) {
  if (
    normalizeResultRole(
      role
    ) !==
    RESULT_ROLES.ADMIN
  ) {
    return false;
  }


  if (
    !hasPermission(
      role,
      RESULT_PERMISSIONS
        .DELETE_RESULT
    )
  ) {
    return false;
  }


  /*
   * Published result should
   * not be casually deleted.
   */

  if (
    isPublishedResult(
      result
    )
  ) {
    return false;
  }


  return true;
}


/* =========================================================
   DOWNLOAD RESULT
========================================================= */

export function canDownloadResult({
  role,
  user,
  result,
  studentId,
} = {}) {
  const normalizedRole =
    normalizeResultRole(
      role
    );


  if (
    !hasPermission(
      normalizedRole,
      RESULT_PERMISSIONS
        .DOWNLOAD_RESULT
    )
  ) {
    return false;
  }


  /*
   * Admin
   */

  if (
    normalizedRole ===
    RESULT_ROLES.ADMIN
  ) {
    return true;
  }


  /*
   * Teacher
   *
   * Additional class restriction
   * should be checked by caller
   * where teacher profile is available.
   */

  if (
    normalizedRole ===
    RESULT_ROLES.TEACHER
  ) {
    return true;
  }


  /*
   * Student
   */

  if (
    normalizedRole ===
    RESULT_ROLES.STUDENT
  ) {
    return canStudentViewResult({
      user,
      result,
      studentId,
    });
  }


  return false;
}


/* =========================================================
   PRINT RESULT
========================================================= */

export function canPrintResult({
  role,
  user,
  result,
  studentId,
} = {}) {
  return canDownloadResult({
    role,
    user,
    result,
    studentId,
  });
}


/* =========================================================
   VIEW AUDIT
========================================================= */

export function canViewAudit(
  role
) {
  return hasPermission(
    role,
    RESULT_PERMISSIONS
      .VIEW_AUDIT
  );
}


/* =========================================================
   EXPORT RESULTS
========================================================= */

export function canExportResults(
  role
) {
  return hasPermission(
    role,
    RESULT_PERMISSIONS
      .EXPORT_RESULTS
  );
}


/* =========================================================
   MANAGE SETTINGS
========================================================= */

export function canManageResultSettings(
  role
) {
  return hasPermission(
    role,
    RESULT_PERMISSIONS
      .MANAGE_RESULT_SETTINGS
  );
}


/* =========================================================
   ACTION MATRIX
========================================================= */

export function getResultActionPermissions({
  role,
  user,
  teacher,
  result,
  student,
  validation,
  studentId,
} = {}) {
  return {
    view:
      canViewResult({
        role,
        user,
        result,
        student,
        teacher,
        studentId,
      }),

    create:
      canCreateResult({
        role,
        teacher,
        student,
      }),

    edit:
      canEditResult({
        role,
        user,
        teacher,
        result,
        student,
      }),

    saveDraft:
      canSaveDraft({
        role,
        user,
        teacher,
        result,
        student,
      }),

    submit:
      canSubmitResult({
        role,
        user,
        teacher,
        result,
        student,
        validation,
      }),

    verify:
      canVerifyResult({
        role,
        result,
        validation,
      }),

    reject:
      canRejectResult({
        role,
        result,
      }),

    publish:
      canPublishResult({
        role,
        result,
        validation,
      }),

    unpublish:
      canUnpublishResult({
        role,
        result,
      }),

    delete:
      canDeleteResult({
        role,
        result,
      }),

    download:
      canDownloadResult({
        role,
        user,
        result,
        studentId,
      }),

    print:
      canPrintResult({
        role,
        user,
        result,
        studentId,
      }),

    audit:
      canViewAudit(
        role
      ),

    export:
      canExportResults(
        role
      ),

    settings:
      canManageResultSettings(
        role
      ),
  };
}


/* =========================================================
   PERMISSION ERROR
========================================================= */

export function getPermissionError(
  role,
  permission
) {
  const normalizedRole =
    normalizeResultRole(
      role
    );

  const normalizedPermission =
    normalizePermission(
      permission
    );


  if (
    normalizedRole ===
    RESULT_ROLES.TEACHER
  ) {
    if (
      normalizedPermission ===
      RESULT_PERMISSIONS
        .VERIFY_RESULT
    ) {
      return "Teachers cannot verify results.";
    }


    if (
      normalizedPermission ===
      RESULT_PERMISSIONS
        .PUBLISH_RESULT
    ) {
      return "Teachers cannot publish results.";
    }


    if (
      normalizedPermission ===
      RESULT_PERMISSIONS
        .UNPUBLISH_RESULT
    ) {
      return "Teachers cannot unpublish results.";
    }
  }


  if (
    normalizedRole ===
    RESULT_ROLES.STUDENT
  ) {
    return "Students can only access their own published result.";
  }


  return "You do not have permission to perform this action.";
}


/* =========================================================
   GUARD RESULT ACCESS
========================================================= */

export function guardResultAccess({
  role,
  user,
  teacher,
  result,
  student,
  permission,
  studentId,
} = {}) {
  const normalizedRole =
    normalizeResultRole(
      role
    );


  /*
   * VIEW
   */

  if (
    permission ===
    RESULT_PERMISSIONS
      .VIEW_ANY_RESULT ||
    permission ===
    RESULT_PERMISSIONS
      .VIEW_ASSIGNED_RESULT ||
    permission ===
    RESULT_PERMISSIONS
      .VIEW_OWN_RESULT
  ) {
    const allowed =
      canViewResult({
        role:
          normalizedRole,

        user,
        teacher,
        result,
        student,
        studentId,
      });


    return {
      allowed,

      reason:
        allowed
          ? null
          : getPermissionError(
              normalizedRole,
              permission
            ),
    };
  }


  /*
   * General permission
   */

  const allowed =
    hasPermission(
      normalizedRole,
      permission
    );


  return {
    allowed,

    reason:
      allowed
        ? null
        : getPermissionError(
            normalizedRole,
            permission
          ),
  };
}


/* =========================================================
   ROLE CAPABILITIES
========================================================= */

export function getRoleCapabilities(
  role
) {
  const normalizedRole =
    normalizeResultRole(
      role
    );


  switch (
    normalizedRole
  ) {
    case RESULT_ROLES.ADMIN:
      return {
        role:
          normalizedRole,

        label:
          "Administrator",

        fullAccess:
          true,

        canManageAll:
          true,

        canVerify:
          true,

        canPublish:
          true,

        canUnpublish:
          true,

        canViewAudit:
          true,

        canExport:
          true,
      };


    case RESULT_ROLES.TEACHER:
      return {
        role:
          normalizedRole,

        label:
          "Teacher",

        fullAccess:
          false,

        canManageAll:
          false,

        canVerify:
          false,

        canPublish:
          false,

        canUnpublish:
          false,

        canViewAudit:
          false,

        canExport:
          false,

        scope:
          "Assigned classes only",
      };


    case RESULT_ROLES.STUDENT:
      return {
        role:
          normalizedRole,

        label:
          "Student",

        fullAccess:
          false,

        canManageAll:
          false,

        canVerify:
          false,

        canPublish:
          false,

        canUnpublish:
          false,

        canViewAudit:
          false,

        canExport:
          false,

        scope:
          "Own published result only",
      };


    default:
      return {
        role:
          normalizedRole,

        label:
          "Unknown",

        fullAccess:
          false,

        canManageAll:
          false,

        canVerify:
          false,

        canPublish:
          false,

        canUnpublish:
          false,

        canViewAudit:
          false,

        canExport:
          false,
      };
  }
}


/* =========================================================
   DEFAULT EXPORT
========================================================= */

export default {
  RESULT_ROLES,
  RESULT_PERMISSIONS,

  normalizeResultRole,
  normalizePermission,

  isValidResultRole,

  hasPermission,
  hasAnyPermission,
  hasAllPermissions,

  getRolePermissions,

  isStudentOwner,

  getTeacherAssignedClasses,
  normalizeClassValue,
  isTeacherAssignedToClass,
  canTeacherAccessResult,

  normalizeResultStatus,
  isPublishedResult,
  isEditableResult,
  isVerifiedResult,
  isLockedResult,

  canAdminAccessResult,
  canStudentViewResult,
  canViewResult,

  canCreateResult,
  canEditResult,
  canSaveDraft,
  canSubmitResult,

  canVerifyResult,
  canRejectResult,
  canPublishResult,
  canUnpublishResult,

  canDeleteResult,

  canDownloadResult,
  canPrintResult,

  canViewAudit,
  canExportResults,
  canManageResultSettings,

  getResultActionPermissions,

  getPermissionError,
  guardResultAccess,

  getRoleCapabilities,
};