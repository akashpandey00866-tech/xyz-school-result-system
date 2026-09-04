/* =========================================================
   FILE 22 — ADVANCED RESULT WORKFLOW ENGINE
   =========================================================

   RESULT LIFECYCLE

   DRAFT
      │
      │ Teacher/Admin Submit
      ▼
   SUBMITTED
      │
      ├───────────────┐
      │               │
      │ Admin Verify  │ Admin Reject
      ▼               ▼
   VERIFIED        REJECTED
      │               │
      │ Admin Publish │ Teacher edits
      ▼               │
   PUBLISHED          │
                      │
                      └──► DRAFT

   PUBLISHED
      │
      │ Admin Unpublish
      ▼
   VERIFIED


   SECURITY PRINCIPLE
   ------------------
   Teacher:
     ✓ Draft
     ✓ Edit assigned-class result
     ✓ Submit
     ✗ Verify
     ✗ Publish
     ✗ Unpublish

   Admin:
     ✓ Full workflow

   Student:
     ✓ Read own published result
     ✗ Any workflow action


   IMPORTANT
   ---------
   This file controls frontend workflow logic.

   Firestore Security Rules / backend authorization
   MUST enforce the same transitions server-side.
========================================================= */


/* =========================================================
   STATUS
========================================================= */

export const WORKFLOW_STATUS =
  Object.freeze({
    DRAFT:
      "DRAFT",

    SUBMITTED:
      "SUBMITTED",

    VERIFIED:
      "VERIFIED",

    REJECTED:
      "REJECTED",

    PUBLISHED:
      "PUBLISHED",
  });


/* =========================================================
   ROLES
========================================================= */

export const WORKFLOW_ROLES =
  Object.freeze({
    ADMIN:
      "admin",

    TEACHER:
      "teacher",

    STUDENT:
      "student",
  });


/* =========================================================
   ACTIONS
========================================================= */

export const WORKFLOW_ACTIONS =
  Object.freeze({
    CREATE:
      "CREATE",

    SAVE:
      "SAVE",

    SUBMIT:
      "SUBMIT",

    VERIFY:
      "VERIFY",

    REJECT:
      "REJECT",

    PUBLISH:
      "PUBLISH",

    UNPUBLISH:
      "UNPUBLISH",

    EDIT:
      "EDIT",

    RETURN_TO_DRAFT:
      "RETURN_TO_DRAFT",
  });


/* =========================================================
   NORMALIZATION
========================================================= */

export function normalizeStatus(
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


export function normalizeRole(
  role
) {
  return String(
    role || ""
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
   STATUS LABELS
========================================================= */

export const STATUS_LABELS =
  Object.freeze({
    [WORKFLOW_STATUS.DRAFT]:
      "Draft",

    [WORKFLOW_STATUS.SUBMITTED]:
      "Submitted for Verification",

    [WORKFLOW_STATUS.VERIFIED]:
      "Verified",

    [WORKFLOW_STATUS.REJECTED]:
      "Rejected",

    [WORKFLOW_STATUS.PUBLISHED]:
      "Published",
  });


/* =========================================================
   STATUS DESCRIPTIONS
========================================================= */

export const STATUS_DESCRIPTIONS =
  Object.freeze({
    [WORKFLOW_STATUS.DRAFT]:
      "Result is being prepared and can be edited.",

    [WORKFLOW_STATUS.SUBMITTED]:
      "Result has been submitted and is waiting for administrator verification.",

    [WORKFLOW_STATUS.VERIFIED]:
      "Administrator has verified the result.",

    [WORKFLOW_STATUS.REJECTED]:
      "Administrator rejected the result and provided feedback.",

    [WORKFLOW_STATUS.PUBLISHED]:
      "Result is officially published and visible to the student.",
  });


/* =========================================================
   ALLOWED TRANSITIONS
========================================================= */

export const WORKFLOW_TRANSITIONS =
  Object.freeze({
    [WORKFLOW_STATUS.DRAFT]:
      Object.freeze({
        [WORKFLOW_ACTIONS.SAVE]:
          WORKFLOW_STATUS.DRAFT,

        [WORKFLOW_ACTIONS.SUBMIT]:
          WORKFLOW_STATUS.SUBMITTED,

        [WORKFLOW_ACTIONS.EDIT]:
          WORKFLOW_STATUS.DRAFT,
      }),


    [WORKFLOW_STATUS.SUBMITTED]:
      Object.freeze({
        [WORKFLOW_ACTIONS.VERIFY]:
          WORKFLOW_STATUS.VERIFIED,

        [WORKFLOW_ACTIONS.REJECT]:
          WORKFLOW_STATUS.REJECTED,
      }),


    [WORKFLOW_STATUS.VERIFIED]:
      Object.freeze({
        [WORKFLOW_ACTIONS.PUBLISH]:
          WORKFLOW_STATUS.PUBLISHED,

        [WORKFLOW_ACTIONS.UNPUBLISH]:
          WORKFLOW_STATUS.VERIFIED,
      }),


    [WORKFLOW_STATUS.REJECTED]:
      Object.freeze({
        [WORKFLOW_ACTIONS.EDIT]:
          WORKFLOW_STATUS.DRAFT,

        [WORKFLOW_ACTIONS.RETURN_TO_DRAFT]:
          WORKFLOW_STATUS.DRAFT,
      }),


    [WORKFLOW_STATUS.PUBLISHED]:
      Object.freeze({
        [WORKFLOW_ACTIONS.UNPUBLISH]:
          WORKFLOW_STATUS.VERIFIED,
      }),
  });


/* =========================================================
   ROLE ACTION MATRIX
========================================================= */

export const ROLE_WORKFLOW_ACTIONS =
  Object.freeze({
    [WORKFLOW_ROLES.ADMIN]:
      Object.freeze([
        WORKFLOW_ACTIONS.CREATE,

        WORKFLOW_ACTIONS.SAVE,

        WORKFLOW_ACTIONS.SUBMIT,

        WORKFLOW_ACTIONS.VERIFY,

        WORKFLOW_ACTIONS.REJECT,

        WORKFLOW_ACTIONS.PUBLISH,

        WORKFLOW_ACTIONS.UNPUBLISH,

        WORKFLOW_ACTIONS.EDIT,

        WORKFLOW_ACTIONS.RETURN_TO_DRAFT,
      ]),


    [WORKFLOW_ROLES.TEACHER]:
      Object.freeze([
        WORKFLOW_ACTIONS.CREATE,

        WORKFLOW_ACTIONS.SAVE,

        WORKFLOW_ACTIONS.SUBMIT,

        WORKFLOW_ACTIONS.EDIT,

        WORKFLOW_ACTIONS.RETURN_TO_DRAFT,
      ]),


    [WORKFLOW_ROLES.STUDENT]:
      Object.freeze([]),
  });


/* =========================================================
   BASIC STATUS CHECK
========================================================= */

export function isValidStatus(
  status
) {
  return Object.values(
    WORKFLOW_STATUS
  ).includes(
    normalizeStatus(
      status
    )
  );
}


/* =========================================================
   TERMINAL STATUS
========================================================= */

export function isPublished(
  status
) {
  return (
    normalizeStatus(
      status
    ) ===
    WORKFLOW_STATUS.PUBLISHED
  );
}


export function isVerified(
  status
) {
  return (
    normalizeStatus(
      status
    ) ===
    WORKFLOW_STATUS.VERIFIED
  );
}


export function isSubmitted(
  status
) {
  return (
    normalizeStatus(
      status
    ) ===
    WORKFLOW_STATUS.SUBMITTED
  );
}


export function isRejected(
  status
) {
  return (
    normalizeStatus(
      status
    ) ===
    WORKFLOW_STATUS.REJECTED
  );
}


export function isDraft(
  status
) {
  return (
    normalizeStatus(
      status
    ) ===
    WORKFLOW_STATUS.DRAFT
  );
}


/* =========================================================
   CAN ROLE PERFORM ACTION
========================================================= */

export function canRolePerformAction(
  role,
  action
) {
  const normalizedRole =
    normalizeRole(
      role
    );

  const normalizedAction =
    normalizeAction(
      action
    );


  return (
    ROLE_WORKFLOW_ACTIONS[
      normalizedRole
    ]?.includes(
      normalizedAction
    ) || false
  );
}


/* =========================================================
   CAN TRANSITION
========================================================= */

export function canTransition({
  fromStatus,
  action,
  role,
} = {}) {
  const from =
    normalizeStatus(
      fromStatus
    );

  const normalizedAction =
    normalizeAction(
      action
    );


  /*
   * Invalid status.
   */

  if (
    !isValidStatus(
      from
    )
  ) {
    return {
      allowed:
        false,

      reason:
        "Current result status is invalid.",

      nextStatus:
        null,
    };
  }


  /*
   * Role permission.
   */

  if (
    !canRolePerformAction(
      role,
      normalizedAction
    )
  ) {
    return {
      allowed:
        false,

      reason:
        getWorkflowPermissionMessage(
          role,
          normalizedAction
        ),

      nextStatus:
        null,
    };
  }


  /*
   * Transition permission.
   */

  const nextStatus =
    WORKFLOW_TRANSITIONS[
      from
    ]?.[
      normalizedAction
    ];


  if (
    !nextStatus
  ) {
    return {
      allowed:
        false,

      reason:
        `Action ${normalizedAction} is not allowed from ${from}.`,

      nextStatus:
        null,
    };
  }


  return {
    allowed:
      true,

    reason:
      null,

    nextStatus,
  };
}


/* =========================================================
   GET NEXT STATUS
========================================================= */

export function getNextStatus({
  fromStatus,
  action,
} = {}) {
  const from =
    normalizeStatus(
      fromStatus
    );

  const normalizedAction =
    normalizeAction(
      action
    );


  return (
    WORKFLOW_TRANSITIONS[
      from
    ]?.[
      normalizedAction
    ] || null
  );
}


/* =========================================================
   GET AVAILABLE ACTIONS
========================================================= */

export function getAvailableActions({
  status,
  role,
} = {}) {
  const normalizedStatus =
    normalizeStatus(
      status
    );


  const roleActions =
    ROLE_WORKFLOW_ACTIONS[
      normalizeRole(
        role
      )
    ] || [];


  const transitionMap =
    WORKFLOW_TRANSITIONS[
      normalizedStatus
    ] || {};


  return roleActions.filter(
    (action) =>
      Boolean(
        transitionMap[
          action
        ]
      )
  );
}


/* =========================================================
   ACTION DETAILS
========================================================= */

export function getActionDetails({
  status,
  role,
} = {}) {
  const actions =
    getAvailableActions({
      status,
      role,
    });


  return actions.map(
    (action) => ({
      action,

      currentStatus:
        normalizeStatus(
          status
        ),

      nextStatus:
        getNextStatus({
          fromStatus:
            status,

          action,
        }),

      allowed:
        true,
    })
  );
}


/* =========================================================
   WORKFLOW PROGRESS
========================================================= */

export function getWorkflowProgress(
  status
) {
  const normalized =
    normalizeStatus(
      status
    );


  const sequence = [
    WORKFLOW_STATUS.DRAFT,

    WORKFLOW_STATUS.SUBMITTED,

    WORKFLOW_STATUS.VERIFIED,

    WORKFLOW_STATUS.PUBLISHED,
  ];


  /*
   * Rejected is a branch,
   * not a final lifecycle stage.
   */

  if (
    normalized ===
    WORKFLOW_STATUS.REJECTED
  ) {
    return {
      status:
        normalized,

      percentage:
        50,

      stage:
        "Correction Required",

      rejected:
        true,

      completed:
        false,
    };
  }


  const index =
    sequence.indexOf(
      normalized
    );


  if (
    index === -1
  ) {
    return {
      status:
        normalized,

      percentage:
        0,

      stage:
        "Unknown",

      rejected:
        false,

      completed:
        false,
    };
  }


  return {
    status:
      normalized,

    percentage:
      Math.round(
        (
          index /
          (
            sequence.length -
            1
          )
        ) *
          100
      ),

    stage:
      STATUS_LABELS[
        normalized
      ],

    rejected:
      false,

    completed:
      normalized ===
      WORKFLOW_STATUS.PUBLISHED,
  };
}


/* =========================================================
   WORKFLOW TIMELINE
========================================================= */

export function buildWorkflowTimeline({
  status,
  history = [],
} = {}) {
  const normalized =
    normalizeStatus(
      status
    );


  const timeline = [
    {
      status:
        WORKFLOW_STATUS.DRAFT,

      label:
        STATUS_LABELS[
          WORKFLOW_STATUS.DRAFT
        ],

      completed:
        true,
    },

    {
      status:
        WORKFLOW_STATUS.SUBMITTED,

      label:
        STATUS_LABELS[
          WORKFLOW_STATUS.SUBMITTED
        ],

      completed:
        [
          WORKFLOW_STATUS.SUBMITTED,
          WORKFLOW_STATUS.VERIFIED,
          WORKFLOW_STATUS.PUBLISHED,
        ].includes(
          normalized
        ),
    },

    {
      status:
        WORKFLOW_STATUS.VERIFIED,

      label:
        STATUS_LABELS[
          WORKFLOW_STATUS.VERIFIED
        ],

      completed:
        [
          WORKFLOW_STATUS.VERIFIED,
          WORKFLOW_STATUS.PUBLISHED,
        ].includes(
          normalized
        ),
    },

    {
      status:
        WORKFLOW_STATUS.PUBLISHED,

      label:
        STATUS_LABELS[
          WORKFLOW_STATUS.PUBLISHED
        ],

      completed:
        normalized ===
        WORKFLOW_STATUS.PUBLISHED,
    },
  ];


  /*
   * Add rejection branch.
   */

  if (
    normalized ===
    WORKFLOW_STATUS.REJECTED
  ) {
    timeline.splice(
      2,
      0,
      {
        status:
          WORKFLOW_STATUS.REJECTED,

        label:
          STATUS_LABELS[
            WORKFLOW_STATUS.REJECTED
          ],

        completed:
          true,

        branch:
          true,
      }
    );
  }


  /*
   * Attach recorded history.
   */

  if (
    Array.isArray(
      history
    )
  ) {
    return timeline.map(
      (item) => {
        const historyItem =
          history.find(
            (entry) =>
              normalizeStatus(
                entry?.status
              ) ===
              item.status
          );


        return {
          ...item,

          timestamp:
            historyItem?.timestamp ||
            null,

          actor:
            historyItem?.actor ||
            null,

          reason:
            historyItem?.reason ||
            "",
        };
      }
    );
  }


  return timeline;
}


/* =========================================================
   WORKFLOW VALIDATION
========================================================= */

export function validateWorkflow({
  currentStatus,
  requestedAction,
  role,
  result = {},
} = {}) {
  const transition =
    canTransition({
      fromStatus:
        currentStatus,

      action:
        requestedAction,

      role,
    });


  const errors = [];


  if (
    !transition.allowed
  ) {
    errors.push(
      transition.reason
    );
  }


  /*
   * Published results must
   * never be edited through
   * normal teacher workflow.
   */

  if (
    requestedAction ===
      WORKFLOW_ACTIONS.EDIT &&
    isPublished(
      currentStatus
    )
  ) {
    errors.push(
      "Published results are locked for normal editing."
    );
  }


  /*
   * Verify requires submitted.
   */

  if (
    requestedAction ===
      WORKFLOW_ACTIONS.VERIFY &&
    !isSubmitted(
      currentStatus
    )
  ) {
    errors.push(
      "Only submitted results can be verified."
    );
  }


  /*
   * Publish requires verified.
   */

  if (
    requestedAction ===
      WORKFLOW_ACTIONS.PUBLISH &&
    !isVerified(
      currentStatus
    )
  ) {
    errors.push(
      "Only verified results can be published."
    );
  }


  /*
   * Reject requires submitted.
   */

  if (
    requestedAction ===
      WORKFLOW_ACTIONS.REJECT &&
    !isSubmitted(
      currentStatus
    )
  ) {
    errors.push(
      "Only submitted results can be rejected."
    );
  }


  /*
   * Publish requires a valid result.
   */

  if (
    requestedAction ===
      WORKFLOW_ACTIONS.PUBLISH
  ) {
    if (
      result?.validation &&
      !result.validation.valid
    ) {
      errors.push(
        "Invalid result cannot be published."
      );
    }
  }


  return {
    valid:
      errors.length ===
      0,

    errors,

    transition,
  };
}


/* =========================================================
   WORKFLOW PERMISSION MESSAGE
========================================================= */

export function getWorkflowPermissionMessage(
  role,
  action
) {
  const normalizedRole =
    normalizeRole(
      role
    );

  const normalizedAction =
    normalizeAction(
      action
    );


  if (
    normalizedRole ===
    WORKFLOW_ROLES.TEACHER
  ) {
    if (
      normalizedAction ===
      WORKFLOW_ACTIONS.VERIFY
    ) {
      return "Teacher cannot verify results. Only Admin can verify results.";
    }


    if (
      normalizedAction ===
      WORKFLOW_ACTIONS.PUBLISH
    ) {
      return "Teacher cannot publish results. Only Admin can publish results.";
    }


    if (
      normalizedAction ===
      WORKFLOW_ACTIONS.UNPUBLISH
    ) {
      return "Teacher cannot unpublish results.";
    }


    if (
      normalizedAction ===
      WORKFLOW_ACTIONS.REJECT
    ) {
      return "Teacher cannot reject results.";
    }
  }


  if (
    normalizedRole ===
    WORKFLOW_ROLES.STUDENT
  ) {
    return "Students cannot modify the result workflow.";
  }


  return "You do not have permission for this workflow action.";
}


/* =========================================================
   STATUS COLOR / UI META
========================================================= */

export function getStatusMeta(
  status
) {
  const normalized =
    normalizeStatus(
      status
    );


  const metadata = {
    [WORKFLOW_STATUS.DRAFT]: {
      label:
        "Draft",

      tone:
        "neutral",

      icon:
        "edit",

      description:
        "Result is being prepared.",
    },

    [WORKFLOW_STATUS.SUBMITTED]: {
      label:
        "Submitted",

      tone:
        "warning",

      icon:
        "clock",

      description:
        "Waiting for Admin verification.",
    },

    [WORKFLOW_STATUS.VERIFIED]: {
      label:
        "Verified",

      tone:
        "info",

      icon:
        "shield-check",

      description:
        "Verified by Admin and ready for publication.",
    },

    [WORKFLOW_STATUS.REJECTED]: {
      label:
        "Rejected",

      tone:
        "danger",

      icon:
        "alert",

      description:
        "Correction is required before resubmission.",
    },

    [WORKFLOW_STATUS.PUBLISHED]: {
      label:
        "Published",

      tone:
        "success",

      icon:
        "check-circle",

      description:
        "Official result visible to the student.",
    },
  };


  return (
    metadata[
      normalized
    ] || {
      label:
        "Unknown",

      tone:
        "neutral",

      icon:
        "help",

      description:
        "Unknown workflow status.",
    }
  );
}


/* =========================================================
   CAN EDIT RESULT
========================================================= */

export function canEditWorkflowResult({
  role,
  status,
} = {}) {
  const normalizedRole =
    normalizeRole(
      role
    );

  const normalizedStatus =
    normalizeStatus(
      status
    );


  /*
   * Student never edits.
   */

  if (
    normalizedRole ===
    WORKFLOW_ROLES.STUDENT
  ) {
    return false;
  }


  /*
   * Admin can edit only
   * before verification.
   */

  if (
    normalizedRole ===
    WORKFLOW_ROLES.ADMIN
  ) {
    return (
      normalizedStatus ===
        WORKFLOW_STATUS.DRAFT ||
      normalizedStatus ===
        WORKFLOW_STATUS.REJECTED
    );
  }


  /*
   * Teacher can edit
   * draft/rejected only.
   */

  if (
    normalizedRole ===
    WORKFLOW_ROLES.TEACHER
  ) {
    return (
      normalizedStatus ===
        WORKFLOW_STATUS.DRAFT ||
      normalizedStatus ===
        WORKFLOW_STATUS.REJECTED
    );
  }


  return false;
}


/* =========================================================
   CAN VIEW RESULT
========================================================= */

export function canViewWorkflowResult({
  role,
  status,
  isOwner = false,
} = {}) {
  const normalizedRole =
    normalizeRole(
      role
    );

  const normalizedStatus =
    normalizeStatus(
      status
    );


  /*
   * Admin can view all.
   */

  if (
    normalizedRole ===
    WORKFLOW_ROLES.ADMIN
  ) {
    return true;
  }


  /*
   * Teacher workflow visibility.
   *
   * Actual class ownership should
   * be checked separately.
   */

  if (
    normalizedRole ===
    WORKFLOW_ROLES.TEACHER
  ) {
    return true;
  }


  /*
   * Student:
   * own published only.
   */

  if (
    normalizedRole ===
    WORKFLOW_ROLES.STUDENT
  ) {
    return (
      isOwner &&
      normalizedStatus ===
        WORKFLOW_STATUS.PUBLISHED
    );
  }


  return false;
}


/* =========================================================
   NEXT ACTION FOR ROLE
========================================================= */

export function getRecommendedNextAction({
  status,
  role,
} = {}) {
  const normalizedStatus =
    normalizeStatus(
      status
    );

  const normalizedRole =
    normalizeRole(
      role
    );


  if (
    normalizedRole ===
    WORKFLOW_ROLES.STUDENT
  ) {
    return null;
  }


  if (
    normalizedStatus ===
    WORKFLOW_STATUS.DRAFT
  ) {
    if (
      normalizedRole ===
      WORKFLOW_ROLES.TEACHER
    ) {
      return {
        action:
          WORKFLOW_ACTIONS.SUBMIT,

        label:
          "Submit for Verification",
      };
    }


    if (
      normalizedRole ===
      WORKFLOW_ROLES.ADMIN
    ) {
      return {
        action:
          WORKFLOW_ACTIONS.SUBMIT,

        label:
          "Submit",
      };
    }
  }


  if (
    normalizedStatus ===
    WORKFLOW_STATUS.SUBMITTED &&
    normalizedRole ===
      WORKFLOW_ROLES.ADMIN
  ) {
    return {
      action:
        WORKFLOW_ACTIONS.VERIFY,

      label:
        "Verify Result",
    };
  }


  if (
    normalizedStatus ===
    WORKFLOW_STATUS.VERIFIED &&
    normalizedRole ===
      WORKFLOW_ROLES.ADMIN
  ) {
    return {
      action:
        WORKFLOW_ACTIONS.PUBLISH,

      label:
        "Publish Result",
    };
  }


  if (
    normalizedStatus ===
    WORKFLOW_STATUS.REJECTED
  ) {
    return {
      action:
        WORKFLOW_ACTIONS.EDIT,

      label:
        "Correct Result",
    };
  }


  return null;
}


/* =========================================================
   WORKFLOW STATE OBJECT
========================================================= */

export function getWorkflowState({
  status,
  role,
  result = {},
} = {}) {
  const normalizedStatus =
    normalizeStatus(
      status
    );


  const availableActions =
    getAvailableActions({
      status:
        normalizedStatus,

      role,
    });


  const progress =
    getWorkflowProgress(
      normalizedStatus
    );


  const statusMeta =
    getStatusMeta(
      normalizedStatus
    );


  return {
    status:
      normalizedStatus,

    role:
      normalizeRole(
        role
      ),

    label:
      statusMeta.label,

    description:
      statusMeta.description,

    tone:
      statusMeta.tone,

    icon:
      statusMeta.icon,

    progress,

    availableActions,

    nextAction:
      getRecommendedNextAction({
        status:
          normalizedStatus,

        role,
      }),

    editable:
      canEditWorkflowResult({
        role,

        status:
          normalizedStatus,
      }),

    published:
      isPublished(
        normalizedStatus
      ),

    verified:
      isVerified(
        normalizedStatus
      ),

    submitted:
      isSubmitted(
        normalizedStatus
      ),

    rejected:
      isRejected(
        normalizedStatus
      ),

    draft:
      isDraft(
        normalizedStatus
      ),

    resultId:
      result?.id ||
      null,
  };
}


/* =========================================================
   TRANSITION RECORD
========================================================= */

export function createTransitionRecord({
  fromStatus,
  toStatus,
  action,
  actor,
  reason = "",
  metadata = {},
} = {}) {
  return {
    fromStatus:
      normalizeStatus(
        fromStatus
      ),

    toStatus:
      normalizeStatus(
        toStatus
      ),

    action:
      normalizeAction(
        action
      ),

    actor: {
      uid:
        actor?.uid ||
        actor?.id ||
        null,

      email:
        actor?.email ||
        null,

      role:
        normalizeRole(
          actor?.role
        ),
    },

    reason:
      String(
        reason || ""
      ).trim(),

    metadata,

    timestamp:
      new Date().toISOString(),
  };
}


/* =========================================================
   VERIFY TRANSITION
========================================================= */

export function validateTransitionRequest({
  currentStatus,
  action,
  role,
  reason = "",
} = {}) {
  const result =
    canTransition({
      fromStatus:
        currentStatus,

      action,

      role,
    });


  if (
    !result.allowed
  ) {
    return {
      valid:
        false,

      errors: [
        result.reason,
      ],

      nextStatus:
        null,
    };
  }


  /*
   * Rejection requires
   * a meaningful reason.
   */

  if (
    normalizeAction(
      action
    ) ===
      WORKFLOW_ACTIONS.REJECT &&
    String(
      reason || ""
    ).trim().length <
      3
  ) {
    return {
      valid:
        false,

      errors: [
        "A rejection reason is required.",
      ],

      nextStatus:
        null,
    };
  }


  return {
    valid:
      true,

    errors: [],

    nextStatus:
      result.nextStatus,
  };
}


/* =========================================================
   WORKFLOW CONFIG
========================================================= */

export function getWorkflowConfiguration() {
  return {
    statuses:
      Object.values(
        WORKFLOW_STATUS
      ),

    actions:
      Object.values(
        WORKFLOW_ACTIONS
      ),

    roles:
      Object.values(
        WORKFLOW_ROLES
      ),

    transitions:
      WORKFLOW_TRANSITIONS,

    roleActions:
      ROLE_WORKFLOW_ACTIONS,

    studentCanModify:
      false,

    teacherCanVerify:
      false,

    teacherCanPublish:
      false,

    adminCanVerify:
      true,

    adminCanPublish:
      true,
  };
}


/* =========================================================
   DEFAULT EXPORT
========================================================= */

export default {
  WORKFLOW_STATUS,
  WORKFLOW_ROLES,
  WORKFLOW_ACTIONS,

  STATUS_LABELS,
  STATUS_DESCRIPTIONS,

  WORKFLOW_TRANSITIONS,
  ROLE_WORKFLOW_ACTIONS,

  normalizeStatus,
  normalizeRole,
  normalizeAction,

  isValidStatus,

  isPublished,
  isVerified,
  isSubmitted,
  isRejected,
  isDraft,

  canRolePerformAction,
  canTransition,

  getNextStatus,
  getAvailableActions,
  getActionDetails,

  getWorkflowProgress,
  buildWorkflowTimeline,

  validateWorkflow,
  validateTransitionRequest,

  getWorkflowPermissionMessage,
  getStatusMeta,

  canEditWorkflowResult,
  canViewWorkflowResult,

  getRecommendedNextAction,
  getWorkflowState,

  createTransitionRecord,

  getWorkflowConfiguration,
};