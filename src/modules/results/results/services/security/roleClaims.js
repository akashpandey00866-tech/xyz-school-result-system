import {
  getIdTokenResult,
} from "firebase/auth";


/* =========================================================
   ROLE CONSTANTS
========================================================= */

export const USER_ROLES = Object.freeze({
  ADMIN: "admin",
  TEACHER: "teacher",
  STUDENT: "student",
});


/* =========================================================
   NORMALIZE ROLE
========================================================= */

export function normalizeRole(
  role
) {
  const normalized =
    String(
      role || ""
    )
      .trim()
      .toLowerCase();


  if (
    normalized ===
    USER_ROLES.ADMIN
  ) {
    return USER_ROLES.ADMIN;
  }


  if (
    normalized ===
    USER_ROLES.TEACHER
  ) {
    return USER_ROLES.TEACHER;
  }


  if (
    normalized ===
    USER_ROLES.STUDENT
  ) {
    return USER_ROLES.STUDENT;
  }


  return null;
}


/* =========================================================
   READ CUSTOM CLAIMS
========================================================= */

export async function getRoleClaims(
  user,
  forceRefresh = false
) {
  if (!user) {
    return {
      role: null,
      claims: {},
    };
  }


  const tokenResult =
    await getIdTokenResult(
      user,
      forceRefresh
    );


  const claims =
    tokenResult?.claims ||
    {};


  return {
    role:
      normalizeRole(
        claims.role
      ),

    claims,

    tokenIssuedAt:
      tokenResult?.issuedAtTime ||
      null,

    tokenExpiration:
      tokenResult?.expirationTime ||
      null,
  };
}


/* =========================================================
   FORCE REFRESH ROLE
========================================================= */

export async function refreshRoleClaims(
  user
) {
  return getRoleClaims(
    user,
    true
  );
}


/* =========================================================
   ROLE CHECKS
========================================================= */

export function hasRole(
  role,
  expectedRole
) {
  return (
    normalizeRole(
      role
    ) ===
    normalizeRole(
      expectedRole
    )
  );
}


export function isAdminRole(
  role
) {
  return hasRole(
    role,
    USER_ROLES.ADMIN
  );
}


export function isTeacherRole(
  role
) {
  return hasRole(
    role,
    USER_ROLES.TEACHER
  );
}


export function isStudentRole(
  role
) {
  return hasRole(
    role,
    USER_ROLES.STUDENT
  );
}


/* =========================================================
   VALIDATE ROLE
========================================================= */

export function assertValidRole(
  role
) {
  const normalized =
    normalizeRole(
      role
    );


  if (!normalized) {
    const error =
      new Error(
        "Invalid or missing account role."
      );

    error.code =
      "INVALID_ACCOUNT_ROLE";

    throw error;
  }


  return normalized;
}


/* =========================================================
   BUILD SAFE ACTOR
========================================================= */

export function buildActor(
  user,
  role,
  extra = {}
) {
  const safeRole =
    assertValidRole(
      role
    );


  if (!user?.uid) {
    const error =
      new Error(
        "Authenticated user is required."
      );

    error.code =
      "AUTH_REQUIRED";

    throw error;
  }


  return {
    uid:
      user.uid,

    role:
      safeRole,

    email:
      user.email ||
      null,

    displayName:
      user.displayName ||
      null,

    ...extra,
  };
}


/* =========================================================
   CLAIM ROLE + FIRESTORE PROFILE ROLE
   CONSISTENCY CHECK
========================================================= */

export function verifyRoleConsistency({
  claimRole,
  profileRole,
}) {
  const normalizedClaim =
    normalizeRole(
      claimRole
    );

  const normalizedProfile =
    normalizeRole(
      profileRole
    );


  /*
   * No valid claim = never trust
   * the Firestore profile role alone.
   */

  if (
    !normalizedClaim
  ) {
    return {
      valid: false,

      reason:
        "Missing custom role claim.",
    };
  }


  /*
   * If profile role exists,
   * both sources must agree.
   */

  if (
    normalizedProfile &&
    normalizedClaim !==
      normalizedProfile
  ) {
    return {
      valid: false,

      reason:
        "Role claim and profile role do not match.",
    };
  }


  return {
    valid: true,

    role:
      normalizedClaim,

    reason: null,
  };
}