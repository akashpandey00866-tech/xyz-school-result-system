const {
  onCall,
  HttpsError,
} = require("firebase-functions/v2/https");

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

const db = getFirestore();


/* =========================================================
   CONSTANTS
========================================================= */

const STATUS = Object.freeze({
  DRAFT: "draft",
  SUBMITTED: "submitted",
  VERIFIED: "verified",
  REJECTED: "rejected",
  PUBLISHED: "published",
});


/* =========================================================
   HELPERS
========================================================= */

function requireAuth(request) {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "Authentication is required."
    );
  }
}


function requireAdmin(request) {
  requireAuth(request);

  if (
    request.auth.token?.role !==
    "admin"
  ) {
    throw new HttpsError(
      "permission-denied",
      "Only Admin can perform this action."
    );
  }
}


function requireTeacher(request) {
  requireAuth(request);

  if (
    request.auth.token?.role !==
    "teacher"
  ) {
    throw new HttpsError(
      "permission-denied",
      "Only Teacher can perform this action."
    );
  }
}


function cleanString(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value).trim();
}


function getResultRef(resultId) {
  const id = cleanString(resultId);

  if (!id) {
    throw new HttpsError(
      "invalid-argument",
      "Result ID is required."
    );
  }

  return db
    .collection("results")
    .doc(id);
}


async function getResult(resultId) {
  const ref =
    getResultRef(resultId);

  const snapshot =
    await ref.get();

  if (!snapshot.exists) {
    throw new HttpsError(
      "not-found",
      "Result not found."
    );
  }

  return {
    ref,
    data: snapshot.data(),
  };
}


/* =========================================================
   AUDIT
========================================================= */

function addAudit(
  batch,
  {
    resultId,
    actor,
    action,
    fromStatus,
    toStatus,
    reason = "",
  }
) {
  const auditRef =
    db
      .collection("resultAudit")
      .doc();

  batch.set(
    auditRef,
    {
      resultId,

      actorUid:
        actor.uid,

      actorRole:
        actor.token?.role ||
        "",

      action,

      fromStatus:
        fromStatus || null,

      toStatus:
        toStatus || null,

      reason:
        cleanString(reason),

      createdAt:
        FieldValue.serverTimestamp(),
    }
  );
}


/* =========================================================
   VERIFY
========================================================= */

exports.verifyResult =
  onCall(
    {
      region: "asia-south1",
    },

    async (request) => {
      requireAdmin(request);

      const resultId =
        cleanString(
          request.data?.resultId
        );

      const {
        ref,
        data,
      } =
        await getResult(
          resultId
        );


      if (
        data.status !==
        STATUS.SUBMITTED
      ) {
        throw new HttpsError(
          "failed-precondition",
          "Only submitted results can be verified."
        );
      }


      const batch =
        db.batch();


      batch.update(
        ref,
        {
          status:
            STATUS.VERIFIED,

          verifiedBy:
            request.auth.uid,

          verifiedAt:
            FieldValue.serverTimestamp(),

          updatedAt:
            FieldValue.serverTimestamp(),

          version:
            Number(
              data.version || 0
            ) + 1,
        }
      );


      addAudit(
        batch,
        {
          resultId,

          actor:
            request.auth,

          action:
            "VERIFY",

          fromStatus:
            data.status,

          toStatus:
            STATUS.VERIFIED,
        }
      );


      await batch.commit();


      return {
        success: true,

        status:
          STATUS.VERIFIED,
      };
    }
  );


/* =========================================================
   REJECT
========================================================= */

exports.rejectResult =
  onCall(
    {
      region: "asia-south1",
    },

    async (request) => {
      requireAdmin(request);


      const resultId =
        cleanString(
          request.data?.resultId
        );

      const reason =
        cleanString(
          request.data?.reason
        );


      if (!reason) {
        throw new HttpsError(
          "invalid-argument",
          "Rejection reason is required."
        );
      }


      if (
        reason.length >
        1000
      ) {
        throw new HttpsError(
          "invalid-argument",
          "Rejection reason cannot exceed 1000 characters."
        );
      }


      const {
        ref,
        data,
      } =
        await getResult(
          resultId
        );


      if (
        data.status !==
        STATUS.SUBMITTED
      ) {
        throw new HttpsError(
          "failed-precondition",
          "Only submitted results can be rejected."
        );
      }


      const batch =
        db.batch();


      batch.update(
        ref,
        {
          status:
            STATUS.REJECTED,

          rejectionReason:
            reason,

          rejectedBy:
            request.auth.uid,

          rejectedAt:
            FieldValue.serverTimestamp(),

          updatedAt:
            FieldValue.serverTimestamp(),

          version:
            Number(
              data.version || 0
            ) + 1,
        }
      );


      addAudit(
        batch,
        {
          resultId,

          actor:
            request.auth,

          action:
            "REJECT",

          fromStatus:
            data.status,

          toStatus:
            STATUS.REJECTED,

          reason,
        }
      );


      await batch.commit();


      return {
        success: true,

        status:
          STATUS.REJECTED,
      };
    }
  );


/* =========================================================
   PUBLISH
========================================================= */

exports.publishResult =
  onCall(
    {
      region: "asia-south1",
    },

    async (request) => {
      requireAdmin(request);


      const resultId =
        cleanString(
          request.data?.resultId
        );


      const {
        ref,
        data,
      } =
        await getResult(
          resultId
        );


      /*
       * Publish is intentionally
       * allowed ONLY after verification.
       */

      if (
        data.status !==
        STATUS.VERIFIED
      ) {
        throw new HttpsError(
          "failed-precondition",
          "Only verified results can be published."
        );
      }


      const batch =
        db.batch();


      batch.update(
        ref,
        {
          status:
            STATUS.PUBLISHED,

          publishedBy:
            request.auth.uid,

          publishedAt:
            FieldValue.serverTimestamp(),

          updatedAt:
            FieldValue.serverTimestamp(),

          version:
            Number(
              data.version || 0
            ) + 1,
        }
      );


      addAudit(
        batch,
        {
          resultId,

          actor:
            request.auth,

          action:
            "PUBLISH",

          fromStatus:
            data.status,

          toStatus:
            STATUS.PUBLISHED,
        }
      );


      await batch.commit();


      return {
        success: true,

        status:
          STATUS.PUBLISHED,
      };
    }
  );


/* =========================================================
   UNPUBLISH
========================================================= */

exports.unpublishResult =
  onCall(
    {
      region: "asia-south1",
    },

    async (request) => {
      requireAdmin(request);


      const resultId =
        cleanString(
          request.data?.resultId
        );

      const reason =
        cleanString(
          request.data?.reason
        );


      const {
        ref,
        data,
      } =
        await getResult(
          resultId
        );


      if (
        data.status !==
        STATUS.PUBLISHED
      ) {
        throw new HttpsError(
          "failed-precondition",
          "Only published results can be unpublished."
        );
      }


      const batch =
        db.batch();


      batch.update(
        ref,
        {
          status:
            STATUS.VERIFIED,

          unpublishedBy:
            request.auth.uid,

          unpublishedAt:
            FieldValue.serverTimestamp(),

          unpublishReason:
            reason,

          updatedAt:
            FieldValue.serverTimestamp(),

          version:
            Number(
              data.version || 0
            ) + 1,
        }
      );


      addAudit(
        batch,
        {
          resultId,

          actor:
            request.auth,

          action:
            "UNPUBLISH",

          fromStatus:
            data.status,

          toStatus:
            STATUS.VERIFIED,

          reason,
        }
      );


      await batch.commit();


      return {
        success: true,

        status:
          STATUS.VERIFIED,
      };
    }
  );


/* =========================================================
   SUBMIT
========================================================= */

exports.submitResult =
  onCall(
    {
      region: "asia-south1",
    },

    async (request) => {
      requireTeacher(request);


      const resultId =
        cleanString(
          request.data?.resultId
        );


      const {
        ref,
        data,
      } =
        await getResult(
          resultId
        );


      /*
       * Teacher can only submit
       * their assigned result.
       */

      if (
        data.teacherId !==
        request.auth.uid
      ) {
        throw new HttpsError(
          "permission-denied",
          "This result is not assigned to you."
        );
      }


      if (
        data.status !==
          STATUS.DRAFT &&
        data.status !==
          STATUS.REJECTED
      ) {
        throw new HttpsError(
          "failed-precondition",
          "This result cannot be submitted in its current state."
        );
      }


      const batch =
        db.batch();


      batch.update(
        ref,
        {
          status:
            STATUS.SUBMITTED,

          submittedBy:
            request.auth.uid,

          submittedAt:
            FieldValue.serverTimestamp(),

          updatedAt:
            FieldValue.serverTimestamp(),

          version:
            Number(
              data.version || 0
            ) + 1,
        }
      );


      addAudit(
        batch,
        {
          resultId,

          actor:
            request.auth,

          action:
            "SUBMIT",

          fromStatus:
            data.status,

          toStatus:
            STATUS.SUBMITTED,
        }
      );


      await batch.commit();


      return {
        success: true,

        status:
          STATUS.SUBMITTED,
      };
    }
  );