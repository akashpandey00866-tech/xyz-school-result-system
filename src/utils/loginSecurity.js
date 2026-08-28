/* ==========================================================
   XYZ SCHOOL ERP — LOGIN SECURITY POLICY
   ----------------------------------------------------------
   STUDENT:
   6 failed attempts → 7 hour lock

   ADMIN / PRINCIPAL / ACCOUNTANT / STAFF:
   4 failed attempts → 24 hour lock

   TEACHER:
   6 failed attempts → 7 hour lock

   NOTE:
   This is a frontend/browser guard only.
   Production security should ALSO enforce rate limiting
   on a trusted backend / Firebase Cloud Function.
========================================================== */

export const LOGIN_POLICIES = {
  student: {
    maxAttempts: 6,
    lockMs: 7 * 60 * 60 * 1000,
  },

  admin: {
    maxAttempts: 4,
    lockMs: 24 * 60 * 60 * 1000,
  },

  principal: {
    maxAttempts: 4,
    lockMs: 24 * 60 * 60 * 1000,
  },

  accountant: {
    maxAttempts: 4,
    lockMs: 24 * 60 * 60 * 1000,
  },

  staff: {
    maxAttempts: 4,
    lockMs: 24 * 60 * 60 * 1000,
  },

  teacher: {
    maxAttempts: 6,
    lockMs: 7 * 60 * 60 * 1000,
  },
};

export const GENERIC_POLICY = LOGIN_POLICIES.student;

/* ==========================================================
   NORMALIZATION
========================================================== */

function normalizeRole(role) {
  return String(role ?? "")
    .trim()
    .toLowerCase();
}

function normalizeIdentifier(identifier) {
  return String(identifier ?? "")
    .trim()
    .toLowerCase();
}

/* ==========================================================
   STORAGE KEY
========================================================== */

function storageKey(role, identifier) {
  const safeRole =
    normalizeRole(role) || "student";

  const safeIdentifier =
    normalizeIdentifier(identifier);

  return `xyz_erp_login_security_v5:${safeRole}:${safeIdentifier}`;
}

/* ==========================================================
   DEFAULT STATE
========================================================== */

export function emptyLockState() {
  return {
    attempts: 0,
    lockedUntil: 0,
  };
}

/* ==========================================================
   READ LOCK STATE
========================================================== */

export function readLockState(
  role,
  identifier
) {
  const key = storageKey(
    role,
    identifier
  );

  try {
    const raw =
      localStorage.getItem(key);

    if (!raw) {
      return emptyLockState();
    }

    const parsed =
      JSON.parse(raw);

    const attempts = Math.max(
      0,
      Number(parsed?.attempts) || 0
    );

    const lockedUntil = Math.max(
      0,
      Number(parsed?.lockedUntil) || 0
    );

    const state = {
      attempts,
      lockedUntil,
    };

    /*
      Automatically clear an expired lock.
    */
    if (
      lockedUntil > 0 &&
      Date.now() >= lockedUntil
    ) {
      localStorage.removeItem(key);

      return emptyLockState();
    }

    return state;
  } catch (error) {
    console.error(
      "Login security state read failed:",
      error
    );

    localStorage.removeItem(key);

    return emptyLockState();
  }
}

/* ==========================================================
   WRITE LOCK STATE
========================================================== */

export function writeLockState(
  role,
  identifier,
  state
) {
  const key = storageKey(
    role,
    identifier
  );

  const safeState = {
    attempts: Math.max(
      0,
      Number(state?.attempts) || 0
    ),

    lockedUntil: Math.max(
      0,
      Number(state?.lockedUntil) || 0
    ),
  };

  try {
    localStorage.setItem(
      key,
      JSON.stringify(safeState)
    );

    return safeState;
  } catch (error) {
    console.error(
      "Login security state write failed:",
      error
    );

    return safeState;
  }
}

/* ==========================================================
   CLEAR LOCK STATE
========================================================== */

export function clearLockState(
  role,
  identifier
) {
  try {
    localStorage.removeItem(
      storageKey(
        role,
        identifier
      )
    );
  } catch (error) {
    console.error(
      "Login security state clear failed:",
      error
    );
  }
}

/* ==========================================================
   GET POLICY
========================================================== */

export function policyForRole(role) {
  const normalized =
    normalizeRole(role);

  return (
    LOGIN_POLICIES[normalized] ||
    GENERIC_POLICY
  );
}

/* ==========================================================
   REGISTER FAILED LOGIN
========================================================== */

export function registerFailure(
  role,
  identifier
) {
  const normalizedRole =
    normalizeRole(role) || "student";

  const policy =
    policyForRole(
      normalizedRole
    );

  const current =
    readLockState(
      normalizedRole,
      identifier
    );

  /*
    Do not keep increasing attempts
    while account is already locked.
  */
  if (
    current.lockedUntil &&
    current.lockedUntil > Date.now()
  ) {
    return current;
  }

  const attempts =
    current.attempts + 1;

  const shouldLock =
    attempts >=
    policy.maxAttempts;

  const lockedUntil =
    shouldLock
      ? Date.now() + policy.lockMs
      : 0;

  const nextState = {
    attempts,
    lockedUntil,
  };

  writeLockState(
    normalizedRole,
    identifier,
    nextState
  );

  return nextState;
}

/* ==========================================================
   CHECK LOCK
========================================================== */

export function isLocked(
  role,
  identifier
) {
  const state =
    readLockState(
      role,
      identifier
    );

  return (
    state.lockedUntil >
    Date.now()
  );
}

/* ==========================================================
   REMAINING LOCK TIME
========================================================== */

export function remainingMs(
  role,
  identifier
) {
  const state =
    readLockState(
      role,
      identifier
    );

  return Math.max(
    0,
    state.lockedUntil -
      Date.now()
  );
}

/* ==========================================================
   REMAINING ATTEMPTS
========================================================== */

export function remainingAttempts(
  role,
  identifier
) {
  const policy =
    policyForRole(role);

  const state =
    readLockState(
      role,
      identifier
    );

  return Math.max(
    0,
    policy.maxAttempts -
      state.attempts
  );
}

/* ==========================================================
   CURRENT ATTEMPTS
========================================================== */

export function currentAttempts(
  role,
  identifier
) {
  const state =
    readLockState(
      role,
      identifier
    );

  return state.attempts;
}

/* ==========================================================
   LOCK END DATE
========================================================== */

export function lockEndDate(
  role,
  identifier
) {
  const state =
    readLockState(
      role,
      identifier
    );

  if (
    !state.lockedUntil ||
    state.lockedUntil <= Date.now()
  ) {
    return null;
  }

  return new Date(
    state.lockedUntil
  );
}

/* ==========================================================
   FORMAT REMAINING TIME
========================================================== */

export function formatRemaining(
  milliseconds
) {
  let totalSeconds =
    Math.ceil(
      Math.max(
        0,
        Number(milliseconds) || 0
      ) / 1000
    );

  const days =
    Math.floor(
      totalSeconds / 86400
    );

  totalSeconds %= 86400;

  const hours =
    Math.floor(
      totalSeconds / 3600
    );

  totalSeconds %= 3600;

  const minutes =
    Math.floor(
      totalSeconds / 60
    );

  const seconds =
    totalSeconds % 60;

  const paddedHours =
    String(hours).padStart(
      2,
      "0"
    );

  const paddedMinutes =
    String(minutes).padStart(
      2,
      "0"
    );

  const paddedSeconds =
    String(seconds).padStart(
      2,
      "0"
    );

  if (days > 0) {
    return `${days}d ${paddedHours}h ${paddedMinutes}m`;
  }

  return `${paddedHours}h ${paddedMinutes}m ${paddedSeconds}s`;
}

/* ==========================================================
   POLICY LABEL
========================================================== */

export function policyLabel(role) {
  const policy =
    policyForRole(role);

  const hours =
    Math.round(
      policy.lockMs /
        (60 * 60 * 1000)
    );

  return `${policy.maxAttempts} failed attempts / ${hours} hour lock`;
}

/* ==========================================================
   POLICY DETAILS
========================================================== */

export function policyDetails(role) {
  const policy =
    policyForRole(role);

  const hours =
    Math.round(
      policy.lockMs /
        (60 * 60 * 1000)
    );

  return {
    maxAttempts:
      policy.maxAttempts,

    lockMs:
      policy.lockMs,

    lockHours:
      hours,

    label:
      `${policy.maxAttempts} failed attempts / ${hours} hour lock`,
  };
}

/* ==========================================================
   LOCK MESSAGE
========================================================== */

export function lockMessage(
  role,
  identifier
) {
  const policy =
    policyForRole(role);

  const remaining =
    remainingMs(
      role,
      identifier
    );

  if (remaining <= 0) {
    return "";
  }

  const time =
    formatRemaining(
      remaining
    );

  return `Login is temporarily locked. Please try again after ${time}. Maximum ${policy.maxAttempts} failed attempts are allowed.`;
}

/* ==========================================================
   ATTEMPT STATUS
========================================================== */

export function getAttemptStatus(
  role,
  identifier
) {
  const policy =
    policyForRole(role);

  const state =
    readLockState(
      role,
      identifier
    );

  const locked =
    state.lockedUntil >
    Date.now();

  return {
    role:
      normalizeRole(role),

    attempts:
      state.attempts,

    maxAttempts:
      policy.maxAttempts,

    remainingAttempts:
      Math.max(
        0,
        policy.maxAttempts -
          state.attempts
      ),

    locked,

    lockedUntil:
      state.lockedUntil,

    remainingMs:
      locked
        ? Math.max(
            0,
            state.lockedUntil -
              Date.now()
          )
        : 0,

    remainingTime:
      locked
        ? formatRemaining(
            state.lockedUntil -
              Date.now()
          )
        : "00h 00m 00s",
  };
}

/* ==========================================================
   ROLE HELPERS
========================================================== */

export function isAdminRole(
  role
) {
  return (
    normalizeRole(role) ===
      "admin" ||
    normalizeRole(role) ===
      "principal" ||
    normalizeRole(role) ===
      "accountant" ||
    normalizeRole(role) ===
      "staff"
  );
}

export function isStudentRole(
  role
) {
  return (
    normalizeRole(role) ===
    "student"
  );
}

export function isTeacherRole(
  role
) {
  return (
    normalizeRole(role) ===
    "teacher"
  );
}

/* ==========================================================
   USER-FRIENDLY LOCK SUMMARY
========================================================== */

export function securitySummary(
  role
) {
  const normalized =
    normalizeRole(role);

  if (
    isAdminRole(normalized)
  ) {
    return {
      title:
        "Administrator Security",

      attempts:
        "4 failed attempts",

      lock:
        "24 hour temporary lock",

      message:
        "For administrator-level accounts, four consecutive failed login attempts trigger a 24-hour lock.",
    };
  }

  if (
    isTeacherRole(normalized)
  ) {
    return {
      title:
        "Teacher Security",

      attempts:
        "6 failed attempts",

      lock:
        "7 hour temporary lock",

      message:
        "For teacher accounts, six consecutive failed login attempts trigger a 7-hour lock.",
    };
  }

  return {
    title:
      "Student Security",

    attempts:
      "6 failed attempts",

    lock:
      "7 hour temporary lock",

    message:
      "For student accounts, six consecutive failed login attempts trigger a 7-hour lock.",
  };
}

/* ==========================================================
   SAFE ATTEMPT CHECK BEFORE LOGIN
========================================================== */

export function canAttemptLogin(
  role,
  identifier
) {
  const state =
    readLockState(
      role,
      identifier
    );

  return {
    allowed:
      state.lockedUntil <=
      Date.now(),

    locked:
      state.lockedUntil >
      Date.now(),

    attempts:
      state.attempts,

    remainingAttempts:
      remainingAttempts(
        role,
        identifier
      ),

    remainingMs:
      remainingMs(
        role,
        identifier
      ),

    remainingTime:
      formatRemaining(
        remainingMs(
          role,
          identifier
        )
      ),
  };
}

/* ==========================================================
   RESET AFTER SUCCESSFUL LOGIN
========================================================== */

export function registerSuccess(
  role,
  identifier
) {
  clearLockState(
    role,
    identifier
  );

  return emptyLockState();
}

/* ==========================================================
   CLEAN EXPIRED LOCK
========================================================== */

export function cleanupExpiredLock(
  role,
  identifier
) {
  const state =
    readLockState(
      role,
      identifier
    );

  if (
    state.lockedUntil > 0 &&
    state.lockedUntil <= Date.now()
  ) {
    clearLockState(
      role,
      identifier
    );

    return emptyLockState();
  }

  return state;
}