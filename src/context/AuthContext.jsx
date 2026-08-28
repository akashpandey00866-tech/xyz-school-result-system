import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where,
} from "firebase/firestore";

import {
  auth,
  db,
} from "../config/firebase";

/* =========================================================
   XYZ SCHOOL ERP — CENTRAL AUTH CONTEXT

   One authentication state for:
   ADMIN
   TEACHER
   STUDENT
   PRINCIPAL
   ACCOUNTANT
   STAFF

   IMPORTANT:
   This context improves UI/session routing.

   REAL SECURITY MUST ALSO BE ENFORCED BY:
   Firebase Authentication + Firestore Security Rules
   (never trust frontend role checks alone).
========================================================= */

const AuthContext = createContext(null);

/* =========================================================
   ROLE CONFIG
========================================================= */

const VALID_ROLES = new Set([
  "admin",
  "teacher",
  "student",
  "principal",
  "accountant",
  "staff",
]);

const ROLE_COLLECTIONS = {
  admin: "users",
  teacher: "teachers",
  student: "students",
  principal: "users",
  accountant: "users",
  staff: "users",
};

/*
  Backward compatibility:
  Your existing AdminLogin currently uses this admin account.
  For maximum security, migrate Admin authorization to
  users/{uid}.role = "admin" and then remove this fallback.
*/
const LEGACY_ADMIN_EMAIL =
  "akashpandey00866@gmail.com";

/* =========================================================
   HELPERS
========================================================= */

function normalizeRole(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function normalizeStatus(value) {
  return String(value || "ACTIVE")
    .trim()
    .toUpperCase();
}

function isActiveStatus(value) {
  const status = normalizeStatus(value);

  return (
    status === "ACTIVE" ||
    status === "VERIFIED"
  );
}

/* =========================================================
   READ PROFILE FROM FIRESTORE
========================================================= */

async function readProfile(
  collectionName,
  uid
) {
  if (!collectionName || !uid) {
    return null;
  }

  const reference = doc(
    db,
    collectionName,
    uid
  );

  const snapshot = await getDoc(
    reference
  );

  if (!snapshot.exists()) {
    return null;
  }

  return {
    uid,
    id: snapshot.id,
    ...snapshot.data(),
  };
}

/* =========================================================
   FIND ROLE

   Priority:
   1. users/{uid}
   2. teachers/{uid}
   3. students/{uid}
   4. legacy admin email fallback

   This allows the system to move gradually from the
   old Admin-email system to a fully database-driven
   role system.
========================================================= */

async function findUserProfile(
  currentUser
) {
  if (!currentUser?.uid) {
    return {
      role: null,
      profile: null,
    };
  }

  const uid = currentUser.uid;

  /*
    ---------------------------------------------------------
    1. CENTRAL USERS COLLECTION
    ---------------------------------------------------------
    Preferred future architecture.

    Example:
    users/{uid}
      role: "admin"
      accountStatus: "ACTIVE"
  */

  try {
    const userProfile =
      await readProfile(
        "users",
        uid
      );

    if (userProfile) {
      const role =
        normalizeRole(
          userProfile.role
        );

      if (
        VALID_ROLES.has(role)
      ) {
        return {
          role,
          profile: {
            ...userProfile,
            role,
          },
        };
      }
    }
  } catch (error) {
    console.error(
      "Central user profile lookup failed:",
      error
    );
  }

  /*
    ---------------------------------------------------------
    2. TEACHER
    ---------------------------------------------------------
  */

  try {
    const teacherProfile =
      await readProfile(
        ROLE_COLLECTIONS.teacher,
        uid
      );

    if (teacherProfile) {
      return {
        role: "teacher",
        profile: {
          ...teacherProfile,
          role:
            normalizeRole(
              teacherProfile.role
            ) || "teacher",
        },
      };
    }
  } catch (error) {
    console.error(
      "Teacher profile lookup failed:",
      error
    );
  }

  /*
    ---------------------------------------------------------
    3. STUDENT
    ---------------------------------------------------------
  */

  try {
    // New accounts may use the Firebase Auth UID as the student
    // document id, while older records may use an enrollment/id.
    // Support both without changing existing student documents.
    let studentProfile = await readProfile(
      ROLE_COLLECTIONS.student,
      uid
    );

    if (!studentProfile) {
      const candidates = [
        ["firebaseUid", uid],
        ["authUid", uid],
        ["uid", uid],
      ];

      const email = String(
        currentUser.email || ""
      ).trim().toLowerCase();

      if (email) {
        candidates.push(["accountEmail", email]);
        candidates.push(["email", email]);
      }

      for (const [field, value] of candidates) {
        try {
          const snapshot = await getDocs(
            query(
              collection(db, "students"),
              where(field, "==", value),
              limit(1)
            )
          );

          if (!snapshot.empty) {
            const studentDoc = snapshot.docs[0];
            studentProfile = {
              id: studentDoc.id,
              uid,
              ...studentDoc.data(),
            };
            break;
          }
        } catch (lookupError) {
          console.warn(
            `Student lookup skipped for ${field}:`,
            lookupError
          );
        }
      }
    }

    if (studentProfile) {
      return {
        role: "student",
        profile: {
          ...studentProfile,
          uid,
          role:
            normalizeRole(
              studentProfile.role
            ) || "student",
        },
      };
    }
  } catch (error) {
    console.error(
      "Student profile lookup failed:",
      error
    );
  }

  /*
    ---------------------------------------------------------
    4. LEGACY ADMIN FALLBACK
    ---------------------------------------------------------

    Kept temporarily so your current AdminLogin does not
    suddenly stop working.

    IMPORTANT:
    This is NOT the final security model.
    Later create users/{adminUid} with role="admin".
  */

  if (
    currentUser.email &&
    currentUser.email.toLowerCase() ===
      LEGACY_ADMIN_EMAIL.toLowerCase()
  ) {
    return {
      role: "admin",
      profile: {
        uid,
        email: currentUser.email,
        displayName:
          currentUser.displayName ||
          "Administrator",
        role: "admin",
        accountStatus: "ACTIVE",
        legacyAdmin: true,
      },
    };
  }

  return {
    role: null,
    profile: null,
  };
}

/* =========================================================
   PROVIDER
========================================================= */

export function AuthProvider({
  children,
}) {
  const [user, setUser] =
    useState(null);

  const [profile, setProfile] =
    useState(null);

  const [role, setRole] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [
    profileLoading,
    setProfileLoading,
  ] = useState(false);

  const [authError, setAuthError] =
    useState(null);

  /*
    ---------------------------------------------------------
    Firebase AUTH STATE
    ---------------------------------------------------------
  */

  useEffect(() => {
    let mounted = true;

    async function configurePersistence() {
      try {
        /*
          Local persistence keeps the authenticated session
          after browser restart.

          Passwords are NOT stored here.
          Firebase Authentication handles credentials.
        */

        await setPersistence(
          auth,
          browserLocalPersistence
        );
      } catch (error) {
        console.error(
          "Firebase persistence setup failed:",
          error
        );
      }
    }

    configurePersistence();

    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (currentUser) => {
          if (!mounted) {
            return;
          }

          setLoading(true);
          setAuthError(null);

          setUser(currentUser);

          /*
            LOGGED OUT
          */

          if (!currentUser) {
            setProfile(null);
            setRole(null);
            setProfileLoading(false);
            setLoading(false);

            return;
          }

          /*
            LOGGED IN → FIND SCHOOL ROLE
          */

          setProfileLoading(true);

          try {
            const result =
              await findUserProfile(
                currentUser
              );

            if (!mounted) {
              return;
            }

            setProfile(
              result.profile
            );

            setRole(
              result.role
            );

            /*
              Authentication succeeded but the account
              is not authorized for this ERP.
            */

            if (!result.role) {
              setAuthError(
                "Your account is authenticated, but no authorized school role was found."
              );
            }
          } catch (error) {
            console.error(
              "Role detection failed:",
              error
            );

            if (mounted) {
              setProfile(null);
              setRole(null);

              setAuthError(
                "Unable to verify your school account."
              );
            }
          } finally {
            if (mounted) {
              setProfileLoading(false);
              setLoading(false);
            }
          }
        }
      );

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  /* =======================================================
     ACCOUNT STATE
  ======================================================= */

  const accountStatus =
    normalizeStatus(
      profile?.accountStatus ||
        profile?.status
    );

  const isAccountActive =
    Boolean(profile) &&
    isActiveStatus(
      accountStatus
    );

  /* =======================================================
     ROLE SHORTCUTS
  ======================================================= */

  const isAdmin =
    role === "admin";

  const isTeacher =
    role === "teacher";

  const isStudent =
    role === "student";

  const isPrincipal =
    role === "principal";

  const isAccountant =
    role === "accountant";

  const isStaff =
    role === "staff";

  /* =======================================================
     DISPLAY DATA
  ======================================================= */

  const displayName =
    profile?.name ||
    profile?.fullName ||
    profile?.studentName ||
    user?.displayName ||
    user?.email?.split("@")[0] ||
    "User";

  /* =======================================================
     PERMISSION HELPERS
  ======================================================= */

  const hasRole = (
    requiredRole
  ) => {
    if (
      Array.isArray(
        requiredRole
      )
    ) {
      return requiredRole.includes(
        role
      );
    }

    return role === requiredRole;
  };

  /*
    Multiple-role helper for future modules.
  */

  const hasAnyRole = (
    roles = []
  ) => {
    if (!Array.isArray(roles)) {
      return false;
    }

    return roles.includes(role);
  };

  /*
    Teacher-specific assignment helper.

    Example:
    canAccessAssignedClass(classId, section)
  */

  const canAccessAssignedClass = (
    classId,
    section
  ) => {
    if (!isTeacher) {
      return false;
    }

    const assignedClassId =
      String(
        profile?.classId || ""
      );

    const assignedSection =
      normalize(
        profile?.section
      );

    return (
      String(classId || "") ===
        assignedClassId &&
      normalize(section) ===
        assignedSection
    );
  };

  /*
    Teacher subject authorization.
  */

  const canAccessSubject = (
    subjectId
  ) => {
    if (!isTeacher) {
      return false;
    }

    const subjects =
      Array.isArray(
        profile?.subjectIds
      )
        ? profile.subjectIds
        : [];

    return subjects.some(
      (id) =>
        String(id) ===
        String(subjectId)
    );
  };

  /* =======================================================
     APPLICATION ACCESS
  ======================================================= */

  const isAuthenticated =
    Boolean(user);

  /*
    Fully authenticated + recognized role + active account.
  */

  const canAccessSystem =
    Boolean(
      user &&
        role &&
        isAccountActive
    );

  /* =======================================================
     CONTEXT VALUE
  ======================================================= */

  const value = useMemo(
    () => ({
      /* Firebase */
      user,

      /* School profile */
      profile,

      /* Role */
      role,

      /* Loading */
      loading,
      profileLoading,

      /* Errors */
      authError,

      /* Account */
      accountStatus,
      isAccountActive,

      /* Display */
      displayName,

      /* Role shortcuts */
      isAdmin,
      isTeacher,
      isStudent,
      isPrincipal,
      isAccountant,
      isStaff,

      /* Permissions */
      hasRole,
      hasAnyRole,
      canAccessAssignedClass,
      canAccessSubject,

      /* Authentication */
      isAuthenticated,
      canAccessSystem,
    }),
    [
      user,
      profile,
      role,
      loading,
      profileLoading,
      authError,
      accountStatus,
      isAccountActive,
      displayName,
      isAdmin,
      isTeacher,
      isStudent,
      isPrincipal,
      isAccountant,
      isStaff,
      isAuthenticated,
      canAccessSystem,
    ]
  );

  /* =======================================================
     SECURE INITIAL LOADING SCREEN
  ======================================================= */

  /*
    Do not render the ERP before Firebase has determined
    authentication state.

    Prevents:
      Login → wrong dashboard flash
      Logout → protected page flash
      Role → incorrect dashboard flash
  */

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="text-center">

          <div className="w-16 h-16 border-4 border-cyan-300/20 border-t-cyan-400 rounded-full animate-spin mx-auto" />

          <p className="text-white font-black text-lg mt-6">
            Securely verifying your account...
          </p>

          <p className="text-slate-400 text-sm mt-2">
            XYZ School ERP
          </p>

        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
}

/* =========================================================
   useAuth HOOK
========================================================= */

export function useAuth() {
  const context =
    useContext(
      AuthContext
    );

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
}

/* =========================================================
   SMALL NORMALIZE HELPER
========================================================= */

function normalize(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}
