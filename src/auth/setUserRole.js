const {
  onCall,
  HttpsError,
} = require("firebase-functions/v2/https");

const {
  getAuth,
} = require("firebase-admin/auth");

const {
  getFirestore,
  FieldValue,
} = require("firebase-admin/firestore");

const {
  initializeApp,
} = require("firebase-admin/app");


/* =========================================================
   INITIALIZE FIREBASE ADMIN
========================================================= */

initializeApp();


const auth =
  getAuth();

const db =
  getFirestore();


/* =========================================================
   ROLES
========================================================= */

const ROLES = Object.freeze({
  ADMIN: "admin",
  TEACHER: "teacher",
  STUDENT: "student",
});


const ALLOWED_ROLES =
  new Set(
    Object.values(
      ROLES
    )
  );


/* =========================================================
   HELPERS
========================================================= */

function normalizeRole(
  role
) {
  const normalized =
    String(
      role || ""
    )
      .trim()
      .toLowerCase();


  return ALLOWED_ROLES.has(
    normalized
  )
    ? normalized
    : null;
}


function requireAdmin(
  request
) {
  if (
    !request.auth
  ) {
    throw new HttpsError(
      "unauthenticated",
      "Authentication is required."
    );
  }


  const callerRole =
    normalizeRole(
      request.auth.token?.role
    );


  if (
    callerRole !==
    ROLES.ADMIN
  ) {
    throw new HttpsError(
      "permission-denied",
      "Only Admin can manage account roles."
    );
  }
}


function cleanString(
  value
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(
    value
  ).trim();
}


/* =========================================================
   SET USER ROLE
========================================================= */

exports.setUserRole =
  onCall(
    {
      region: "asia-south1",

      /*
       * Keep this function protected.
       */

      enforceAppCheck: false,
    },

    async (request) => {
      requireAdmin(
        request
      );


      const uid =
        cleanString(
          request.data?.uid
        );

      const role =
        normalizeRole(
          request.data?.role
        );


      if (!uid) {
        throw new HttpsError(
          "invalid-argument",
          "User UID is required."
        );
      }


      if (!role) {
        throw new HttpsError(
          "invalid-argument",
          "A valid role is required."
        );
      }


      /*
       * Prevent Admin from accidentally
       * changing their own role through
       * this function.
       */

      if (
        uid ===
        request.auth.uid
      ) {
        throw new HttpsError(
          "failed-precondition",
          "You cannot change your own role."
        );
      }


      /* -----------------------------------------------
         VERIFY TARGET USER
      ------------------------------------------------ */

      let targetUser;

      try {
        targetUser =
          await auth.getUser(
            uid
          );
      } catch (
        error
      ) {
        if (
          error?.code ===
          "auth/user-not-found"
        ) {
          throw new HttpsError(
            "not-found",
            "Target user does not exist."
          );
        }

        throw new HttpsError(
          "internal",
          "Unable to load target user."
        );
      }


      /* -----------------------------------------------
         EXISTING CLAIMS
      ------------------------------------------------ */

      const existingClaims =
        targetUser.customClaims ||
        {};


      /*
       * Preserve unrelated custom claims.
       */

      const nextClaims = {
        ...existingClaims,

        role,
      };


      /* -----------------------------------------------
         SET FIREBASE CLAIM
      ------------------------------------------------ */

      await auth.setCustomUserClaims(
        uid,
        nextClaims
      );


      /* -----------------------------------------------
         SYNC PROFILE
      ------------------------------------------------ */

      await db
        .collection(
          "users"
        )
        .doc(uid)
        .set(
          {
            role,

            roleUpdatedAt:
              FieldValue.serverTimestamp(),

            roleUpdatedBy:
              request.auth.uid,
          },

          {
            merge: true,
          }
        );


      /* -----------------------------------------------
         AUDIT
      ------------------------------------------------ */

      await db
        .collection(
          "roleAudit"
        )
        .add(
          {
            targetUid:
              uid,

            targetEmail:
              targetUser.email ||
              null,

            previousRole:
              normalizeRole(
                existingClaims.role
              ),

            newRole:
              role,

            changedBy:
              request.auth.uid,

            changedByRole:
              ROLES.ADMIN,

            createdAt:
              FieldValue.serverTimestamp(),
          }
        );


      return {
        success: true,

        uid,

        role,
      };
    }
  );