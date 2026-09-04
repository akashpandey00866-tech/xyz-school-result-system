const {
  onCall,
  HttpsError,
} = require("firebase-functions/v2/https");

const {
  getFirestore,
  FieldValue,
} = require("firebase-admin/firestore");

const {
  getAuth,
} = require("firebase-admin/auth");

const {
  initializeApp,
} = require("firebase-admin/app");


/* =========================================================
   INITIALIZE
========================================================= */

initializeApp();


const db =
  getFirestore();

const auth =
  getAuth();


/* =========================================================
   CONSTANTS
========================================================= */

const RESULT_STATUS = Object.freeze({
  DRAFT: "draft",
  SUBMITTED: "submitted",
  VERIFIED: "verified",
  REJECTED: "rejected",
  PUBLISHED: "published",
});


const AUDIT_ACTIONS = Object.freeze([
  "CREATE",
  "UPDATE",
  "SUBMIT",
  "VERIFY",
  "REJECT",
  "PUBLISH",
  "UNPUBLISH",
]);


/* =========================================================
   HELPERS
========================================================= */

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


function requireAuthenticated(
  request
) {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "Authentication is required."
    );
  }
}


function requireAdmin(
  request
) {
  requireAuthenticated(
    request
  );


  if (
    request.auth.token?.role !==
    "admin"
  ) {
    throw new HttpsError(
      "permission-denied",
      "Only Admin can access result audit."
    );
  }
}


function validateAction(
  action
) {
  const normalized =
    cleanString(
      action
    ).toUpperCase();


  if (
    !AUDIT_ACTIONS.includes(
      normalized
    )
  ) {
    throw new HttpsError(
      "invalid-argument",
      "Invalid audit action."
    );
  }


  return normalized;
}


/* =========================================================
   WRITE RESULT AUDIT
========================================================= */

exports.writeResultAudit =
  onCall(
    {
      region: "asia-south1",

      /*
       * Keep audit creation on trusted
       * backend.
       */
      enforceAppCheck: false,
    },

    async (request) => {
      requireAuthenticated(
        request
      );


      const {
        resultId,
        action,
        fromStatus = null,
        toStatus = null,
        reason = "",
      } =
        request.data || {};


      const safeResultId =
        cleanString(
          resultId
        );


      if (
        !safeResultId
      ) {
        throw new HttpsError(
          "invalid-argument",
          "Result ID is required."
        );
      }


      const safeAction =
        validateAction(
          action
        );


      /* -----------------------------------------------
         LOAD RESULT
      ------------------------------------------------ */

      const resultRef =
        db
          .collection(
            "results"
          )
          .doc(
            safeResultId
          );


      const resultSnapshot =
        await resultRef.get();


      if (
        !resultSnapshot.exists
      ) {
        throw new HttpsError(
          "not-found",
          "Result not found."
        );
      }


      const result =
        resultSnapshot.data();


      const actorRole =
        cleanString(
          request.auth.token?.role
        ).toLowerCase();


      /* -----------------------------------------------
         AUTHORIZE AUDIT ACTION
      ------------------------------------------------ */

      /*
       * Admin workflow actions.
       */

      const adminActions =
        [
          "VERIFY",
          "REJECT",
          "PUBLISH",
          "UNPUBLISH",
        ];


      if (
        adminActions.includes(
          safeAction
        ) &&
        actorRole !==
          "admin"
      ) {
        throw new HttpsError(
          "permission-denied",
          "Only Admin can create this audit event."
        );
      }


      /*
       * Teacher actions.
       */

      const teacherActions =
        [
          "CREATE",
          "UPDATE",
          "SUBMIT",
        ];


      if (
        teacherActions.includes(
          safeAction
        )
      ) {
        if (
          actorRole !==
          "teacher" &&
          actorRole !==
          "admin"
        ) {
          throw new HttpsError(
            "permission-denied",
            "You are not allowed to create this audit event."
          );
        }


        /*
         * Teacher can audit only
         * their assigned result.
         */

        if (
          actorRole ===
            "teacher" &&
          result.teacherId !==
            request.auth.uid
        ) {
          throw new HttpsError(
            "permission-denied",
            "This result is not assigned to you."
          );
        }
      }


      /* -----------------------------------------------
         STATUS VALIDATION
      ------------------------------------------------ */

      if (
        fromStatus !==
          null &&
        !Object.values(
          RESULT_STATUS
        ).includes(
          cleanString(
            fromStatus
          )
        )
      ) {
        throw new HttpsError(
          "invalid-argument",
          "Invalid previous result status."
        );
      }


      if (
        toStatus !==
          null &&
        !Object.values(
          RESULT_STATUS
        ).includes(
          cleanString(
            toStatus
          )
        )
      ) {
        throw new HttpsError(
          "invalid-argument",
          "Invalid new result status."
        );
      }


      /* -----------------------------------------------
         AUDIT DOCUMENT
      ------------------------------------------------ */

      const auditData = {
        resultId:
          safeResultId,

        actorUid:
          request.auth.uid,

        actorRole,

        action:
          safeAction,

        fromStatus:
          fromStatus
            ? cleanString(
                fromStatus
              )
            : null,

        toStatus:
          toStatus
            ? cleanString(
                toStatus
              )
            : null,

        reason:
          cleanString(
            reason
          ),

        createdAt:
          FieldValue.serverTimestamp(),
      };


      const auditRef =
        await db
          .collection(
            "resultAudit"
          )
          .add(
            auditData
          );


      return {
        success: true,

        auditId:
          auditRef.id,
      };
    }
  );


/* =========================================================
   GET RESULT AUDIT
========================================================= */

exports.getResultAudit =
  onCall(
    {
      region: "asia-south1",
      enforceAppCheck: false,
    },

    async (request) => {
      requireAdmin(
        request
      );


      const resultId =
        cleanString(
          request.data?.resultId
        );


      if (
        !resultId
      ) {
        throw new HttpsError(
          "invalid-argument",
          "Result ID is required."
        );
      }


      const resultSnapshot =
        await db
          .collection(
            "results"
          )
          .doc(
            resultId
          )
          .get();


      if (
        !resultSnapshot.exists
      ) {
        throw new HttpsError(
          "not-found",
          "Result not found."
        );
      }


      const snapshot =
        await db
          .collection(
            "resultAudit"
          )
          .where(
            "resultId",
            "==",
            resultId
          )
          .orderBy(
            "createdAt",
            "desc"
          )
          .limit(100)
          .get();


      return {
        success: true,

        items:
          snapshot.docs.map(
            (item) => ({
              id:
                item.id,

              ...item.data(),
            })
          ),
      };
    }
  );