import {
  getFunctions,
  httpsCallable,
} from "firebase/functions";

import { app } from "../../../config/firebase";


/* =========================================================
   FIREBASE FUNCTIONS
========================================================= */

const functions = getFunctions(
  app,
  "asia-south1"
);


/* =========================================================
   CALLABLE FUNCTIONS
========================================================= */

const submitResultFunction =
  httpsCallable(
    functions,
    "submitResult"
  );


const verifyResultFunction =
  httpsCallable(
    functions,
    "verifyResult"
  );


const rejectResultFunction =
  httpsCallable(
    functions,
    "rejectResult"
  );


const publishResultFunction =
  httpsCallable(
    functions,
    "publishResult"
  );


const unpublishResultFunction =
  httpsCallable(
    functions,
    "unpublishResult"
  );


/* =========================================================
   ERROR NORMALIZER
========================================================= */

function normalizeFunctionError(
  error
) {
  const code =
    error?.code ||
    "unknown";


  const message =
    error?.message ||
    "Something went wrong while processing the result.";


  const normalized =
    new Error(
      message
    );


  normalized.code =
    code;


  normalized.originalError =
    error;


  return normalized;
}


/* =========================================================
   RESULT ID VALIDATION
========================================================= */

function requireResultId(
  resultId
) {
  if (
    !resultId ||
    typeof resultId !==
      "string"
  ) {
    const error =
      new Error(
        "Valid result ID is required."
      );

    error.code =
      "INVALID_RESULT_ID";

    throw error;
  }

  return resultId.trim();
}


/* =========================================================
   SUBMIT
========================================================= */

export async function submitResult(
  resultId
) {
  const id =
    requireResultId(
      resultId
    );


  try {
    const response =
      await submitResultFunction({
        resultId:
          id,
      });


    return (
      response?.data || {
        success: true,
      }
    );
  } catch (error) {
    throw normalizeFunctionError(
      error
    );
  }
}


/* =========================================================
   VERIFY
========================================================= */

export async function verifyResult(
  resultId
) {
  const id =
    requireResultId(
      resultId
    );


  try {
    const response =
      await verifyResultFunction({
        resultId:
          id,
      });


    return (
      response?.data || {
        success: true,
      }
    );
  } catch (error) {
    throw normalizeFunctionError(
      error
    );
  }
}


/* =========================================================
   REJECT
========================================================= */

export async function rejectResult(
  resultId,
  reason
) {
  const id =
    requireResultId(
      resultId
    );


  const cleanReason =
    String(
      reason || ""
    ).trim();


  if (!cleanReason) {
    const error =
      new Error(
        "Rejection reason is required."
      );

    error.code =
      "REJECTION_REASON_REQUIRED";

    throw error;
  }


  if (
    cleanReason.length >
    1000
  ) {
    const error =
      new Error(
        "Rejection reason cannot exceed 1000 characters."
      );

    error.code =
      "REJECTION_REASON_TOO_LONG";

    throw error;
  }


  try {
    const response =
      await rejectResultFunction({
        resultId:
          id,

        reason:
          cleanReason,
      });


    return (
      response?.data || {
        success: true,
      }
    );
  } catch (error) {
    throw normalizeFunctionError(
      error
    );
  }
}


/* =========================================================
   PUBLISH
========================================================= */

export async function publishResult(
  resultId
) {
  const id =
    requireResultId(
      resultId
    );


  try {
    const response =
      await publishResultFunction({
        resultId:
          id,
      });


    return (
      response?.data || {
        success: true,
      }
    );
  } catch (error) {
    throw normalizeFunctionError(
      error
    );
  }
}


/* =========================================================
   UNPUBLISH
========================================================= */

export async function unpublishResult(
  resultId,
  reason = ""
) {
  const id =
    requireResultId(
      resultId
    );


  try {
    const response =
      await unpublishResultFunction({
        resultId:
          id,

        reason:
          String(
            reason || ""
          ).trim(),
      });


    return (
      response?.data || {
        success: true,
      }
    );
  } catch (error) {
    throw normalizeFunctionError(
      error
    );
  }
}


/* =========================================================
   WORKFLOW MAP
========================================================= */

export const resultWorkflowService =
  Object.freeze({
    submit:
      submitResult,

    verify:
      verifyResult,

    reject:
      rejectResult,

    publish:
      publishResult,

    unpublish:
      unpublishResult,
  });