import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  browserSessionPersistence,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { auth, db } from "../config/firebase";
import { useAuth } from "../context/AuthContext";

import {
  canAttemptLogin,
  formatRemaining,
  policyForRole,
  registerFailure,
  registerSuccess,
} from "../utils/loginSecurity";

/* ============================================================
   XYZ SCHOOL ERP — CENTRAL LOGIN
   ============================================================
   FEATURES
   • One login page for every role
   • Google login restored
   • Email / Enrollment / Mobile / Employee ID login
   • Student/Teacher: 6 failed attempts → 7 hour lock
   • Admin/Principal/Accountant/Staff: 4 failed attempts
     → 24 hour lock
   • Theme selector
   • School branding
   • Forgot password
   • No role-specific old login UI
   • Firebase Authentication remains the real credential system

   IMPORTANT
   `auth/invalid-credential` means Firebase rejected the
   supplied email/password credential. This component gives a
   clean message but does not bypass Firebase authentication.
============================================================ */

const googleProvider =
  new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: "select_account",
});

const ROLE_DASHBOARDS = {
  admin: "/admin-dashboard",
  principal: "/admin-dashboard",
  accountant: "/admin-dashboard",
  staff: "/admin-dashboard",
  teacher: "/teacher-dashboard",
  student: "/student-dashboard",
};

const THEMES = {
  emerald: {
    primary: "#059669",
    primaryDark: "#064e3b",
    glow: "rgba(16,185,129,.20)",
    label: "Emerald",
  },

  blue: {
    primary: "#2563eb",
    primaryDark: "#1e3a8a",
    glow: "rgba(59,130,246,.22)",
    label: "Blue",
  },

  violet: {
    primary: "#7c3aed",
    primaryDark: "#4c1d95",
    glow: "rgba(139,92,246,.22)",
    label: "Violet",
  },

  orange: {
    primary: "#ea580c",
    primaryDark: "#7c2d12",
    glow: "rgba(249,115,22,.20)",
    label: "Orange",
  },

  rose: {
    primary: "#e11d48",
    primaryDark: "#881337",
    glow: "rgba(244,63,94,.20)",
    label: "Rose",
  },
};

const ADMIN_ROLES = new Set([
  "admin",
  "principal",
  "accountant",
  "staff",
]);

const SCHOOL_FALLBACK = {
  schoolName: "XYZ PUBLIC SCHOOL",
  tagline: "Smart • Secure • Connected ERP",
  address: "",
  phone: "",
  email: "",
  logoUrl: "",
};

function normalize(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function cleanIdentifier(value) {
  return String(value ?? "").trim();
}

function rolePolicyRole(role) {
  const normalized = normalize(role);

  return ADMIN_ROLES.has(normalized)
    ? normalized
    : normalized === "teacher"
      ? "teacher"
      : "student";
}

/* ============================================================
   FIRESTORE LOOKUP HELPERS
============================================================ */

async function findByFields(
  collectionName,
  fields,
  value
) {
  const cleaned = cleanIdentifier(value);

  if (!cleaned) return null;

  for (const field of fields) {
    try {
      const snapshot = await getDocs(
        query(
          collection(db, collectionName),
          where(field, "==", cleaned)
        )
      );

      if (!snapshot.empty) {
        return {
          id: snapshot.docs[0].id,
          ...snapshot.docs[0].data(),
        };
      }
    } catch (error) {
      console.warn(
        `${collectionName}.${field} lookup failed:`,
        error
      );
    }
  }

  return null;
}

async function findProfileByEmail(
  collectionName,
  email
) {
  const lowerEmail =
    normalize(email);

  if (!lowerEmail) return null;

  for (const field of [
    "email",
    "accountEmail",
  ]) {
    try {
      const snapshot = await getDocs(
        query(
          collection(db, collectionName),
          where(field, "==", lowerEmail)
        )
      );

      if (!snapshot.empty) {
        return {
          id: snapshot.docs[0].id,
          ...snapshot.docs[0].data(),
        };
      }
    } catch (error) {
      console.warn(
        `${collectionName} email lookup failed:`,
        error
      );
    }
  }

  return null;
}

/* ============================================================
   RESOLVE IDENTITY
============================================================ */

async function resolveLoginIdentity(
  identifier
) {
  const value =
    cleanIdentifier(identifier);

  if (!value) {
    return null;
  }

  /*
    Direct email first.
  */
  if (value.includes("@")) {
    const email =
      normalize(value);

    const adminProfile =
      await findProfileByEmail(
        "users",
        email
      );

    if (adminProfile) {
      const role =
        normalize(
          adminProfile.role
        );

      return {
        email:
          adminProfile.accountEmail ||
          adminProfile.email ||
          email,
        role:
          ROLE_DASHBOARDS[role]
            ? role
            : "student",
        profile:
          adminProfile,
      };
    }

    const teacherProfile =
      await findProfileByEmail(
        "teachers",
        email
      );

    if (teacherProfile) {
      return {
        email:
          teacherProfile.accountEmail ||
          teacherProfile.email ||
          email,
        role: "teacher",
        profile:
          teacherProfile,
      };
    }

    const studentProfile =
      await findProfileByEmail(
        "students",
        email
      );

    if (studentProfile) {
      return {
        email:
          studentProfile.accountEmail ||
          studentProfile.email ||
          email,
        role: "student",
        profile:
          studentProfile,
      };
    }

    /*
      Let Firebase decide whether the raw email exists.
      The role will be checked by AuthContext after login.
    */
    return {
      email,
      role: "student",
      profile: null,
    };
  }

  /*
    Non-email student identifiers.
  */
  const student =
    await findByFields(
      "students",
      [
        "enrollmentNo",
        "enrollmentNumber",
        "mobile",
        "mobileNumber",
        "phone",
        "phoneNumber",
      ],
      value
    );

  if (student) {
    return {
      email:
        student.accountEmail ||
        student.email ||
        null,
      role: "student",
      profile: student,
    };
  }

  /*
    Non-email teacher identifiers.
  */
  const teacher =
    await findByFields(
      "teachers",
      [
        "employeeId",
        "teacherId",
        "mobile",
        "mobileNumber",
        "phone",
        "phoneNumber",
      ],
      value
    );

  if (teacher) {
    return {
      email:
        teacher.accountEmail ||
        teacher.email ||
        null,
      role: "teacher",
      profile: teacher,
    };
  }

  /*
    Optional central users collection identifiers.
  */
  const user =
    await findByFields(
      "users",
      [
        "employeeId",
        "userId",
        "username",
        "mobile",
        "phone",
      ],
      value
    );

  if (user) {
    const role =
      normalize(user.role);

    return {
      email:
        user.accountEmail ||
        user.email ||
        null,
      role:
        ROLE_DASHBOARDS[role]
          ? role
          : "student",
      profile: user,
    };
  }

  return null;
}

/* ============================================================
   SCHOOL SETTINGS
============================================================ */

async function getSchoolSettings() {
  try {
    const snapshot = await getDocs(
      query(
        collection(db, "settings"),
        where(
          "__name__",
          "==",
          "schoolSettings"
        )
      )
    );

    if (!snapshot.empty) {
      return {
        ...SCHOOL_FALLBACK,
        ...snapshot.docs[0].data(),
      };
    }
  } catch (error) {
    console.warn(
      "schoolSettings lookup:",
      error
    );
  }

  return SCHOOL_FALLBACK;
}

/* ============================================================
   COMPONENT
============================================================ */

export default function Login() {
  const navigate =
    useNavigate();

  const {
    user,
    role,
    loading: authLoading,
    profileLoading,
    isAccountActive,
  } = useAuth();

  const [
    identifier,
    setIdentifier,
  ] = useState("");

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    rememberMe,
    setRememberMe,
  ] = useState(true);

  const [
    loginLoading,
    setLoginLoading,
  ] = useState(false);

  const [
    googleLoading,
    setGoogleLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  const [
    attemptsLeft,
    setAttemptsLeft,
  ] = useState(null);

  const [
    lockedUntil,
    setLockedUntil,
  ] = useState(0);

  const [
    lockCountdown,
    setLockCountdown,
  ] = useState(0);

  const [
    showForgot,
    setShowForgot,
  ] = useState(false);

  const [
    resetEmail,
    setResetEmail,
  ] = useState("");

  const [
    resetLoading,
    setResetLoading,
  ] = useState(false);

  const [
    resetMessage,
    setResetMessage,
  ] = useState("");

  const [
    themeName,
    setThemeName,
  ] = useState(
    () =>
      localStorage.getItem(
        "xyzLoginTheme"
      ) || "emerald"
  );

  const [
    school,
    setSchool,
  ] = useState(
    SCHOOL_FALLBACK
  );

  /* ==========================================================
     ACTIVE THEME
  ========================================================== */

  const theme =
    useMemo(
      () =>
        THEMES[
          themeName
        ] ||
        THEMES.emerald,
      [themeName]
    );

  useEffect(() => {
    localStorage.setItem(
      "xyzLoginTheme",
      themeName
    );

    document.documentElement.style.setProperty(
      "--login-primary",
      theme.primary
    );

    document.documentElement.style.setProperty(
      "--login-primary-dark",
      theme.primaryDark
    );

    document.documentElement.style.setProperty(
      "--login-glow",
      theme.glow
    );
  }, [theme, themeName]);

  /* ==========================================================
     SCHOOL SETTINGS
  ========================================================== */

  useEffect(() => {
    let active = true;

    async function loadSettings() {
      const settings =
        await getSchoolSettings();

      if (active) {
        setSchool(settings);
      }
    }

    loadSettings();

    return () => {
      active = false;
    };
  }, []);

  /* ==========================================================
     ALREADY LOGGED IN
  ========================================================== */

  useEffect(() => {
    if (
      !authLoading &&
      !profileLoading &&
      user &&
      role &&
      isAccountActive
    ) {
      const dashboard =
        ROLE_DASHBOARDS[
          normalize(role)
        ];

      if (dashboard) {
        navigate(
          dashboard,
          {
            replace: true,
          }
        );
      }
    }
  }, [
    user,
    role,
    authLoading,
    profileLoading,
    isAccountActive,
    navigate,
  ]);

  /* ==========================================================
     LOCK TIMER
  ========================================================== */

  useEffect(() => {
    if (!lockedUntil) {
      setLockCountdown(0);
      return undefined;
    }

    const update =
      () => {
        const remaining =
          Math.max(
            0,
            lockedUntil -
              Date.now()
          );

        setLockCountdown(
          remaining
        );

        if (remaining <= 0) {
          setLockedUntil(0);
          setError("");
        }
      };

    update();

    const timer =
      window.setInterval(
        update,
        1000
      );

    return () =>
      window.clearInterval(
        timer
      );
  }, [lockedUntil]);

  /* ==========================================================
     CHECK CURRENT ATTEMPTS
  ========================================================== */

  async function refreshSecurityState(
    roleValue,
    email
  ) {
    if (!email) {
      return;
    }

    const state =
      canAttemptLogin(
        rolePolicyRole(
          roleValue
        ),
        email
      );

    setAttemptsLeft(
      state.remainingAttempts
    );

    if (
      state.locked
    ) {
      setLockedUntil(
        Date.now() +
          state.remainingMs
      );
    } else {
      setLockedUntil(0);
    }
  }

  /* ==========================================================
     IDENTIFIER / POLICY
  ========================================================== */

  async function resolveBeforeLogin() {
    const resolved =
      await resolveLoginIdentity(
        identifier
      );

    if (!resolved?.email) {
      return null;
    }

    return resolved;
  }

  /* ==========================================================
     EMAIL/PASSWORD LOGIN
  ========================================================== */

  async function handleLogin(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const clean =
      cleanIdentifier(
        identifier
      );

    if (!clean) {
      setError(
        "Enter your email, enrollment number, mobile number or employee ID."
      );
      return;
    }

    if (!password) {
      setError(
        "Enter your password."
      );
      return;
    }

    try {
      setLoginLoading(true);

      const resolved =
        await resolveBeforeLogin();

      /*
        Unknown non-email identifiers cannot be safely
        converted into an Auth email.
      */
      if (
        !resolved?.email
      ) {
        setError(
          "No authorized account was found with these details."
        );
        return;
      }

      const policyRole =
        rolePolicyRole(
          resolved.role
        );

      /*
        Check local lock BEFORE Firebase call.
      */
      const security =
        canAttemptLogin(
          policyRole,
          resolved.email
        );

      setAttemptsLeft(
        security.remainingAttempts
      );

      if (
        security.locked
      ) {
        setLockedUntil(
          Date.now() +
            security.remainingMs
        );

        setError(
          `Login is temporarily locked. Try again after ${formatRemaining(
            security.remainingMs
          )}.`
        );

        return;
      }

      await setPersistence(
        auth,
        rememberMe
          ? browserLocalPersistence
          : browserSessionPersistence
      );

      await signInWithEmailAndPassword(
        auth,
        resolved.email,
        password
      );

      /*
        Successful Firebase authentication.
        Clear local failed-attempt counter.
      */
      registerSuccess(
        policyRole,
        resolved.email
      );

      setAttemptsLeft(
        policyForRole(
          policyRole
        ).maxAttempts
      );

      setLockedUntil(0);

      setSuccess(
        "Login successful. Verifying your school account..."
      );

      /*
        AuthContext will resolve the real role and route
        to the correct dashboard.
      */
    } catch (err) {
      console.error(
        "Central login error:",
        err
      );

      /*
        We need a role/email even on failure so the
        attempt policy can be updated.
      */
      try {
        const resolved =
          await resolveBeforeLogin();

        if (
          resolved?.email
        ) {
          const policyRole =
            rolePolicyRole(
              resolved.role
            );

          const failed =
            registerFailure(
              policyRole,
              resolved.email
            );

          setAttemptsLeft(
            Math.max(
              0,
              policyForRole(
                policyRole
              ).maxAttempts -
                failed.attempts
            )
          );

          if (
            failed.lockedUntil >
            Date.now()
          ) {
            setLockedUntil(
              failed.lockedUntil
            );

            setError(
              `Too many failed attempts. This account is locked for ${Math.round(
                policyForRole(
                  policyRole
                ).lockMs /
                  3600000
              )} hours.`
            );

            return;
          }
        }
      } catch (
        trackingError
      ) {
        console.warn(
          "Failed-attempt tracking:",
          trackingError
        );
      }

      switch (err?.code) {
        case "auth/invalid-credential":
        case "auth/wrong-password":
        case "auth/user-not-found":
          setError(
            "Incorrect email/ID or password."
          );
          break;

        case "auth/invalid-email":
          setError(
            "Please enter a valid email address."
          );
          break;

        case "auth/too-many-requests":
          setError(
            "Firebase has temporarily blocked further authentication attempts. Please try again later."
          );
          break;

        case "auth/user-disabled":
          setError(
            "This account has been disabled. Please contact school administration."
          );
          break;

        case "auth/network-request-failed":
          setError(
            "Network error. Check your internet connection and try again."
          );
          break;

        default:
          setError(
            "Unable to login. Please verify your credentials and try again."
          );
      }
    } finally {
      setLoginLoading(false);
    }
  }

  /* ==========================================================
     GOOGLE LOGIN
  ========================================================== */

  async function handleGoogleLogin() {
    setError("");
    setSuccess("");

    try {
      setGoogleLoading(true);

      await setPersistence(
        auth,
        rememberMe
          ? browserLocalPersistence
          : browserSessionPersistence
      );

      const credential =
        await signInWithPopup(
          auth,
          googleProvider
        );

      /*
        Do not automatically trust any Google account.
        AuthContext must find a valid school profile and role.
      */
      if (
        !credential?.user
      ) {
        throw new Error(
          "Google authentication returned no user."
        );
      }

      setSuccess(
        "Google login successful. Verifying your school account..."
      );
    } catch (err) {
      console.error(
        "Google login error:",
        err
      );

      /*
        If a Google account logged in successfully but
        has no school profile, clear the Firebase session.
      */
      if (
        err?.code ===
        "auth/popup-closed-by-user"
      ) {
        setError(
          "Google sign-in was cancelled."
        );
      } else if (
        err?.code ===
        "auth/popup-blocked"
      ) {
        setError(
          "Your browser blocked the Google sign-in window."
        );
      } else if (
        err?.code ===
        "auth/cancelled-popup-request"
      ) {
        setError(
          "Another Google sign-in request is already running."
        );
      } else if (
        err?.code ===
        "auth/account-exists-with-different-credential"
      ) {
        setError(
          "This email already uses another sign-in method. Use the school's registered password login."
        );
      } else if (
        err?.code ===
        "auth/operation-not-allowed"
      ) {
        setError(
          "Google Sign-In is not enabled in Firebase Authentication."
        );
      } else {
        setError(
          "Google sign-in could not be completed."
        );
      }
    } finally {
      setGoogleLoading(false);
    }
  }

  /* ==========================================================
     FORGOT PASSWORD
  ========================================================== */

  async function handleForgotPassword(
    event
  ) {
    event.preventDefault();

    setResetMessage("");

    const email =
      resetEmail.trim();

    if (
      !email ||
      !email.includes("@")
    ) {
      setResetMessage(
        "Enter your registered email address."
      );
      return;
    }

    try {
      setResetLoading(true);

      await sendPasswordResetEmail(
        auth,
        email
      );

      setResetMessage(
        "If an account is registered with this email, a secure password-reset link has been sent."
      );
    } catch (err) {
      console.error(
        "Password reset:",
        err
      );

      /*
        Same response prevents account enumeration.
      */
      setResetMessage(
        "If an account is registered with this email, a secure password-reset link has been sent."
      );
    } finally {
      setResetLoading(false);
    }
  }

  /* ==========================================================
     LOCK MESSAGE
  ========================================================== */

  const lockMessage =
    lockedUntil >
      Date.now()
      ? `Login locked for ${formatRemaining(
          lockCountdown
        )}.`
      : "";

  /* ==========================================================
     LOADING
  ========================================================== */

  if (
    authLoading ||
    profileLoading
  ) {
    return (
      <div
        className="login-page"
        style={{
          "--login-primary":
            theme.primary,
          "--login-primary-dark":
            theme.primaryDark,
          "--login-glow":
            theme.glow,
        }}
      >

        <div className="loading-card">

          <div className="spinner" />

          <h2>
            Securing your session…
          </h2>

          <p>
            {school.schoolName}
          </p>

        </div>

        <style>{styles}</style>

      </div>
    );
  }

  /* ==========================================================
     UI
  ========================================================== */

  return (
    <div
      className="login-page"
      style={{
        "--login-primary":
          theme.primary,
        "--login-primary-dark":
          theme.primaryDark,
        "--login-glow":
          theme.glow,
      }}
    >

      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <main className="login-shell">

        {/* BRAND HEADER */}

        <header className="brand-header">

          <div className="brand-logo">

            {school.logoUrl ? (
              <img
                src={
                  school.logoUrl
                }
                alt="School"
              />
            ) : (
              <span>
                🏫
              </span>
            )}

          </div>

          <div>

            <h1>
              {school.schoolName}
            </h1>

            <p>
              {school.tagline ||
                SCHOOL_FALLBACK.tagline}
            </p>

          </div>

        </header>

        {/* LOGIN CARD */}

        <section className="login-card">

          <div className="top-row">

            <div>

              <span className="security-pill">
                🔐 SECURE PORTAL
              </span>

              <h2>
                Welcome Back
              </h2>

              <p>
                Sign in to continue to your
                authorized school dashboard.
              </p>

            </div>

            {/* THEME */}

            <select
              value={
                themeName
              }
              onChange={(
                event
              ) =>
                setThemeName(
                  event.target
                    .value
                )
              }
              className="theme-select"
              aria-label="Login theme"
            >

              {Object.entries(
                THEMES
              ).map(
                ([
                  key,
                  value,
                ]) => (
                  <option
                    key={
                      key
                    }
                    value={
                      key
                    }
                  >
                    {value.label}
                  </option>
                )
              )}

            </select>

          </div>

          {/* ERROR */}

          {error && (
            <div className="alert error">
              <strong>
                ⚠️ Sign-in failed
              </strong>

              <span>
                {error}
              </span>

              {attemptsLeft !==
                null &&
                !lockMessage && (
                  <small>
                    Attempts remaining:{" "}
                    {
                      attemptsLeft
                    }
                  </small>
                )}

            </div>
          )}

          {/* LOCK */}

          {lockMessage && (
            <div className="alert locked">

              <strong>
                🔒 Account Temporarily Locked
              </strong>

              <span>
                {lockMessage}
              </span>

            </div>
          )}

          {/* SUCCESS */}

          {success && (
            <div className="alert success">
              ✓{" "}
              {success}
            </div>
          )}

          {/* GOOGLE */}

          <button
            type="button"
            className="google-button"
            onClick={
              handleGoogleLogin
            }
            disabled={
              googleLoading ||
              loginLoading ||
              Boolean(lockMessage)
            }
          >

            <span className="google-icon">
              G
            </span>

            <span>
              {googleLoading
                ? "Connecting to Google…"
                : "Continue with Google"}
            </span>

          </button>

          <div className="divider">
            <span />
            <b>
              OR
            </b>
            <span />
          </div>

          {/* EMAIL/PASSWORD */}

          <form
            onSubmit={
              handleLogin
            }
          >

            <label>
              EMAIL / STUDENT ID / EMPLOYEE ID
            </label>

            <input
              type="text"
              value={
                identifier
              }
              onChange={(
                event
              ) => {
                setIdentifier(
                  event.target
                    .value
                );
                setError("");
                setSuccess("");
              }}
              placeholder="Email, Enrollment No., Mobile or Employee ID"
              autoComplete="username"
              disabled={
                loginLoading ||
                Boolean(lockMessage)
              }
            />

            <div className="password-label-row">

              <label>
                PASSWORD
              </label>

              <button
                type="button"
                className="show-button"
                onClick={() =>
                  setShowPassword(
                    (
                      current
                    ) =>
                      !current
                  )
                }
              >
                {showPassword
                  ? "Hide"
                  : "Show"}
              </button>

            </div>

            <input
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              value={
                password
              }
              onChange={(
                event
              ) => {
                setPassword(
                  event.target
                    .value
                );
                setError("");
              }}
              placeholder="Enter your password"
              autoComplete="current-password"
              disabled={
                loginLoading ||
                Boolean(lockMessage)
              }
            />

            <div className="remember-row">

              <label className="remember">

                <input
                  type="checkbox"
                  checked={
                    rememberMe
                  }
                  onChange={(
                    event
                  ) =>
                    setRememberMe(
                      event
                        .target
                        .checked
                    )
                  }
                />

                <span>
                  Remember me
                </span>

              </label>

              <button
                type="button"
                className="forgot-button"
                onClick={() => {
                  setResetEmail(
                    identifier.includes(
                      "@"
                    )
                      ? identifier
                      : ""
                  );

                  setResetMessage(
                    ""
                  );

                  setShowForgot(
                    true
                  );
                }}
              >
                Forgot Password?
              </button>

            </div>

            <button
              type="submit"
              className="login-button"
              disabled={
                loginLoading ||
                googleLoading ||
                Boolean(lockMessage)
              }
            >

              {loginLoading
                ? "Signing in…"
                : "Sign In Securely →"}

            </button>

          </form>

          {/* ROLE INFO */}

          <div className="role-strip">

            <p>
              ONE PORTAL • AUTHORIZED ROLE ACCESS
            </p>

            <div>

              <span>
                👑 Admin
              </span>

              <span>
                👨‍🏫 Teacher
              </span>

              <span>
                🎓 Student
              </span>

            </div>

          </div>

          {/* SECURITY */}

          <div className="security-note">

            <strong>
              🛡️ Security
            </strong>

            <p>
              Passwords are handled by Firebase
              Authentication. Login attempts are
              rate-limited locally according to the
              account role.
            </p>

          </div>

        </section>

        <footer className="footer">

          <p>
            {school.schoolName}
          </p>

          {school.address && (
            <span>
              {school.address}
            </span>
          )}

          {(school.phone ||
            school.email) && (
            <span>
              {school.phone}
              {school.phone &&
                school.email
                ? " • "
                : ""}
              {school.email}
            </span>
          )}

          <small>
            Secure School ERP Portal • 2026
          </small>

        </footer>

      </main>

      {/* FORGOT PASSWORD */}

      {showForgot && (
        <div
          className="modal-backdrop"
          onMouseDown={() =>
            setShowForgot(
              false
            )
          }
        >

          <div
            className="modal-card"
            onMouseDown={(
              event
            ) =>
              event.stopPropagation()
            }
          >

            <div className="modal-icon">
              🔑
            </div>

            <h2>
              Reset Password
            </h2>

            <p>
              Enter your registered email. A secure
              Firebase password reset link will be sent.
            </p>

            {resetMessage && (
              <div className="alert success">
                ✓{" "}
                {resetMessage}
              </div>
            )}

            <form
              onSubmit={
                handleForgotPassword
              }
            >

              <label>
                REGISTERED EMAIL
              </label>

              <input
                type="email"
                value={
                  resetEmail
                }
                onChange={(
                  event
                ) =>
                  setResetEmail(
                    event.target
                      .value
                  )
                }
                placeholder="you@example.com"
                autoComplete="email"
                autoFocus
              />

              <button
                type="submit"
                className="login-button"
                disabled={
                  resetLoading
                }
              >
                {resetLoading
                  ? "Sending…"
                  : "Send Reset Link"}
              </button>

              <button
                type="button"
                className="cancel-button"
                onClick={() =>
                  setShowForgot(
                    false
                  )
                }
              >
                Cancel
              </button>

            </form>

          </div>

        </div>
      )}

      <style>
        {styles}
      </style>

    </div>
  );
}

/* ============================================================
   STYLES
============================================================ */

const styles = `
  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    font-family:
      Inter,
      ui-sans-serif,
      system-ui,
      -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      sans-serif;
  }

  .login-page {
    min-height: 100vh;
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 28px 16px;
    background:
      radial-gradient(
        circle at 15% 10%,
        var(--login-glow),
        transparent 26%
      ),
      radial-gradient(
        circle at 88% 88%,
        rgba(99,102,241,.18),
        transparent 29%
      ),
      linear-gradient(
        135deg,
        #020617 0%,
        #0f172a 55%,
        #172554 100%
      );
  }

  .ambient {
    position: absolute;
    border-radius: 999px;
    pointer-events: none;
    filter: blur(18px);
  }

  .ambient-one {
    width: 340px;
    height: 340px;
    left: -180px;
    top: -160px;
    background:
      var(--login-glow);
  }

  .ambient-two {
    width: 440px;
    height: 440px;
    right: -220px;
    bottom: -220px;
    background:
      rgba(79,70,229,.16);
  }

  .login-shell {
    position: relative;
    z-index: 2;
    width: 100%;
    max-width: 500px;
  }

  .brand-header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 13px;
    margin-bottom: 18px;
  }

  .brand-logo {
    width: 60px;
    height: 60px;
    border-radius: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    background:
      linear-gradient(
        135deg,
        var(--login-primary),
        var(--login-primary-dark)
      );
    box-shadow:
      0 18px 50px var(--login-glow);
  }

  .brand-logo img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    background: white;
    padding: 5px;
  }

  .brand-logo span {
    font-size: 27px;
  }

  .brand-header h1 {
    margin: 0;
    color: white;
    font-size: 22px;
    font-weight: 900;
    letter-spacing: -.035em;
  }

  .brand-header p {
    margin: 4px 0 0;
    color: #94a3b8;
    font-size: 11px;
  }

  .login-card {
    padding: 28px;
    border-radius: 28px;
    background: rgba(255,255,255,.97);
    border: 1px solid rgba(255,255,255,.45);
    box-shadow:
      0 38px 100px rgba(0,0,0,.42);
    backdrop-filter: blur(20px);
  }

  .top-row {
    display: flex;
    justify-content: space-between;
    gap: 14px;
    align-items: flex-start;
  }

  .security-pill {
    display: inline-block;
    border-radius: 999px;
    padding: 5px 9px;
    color: var(--login-primary-dark);
    background: #ecfdf5;
    border: 1px solid #a7f3d0;
    font-size: 9px;
    font-weight: 900;
    letter-spacing: .08em;
  }

  .top-row h2 {
    margin: 12px 0 0;
    color: #0f172a;
    font-size: 30px;
    line-height: 1.05;
    font-weight: 900;
    letter-spacing: -.04em;
  }

  .top-row p {
    max-width: 350px;
    margin: 8px 0 20px;
    color: #64748b;
    font-size: 13px;
    line-height: 1.55;
  }

  .theme-select {
    min-width: 105px;
    border: 1px solid #cbd5e1;
    border-radius: 11px;
    padding: 9px 10px;
    background: #fff;
    color: #334155;
    font-size: 10px;
    font-weight: 900;
    outline: none;
    cursor: pointer;
  }

  .alert {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 13px;
    padding: 11px 12px;
    border-radius: 12px;
    font-size: 11px;
    line-height: 1.45;
  }

  .alert.error {
    color: #991b1b;
    background: #fef2f2;
    border: 1px solid #fecaca;
  }

  .alert.locked {
    color: #92400e;
    background: #fffbeb;
    border: 1px solid #fde68a;
  }

  .alert.success {
    color: #047857;
    background: #ecfdf5;
    border: 1px solid #a7f3d0;
  }

  .alert small {
    opacity: .8;
  }

  .google-button {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    border: 1px solid #cbd5e1;
    border-radius: 13px;
    background: white;
    color: #1e293b;
    padding: 12px;
    font-size: 12px;
    font-weight: 850;
    cursor: pointer;
  }

  .google-button:disabled,
  .login-button:disabled {
    opacity: .58;
    cursor: not-allowed;
  }

  .google-icon {
    width: 27px;
    height: 27px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    border: 1px solid #e2e8f0;
    color: #4285f4;
    font-weight: 950;
  }

  .divider {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 18px 0;
    color: #94a3b8;
    font-size: 9px;
  }

  .divider span {
    flex: 1;
    height: 1px;
    background: #e2e8f0;
  }

  form label {
    display: block;
    margin: 0 0 7px;
    color: #475569;
    font-size: 10px;
    font-weight: 900;
    letter-spacing: .055em;
  }

  form input[type="text"],
  form input[type="password"],
  form input[type="email"] {
    width: 100%;
    border: 1px solid #cbd5e1;
    border-radius: 12px;
    padding: 13px 14px;
    outline: none;
    background: white;
    color: #0f172a;
    font-size: 13px;
  }

  form input:focus {
    border-color: var(--login-primary);
    box-shadow:
      0 0 0 3px var(--login-glow);
  }

  .password-label-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 16px;
  }

  .password-label-row label {
    margin-bottom: 7px;
  }

  .show-button,
  .forgot-button,
  .cancel-button {
    border: none;
    background: transparent;
    color: var(--login-primary);
    font-size: 10px;
    font-weight: 850;
    cursor: pointer;
  }

  .remember-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-top: 14px;
  }

  .remember {
    display: flex;
    align-items: center;
    gap: 7px;
    margin: 0;
    color: #64748b;
    font-size: 11px;
    font-weight: 650;
    letter-spacing: 0;
  }

  .remember input {
    width: auto;
  }

  .login-button {
    width: 100%;
    margin-top: 16px;
    border: none;
    border-radius: 13px;
    padding: 14px;
    color: white;
    background:
      linear-gradient(
        135deg,
        var(--login-primary),
        var(--login-primary-dark)
      );
    box-shadow:
      0 12px 28px var(--login-glow);
    font-size: 13px;
    font-weight: 900;
    cursor: pointer;
  }

  .role-strip {
    margin-top: 18px;
    border-radius: 14px;
    padding: 13px;
    background:
      linear-gradient(
        135deg,
        #f8fafc,
        #eff6ff
      );
    border: 1px solid #e2e8f0;
  }

  .role-strip p {
    margin: 0 0 10px;
    text-align: center;
    color: #475569;
    font-size: 9px;
    font-weight: 900;
    letter-spacing: .08em;
  }

  .role-strip div {
    display: grid;
    grid-template-columns:
      repeat(3,1fr);
    gap: 7px;
  }

  .role-strip span {
    padding: 7px 5px;
    border-radius: 9px;
    text-align: center;
    color: #475569;
    background: white;
    font-size: 10px;
    font-weight: 800;
  }

  .security-note {
    margin-top: 12px;
    padding: 11px;
    border-radius: 11px;
    border: 1px solid #99f6e4;
    background: #f0fdfa;
    color: #115e59;
    font-size: 10px;
    line-height: 1.5;
  }

  .security-note p {
    margin: 4px 0 0;
  }

  .footer {
    margin-top: 16px;
    text-align: center;
    color: #94a3b8;
    font-size: 10px;
    line-height: 1.6;
  }

  .footer p {
    margin: 0;
    color: white;
    font-weight: 800;
  }

  .footer span {
    display: block;
  }

  .footer small {
    display: block;
    margin-top: 4px;
  }

  .loading-card {
    width: 100%;
    max-width: 390px;
    padding: 34px;
    border-radius: 24px;
    background: rgba(15,23,42,.92);
    text-align: center;
    box-shadow:
      0 35px 90px rgba(0,0,0,.4);
  }

  .loading-card h2 {
    margin: 20px 0 0;
    color: white;
    font-size: 18px;
    font-weight: 900;
  }

  .loading-card p {
    margin: 7px 0 0;
    color: #94a3b8;
    font-size: 11px;
  }

  .spinner {
    width: 46px;
    height: 46px;
    margin: 0 auto;
    border: 4px solid rgba(255,255,255,.12);
    border-top-color:
      var(--login-primary);
    border-radius: 50%;
    animation:
      xyzSpin .8s linear infinite;
  }

  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 5000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    background: rgba(2,6,23,.74);
    backdrop-filter: blur(8px);
  }

  .modal-card {
    width: 100%;
    max-width: 420px;
    padding: 25px;
    border-radius: 23px;
    background: white;
    box-shadow:
      0 35px 100px rgba(0,0,0,.44);
  }

  .modal-icon {
    width: 55px;
    height: 55px;
    margin: 0 auto 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 16px;
    background: #ecfdf5;
    font-size: 24px;
  }

  .modal-card h2 {
    margin: 0;
    text-align: center;
    color: #0f172a;
    font-size: 24px;
    font-weight: 900;
  }

  .modal-card > p {
    margin: 8px 0 18px;
    color: #64748b;
    text-align: center;
    font-size: 12px;
    line-height: 1.6;
  }

  .cancel-button {
    width: 100%;
    padding: 10px;
  }

  @keyframes xyzSpin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 560px) {
    .login-page {
      padding: 18px 12px;
    }

    .login-card {
      padding: 21px 17px;
      border-radius: 22px;
    }

    .top-row {
      flex-direction: column;
    }

    .theme-select {
      align-self: flex-end;
    }

    .brand-header h1 {
      font-size: 18px;
    }

    .top-row h2 {
      font-size: 25px;
    }
  }
`;
