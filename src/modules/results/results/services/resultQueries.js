/* =========================================================
   FILE 20 — ADVANCED RESULT QUERY ENGINE
   =========================================================

   PURPOSE
   -------
   Centralized READ / QUERY layer for Result Module.

   Components
        ↓
   resultQueries.js
        ↓
   Firestore

   FEATURES
   --------
   ✓ Student-wise results
   ✓ Own published result
   ✓ Class-wise results
   ✓ Section-wise results
   ✓ Academic-year filtering
   ✓ Examination filtering
   ✓ Status filtering
   ✓ Teacher assigned-class queries
   ✓ Pending verification
   ✓ Published results
   ✓ Rejected results
   ✓ Draft results
   ✓ Search/filter support
   ✓ Dynamic query builder
   ✓ Pagination support
   ✓ Safe Firestore reads
   ✓ No hard-coded classes/subjects
   ✓ Firebase Auth identity check

   IMPORTANT
   ---------
   Firestore Security Rules remain the FINAL
   authorization layer.
========================================================= */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
} from "firebase/firestore";

import {
  auth,
  db,
} from "../../config/firebase";


/* =========================================================
   COLLECTION
========================================================= */

export const RESULTS_COLLECTION =
  "results";


/* =========================================================
   STATUS
========================================================= */

export const RESULT_STATUS =
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
   DEFAULT LIMITS
========================================================= */

const DEFAULT_PAGE_SIZE =
  25;

const MAX_PAGE_SIZE =
  100;


/* =========================================================
   AUTH CHECK
========================================================= */

function requireUser() {
  const user =
    auth?.currentUser;


  if (!user) {
    const error =
      new Error(
        "Authentication required."
      );

    error.code =
      "AUTH_REQUIRED";

    throw error;
  }


  return user;
}


/* =========================================================
   COLLECTION REFERENCE
========================================================= */

function resultsCollection() {
  return collection(
    db,
    RESULTS_COLLECTION
  );
}


/* =========================================================
   NORMALIZE LIMIT
========================================================= */

function normalizeLimit(
  value
) {
  const number =
    Number(value);


  if (
    !Number.isFinite(
      number
    )
  ) {
    return DEFAULT_PAGE_SIZE;
  }


  return Math.min(
    Math.max(
      Math.floor(
        number
      ),
      1
    ),
    MAX_PAGE_SIZE
  );
}


/* =========================================================
   NORMALIZE FILTER
========================================================= */

function hasValue(
  value
) {
  return (
    value !== undefined &&
    value !== null &&
    String(value).trim() !==
      ""
  );
}


/* =========================================================
   RESULT MAPPER
========================================================= */

function mapResult(
  snapshot
) {
  return {
    id:
      snapshot.id,

    ...snapshot.data(),
  };
}


/* =========================================================
   MAP SNAPSHOT
========================================================= */

function mapSnapshot(
  snapshot
) {
  return snapshot.docs.map(
    mapResult
  );
}


/* =========================================================
   BUILD RESULT QUERY
========================================================= */

export function buildResultQuery(
  filters = {},
  options = {}
) {
  const constraints = [];


  /*
   * Dynamic filters
   */

  if (
    hasValue(
      filters.studentId
    )
  ) {
    constraints.push(
      where(
        "studentId",
        "==",
        filters.studentId
      )
    );
  }


  if (
    hasValue(
      filters.studentUid
    )
  ) {
    constraints.push(
      where(
        "studentUid",
        "==",
        filters.studentUid
      )
    );
  }


  if (
    hasValue(
      filters.classId
    )
  ) {
    constraints.push(
      where(
        "classId",
        "==",
        filters.classId
      )
    );
  }


  if (
    hasValue(
      filters.className
    )
  ) {
    constraints.push(
      where(
        "className",
        "==",
        filters.className
      )
    );
  }


  if (
    hasValue(
      filters.section
    )
  ) {
    constraints.push(
      where(
        "section",
        "==",
        filters.section
      )
    );
  }


  if (
    hasValue(
      filters.academicYear
    )
  ) {
    constraints.push(
      where(
        "academicYear",
        "==",
        filters.academicYear
      )
    );
  }


  if (
    hasValue(
      filters.examinationName
    )
  ) {
    constraints.push(
      where(
        "examinationName",
        "==",
        filters.examinationName
      )
    );
  }


  if (
    hasValue(
      filters.status
    )
  ) {
    constraints.push(
      where(
        "status",
        "==",
        filters.status
      )
    );
  }


  if (
    hasValue(
      filters.createdBy
    )
  ) {
    constraints.push(
      where(
        "createdBy",
        "==",
        filters.createdBy
      )
    );
  }


  /*
   * Optional ordering.
   */

  if (
    options.orderBy
  ) {
    constraints.push(
      orderBy(
        options.orderBy,
        options.orderDirection ||
          "desc"
      )
    );
  }


  /*
   * Pagination.
   */

  if (
    options.startAfter
  ) {
    constraints.push(
      startAfter(
        options.startAfter
      )
    );
  }


  /*
   * Limit.
   */

  constraints.push(
    limit(
      normalizeLimit(
        options.limit
      )
    )
  );


  return query(
    resultsCollection(),
    ...constraints
  );
}


/* =========================================================
   GENERIC RESULT SEARCH
========================================================= */

export async function searchResults(
  filters = {},
  options = {}
) {
  requireUser();


  try {
    const resultQuery =
      buildResultQuery(
        filters,
        options
      );


    const snapshot =
      await getDocs(
        resultQuery
      );


    return {
      results:
        mapSnapshot(
          snapshot
        ),

      count:
        snapshot.size,

      lastDocument:
        snapshot.docs[
          snapshot.docs.length - 1
        ] || null,

      hasMore:
        snapshot.size >=
        normalizeLimit(
          options.limit
        ),
    };
  } catch (error) {
    throw normalizeQueryError(
      error,
      "Unable to search results."
    );
  }
}


/* =========================================================
   GET RESULT BY ID
========================================================= */

export async function getResultById(
  resultId
) {
  requireUser();


  if (!hasValue(resultId)) {
    throw createQueryError(
      "INVALID_RESULT_ID",
      "Result ID is required."
    );
  }


  try {
    const snapshot =
      await getDoc(
        doc(
          db,
          RESULTS_COLLECTION,
          resultId
        )
      );


    if (
      !snapshot.exists()
    ) {
      throw createQueryError(
        "RESULT_NOT_FOUND",
        "Result not found."
      );
    }


    return mapResult(
      snapshot
    );
  } catch (error) {
    if (
      error?.code ===
      "RESULT_NOT_FOUND"
    ) {
      throw error;
    }


    throw normalizeQueryError(
      error,
      "Unable to load result."
    );
  }
}


/* =========================================================
   STUDENT RESULTS
========================================================= */

export async function queryStudentResults(
  studentId,
  options = {}
) {
  requireUser();


  if (!hasValue(studentId)) {
    throw createQueryError(
      "INVALID_STUDENT_ID",
      "Student ID is required."
    );
  }


  return searchResults(
    {
      studentId,

      academicYear:
        options.academicYear,

      examinationName:
        options.examinationName,

      status:
        options.status,
    },
    options
  );
}


/* =========================================================
   STUDENT PUBLISHED RESULTS
========================================================= */

export async function queryStudentPublishedResults(
  studentId,
  options = {}
) {
  return queryStudentResults(
    studentId,
    {
      ...options,

      status:
        RESULT_STATUS.PUBLISHED,
    }
  );
}


/* =========================================================
   CURRENT STUDENT PUBLISHED RESULTS
========================================================= */

export async function queryOwnPublishedResults(
  options = {}
) {
  const user =
    requireUser();


  /*
   * Prefer explicit student ID
   * if available.
   */

  const studentId =
    options.studentId ||
    user.studentId;


  if (
    !hasValue(studentId)
  ) {
    throw createQueryError(
      "STUDENT_PROFILE_REQUIRED",
      "Student ID is not available in the authenticated profile."
    );
  }


  return queryStudentPublishedResults(
    studentId,
    options
  );
}


/* =========================================================
   CLASS RESULTS
========================================================= */

export async function queryClassResults(
  classId,
  options = {}
) {
  requireUser();


  if (!hasValue(classId)) {
    throw createQueryError(
      "INVALID_CLASS_ID",
      "Class ID is required."
    );
  }


  return searchResults(
    {
      classId,

      section:
        options.section,

      academicYear:
        options.academicYear,

      examinationName:
        options.examinationName,

      status:
        options.status,
    },
    options
  );
}


/* =========================================================
   SECTION RESULTS
========================================================= */

export async function querySectionResults({
  classId,
  section,
  ...options
} = {}) {
  requireUser();


  if (
    !hasValue(classId) ||
    !hasValue(section)
  ) {
    throw createQueryError(
      "INVALID_CLASS_SECTION",
      "Class and section are required."
    );
  }


  return searchResults(
    {
      classId,

      section,

      academicYear:
        options.academicYear,

      examinationName:
        options.examinationName,

      status:
        options.status,
    },
    options
  );
}


/* =========================================================
   ACADEMIC YEAR RESULTS
========================================================= */

export async function queryAcademicYearResults(
  academicYear,
  options = {}
) {
  requireUser();


  if (
    !hasValue(
      academicYear
    )
  ) {
    throw createQueryError(
      "INVALID_ACADEMIC_YEAR",
      "Academic year is required."
    );
  }


  return searchResults(
    {
      academicYear,

      classId:
        options.classId,

      section:
        options.section,

      examinationName:
        options.examinationName,

      status:
        options.status,
    },
    options
  );
}


/* =========================================================
   EXAMINATION RESULTS
========================================================= */

export async function queryExaminationResults(
  examinationName,
  options = {}
) {
  requireUser();


  if (
    !hasValue(
      examinationName
    )
  ) {
    throw createQueryError(
      "INVALID_EXAMINATION",
      "Examination name is required."
    );
  }


  return searchResults(
    {
      examinationName,

      academicYear:
        options.academicYear,

      classId:
        options.classId,

      section:
        options.section,

      status:
        options.status,
    },
    options
  );
}


/* =========================================================
   PUBLISHED RESULTS
========================================================= */

export async function queryPublishedResults(
  options = {}
) {
  return searchResults(
    {
      status:
        RESULT_STATUS.PUBLISHED,

      classId:
        options.classId,

      section:
        options.section,

      academicYear:
        options.academicYear,

      examinationName:
        options.examinationName,
    },
    options
  );
}


/* =========================================================
   DRAFT RESULTS
========================================================= */

export async function queryDraftResults(
  options = {}
) {
  return searchResults(
    {
      status:
        RESULT_STATUS.DRAFT,

      classId:
        options.classId,

      section:
        options.section,

      academicYear:
        options.academicYear,

      examinationName:
        options.examinationName,
    },
    options
  );
}


/* =========================================================
   SUBMITTED RESULTS
========================================================= */

export async function querySubmittedResults(
  options = {}
) {
  return searchResults(
    {
      status:
        RESULT_STATUS.SUBMITTED,

      classId:
        options.classId,

      section:
        options.section,

      academicYear:
        options.academicYear,

      examinationName:
        options.examinationName,
    },
    options
  );
}


/* =========================================================
   VERIFIED RESULTS
========================================================= */

export async function queryVerifiedResults(
  options = {}
) {
  return searchResults(
    {
      status:
        RESULT_STATUS.VERIFIED,

      classId:
        options.classId,

      section:
        options.section,

      academicYear:
        options.academicYear,

      examinationName:
        options.examinationName,
    },
    options
  );
}


/* =========================================================
   REJECTED RESULTS
========================================================= */

export async function queryRejectedResults(
  options = {}
) {
  return searchResults(
    {
      status:
        RESULT_STATUS.REJECTED,

      classId:
        options.classId,

      section:
        options.section,

      academicYear:
        options.academicYear,

      examinationName:
        options.examinationName,
    },
    options
  );
}


/* =========================================================
   PENDING VERIFICATION
========================================================= */

export async function queryPendingVerification(
  options = {}
) {
  return querySubmittedResults(
    options
  );
}


/* =========================================================
   TEACHER ASSIGNED CLASS RESULTS
========================================================= */

export async function queryTeacherResults({
  teacher,
  classId,
  className,
  section,
  ...options
} = {}) {
  requireUser();


  const currentUser =
    auth.currentUser;


  /*
   * Never trust a random teacher ID
   * from the UI.
   */

  const teacherUid =
    currentUser.uid;


  /*
   * If teacher profile contains
   * assigned classes, use them
   * to determine the requested class.
   */

  const assignedClasses =
    Array.isArray(
      teacher?.assignedClasses
    )
      ? teacher.assignedClasses
      : [];


  let allowedClass =
    classId ||
    className;


  if (
    assignedClasses.length
  ) {
    const normalizedRequested =
      String(
        allowedClass || ""
      )
        .trim()
        .toLowerCase();


    const match =
      assignedClasses.find(
        (item) => {
          const value =
            typeof item ===
            "string"
              ? item
              : item?.id ||
                item?.classId ||
                item?.className;


          return (
            String(
              value || ""
            )
              .trim()
              .toLowerCase() ===
            normalizedRequested
          );
        }
      );


    if (
      allowedClass &&
      !match
    ) {
      throw createQueryError(
        "CLASS_ACCESS_DENIED",
        "This class is not assigned to the teacher."
      );
    }


    if (
      !allowedClass
    ) {
      /*
       * Do not query every class.
       * Caller should request a specific
       * assigned class.
       */

      throw createQueryError(
        "CLASS_REQUIRED",
        "Teacher must select one of the assigned classes."
      );
    }
  }


  return searchResults(
    {
      classId:
        classId,

      className:
        classId
          ? null
          : className,

      section,

      academicYear:
        options.academicYear,

      examinationName:
        options.examinationName,

      status:
        options.status,

      /*
       * Useful metadata for
       * application logging.
       */

      createdBy:
        options.onlyCreatedByTeacher
          ? teacherUid
          : null,
    },
    options
  );
}


/* =========================================================
   RESULT COUNT
========================================================= */

export async function countResults(
  filters = {}
) {
  const response =
    await searchResults(
      filters,
      {
        limit:
          MAX_PAGE_SIZE,
      }
    );


  return response.count;
}


/* =========================================================
   CHECK RESULT EXISTS
========================================================= */

export async function doesResultExist(
  filters = {}
) {
  const response =
    await searchResults(
      filters,
      {
        limit: 1,
      }
    );


  return (
    response.results.length >
    0
  );
}


/* =========================================================
   FIND SINGLE RESULT
========================================================= */

export async function findSingleResult(
  filters = {}
) {
  const response =
    await searchResults(
      filters,
      {
        limit: 1,
      }
    );


  return (
    response.results[0] ||
    null
  );
}


/* =========================================================
   FIND RESULT FOR EXAM
========================================================= */

export async function findStudentExamResult({
  studentId,
  academicYear,
  examinationName,
} = {}) {
  if (
    !hasValue(studentId) ||
    !hasValue(academicYear) ||
    !hasValue(examinationName)
  ) {
    throw createQueryError(
      "INVALID_RESULT_LOOKUP",
      "Student, academic year and examination are required."
    );
  }


  return findSingleResult({
    studentId,

    academicYear,

    examinationName,
  });
}


/* =========================================================
   RESULT STATISTICS
========================================================= */

export async function getResultStatistics(
  filters = {}
) {
  const [
    draft,
    submitted,
    verified,
    rejected,
    published,
  ] =
    await Promise.all([
      queryDraftResults(
        filters
      ),

      querySubmittedResults(
        filters
      ),

      queryVerifiedResults(
        filters
      ),

      queryRejectedResults(
        filters
      ),

      queryPublishedResults(
        filters
      ),
    ]);


  return {
    draft:
      draft.count,

    submitted:
      submitted.count,

    verified:
      verified.count,

    rejected:
      rejected.count,

    published:
      published.count,

    total:
      draft.count +
      submitted.count +
      verified.count +
      rejected.count +
      published.count,
  };
}


/* =========================================================
   CLASS RESULT DASHBOARD
========================================================= */

export async function getClassResultDashboard(
  classId,
  options = {}
) {
  const [
    all,
    draft,
    submitted,
    verified,
    rejected,
    published,
  ] =
    await Promise.all([
      queryClassResults(
        classId,
        options
      ),

      queryDraftResults({
        ...options,
        classId,
      }),

      querySubmittedResults({
        ...options,
        classId,
      }),

      queryVerifiedResults({
        ...options,
        classId,
      }),

      queryRejectedResults({
        ...options,
        classId,
      }),

      queryPublishedResults({
        ...options,
        classId,
      }),
    ]);


  return {
    total:
      all.count,

    draft:
      draft.count,

    submitted:
      submitted.count,

    verified:
      verified.count,

    rejected:
      rejected.count,

    published:
      published.count,

    results:
      all.results,
  };
}


/* =========================================================
   PAGINATION HELPER
========================================================= */

export async function getNextResultPage(
  previousResponse,
  filters = {},
  options = {}
) {
  if (
    !previousResponse
      ?.lastDocument
  ) {
    return {
      results: [],

      count: 0,

      lastDocument: null,

      hasMore: false,
    };
  }


  return searchResults(
    filters,
    {
      ...options,

      startAfter:
        previousResponse
          .lastDocument,
    }
  );
}


/* =========================================================
   SAFE SEARCH
========================================================= */

/*
 * Firestore does not provide SQL-style
 * "contains" search natively.

 * Therefore this function intentionally
 * does NOT download the entire database
 * and filter sensitive data in the browser.

 * Search should be implemented using
 * indexed fields or a dedicated search
 * service when required.
 */

export async function searchByStudentRollNumber(
  rollNumber,
  options = {}
) {
  requireUser();


  if (
    !hasValue(
      rollNumber
    )
  ) {
    return {
      results: [],
      count: 0,
      lastDocument: null,
      hasMore: false,
    };
  }


  return searchResults(
    {
      rollNumber:
        String(
          rollNumber
        ).trim(),
    },
    options
  );
}


/* =========================================================
   ERROR HELPERS
========================================================= */

function createQueryError(
  code,
  message
) {
  const error =
    new Error(
      message
    );

  error.code =
    code;

  return error;
}


function normalizeQueryError(
  error,
  fallbackMessage
) {
  /*
   * Preserve known application errors.
   */

  if (
    error?.code &&
    [
      "RESULT_NOT_FOUND",
      "INVALID_RESULT_ID",
      "INVALID_STUDENT_ID",
      "INVALID_CLASS_ID",
      "INVALID_CLASS_SECTION",
      "INVALID_ACADEMIC_YEAR",
      "INVALID_EXAMINATION",
      "CLASS_ACCESS_DENIED",
      "CLASS_REQUIRED",
      "STUDENT_PROFILE_REQUIRED",
    ].includes(
      error.code
    )
  ) {
    return error;
  }


  /*
   * Firebase permission error.
   */

  if (
    error?.code ===
      "permission-denied" ||
    error?.code ===
      "PERMISSION_DENIED"
  ) {
    return createQueryError(
      "PERMISSION_DENIED",
      "You do not have permission to access these results."
    );
  }


  return createQueryError(
    "QUERY_FAILED",
    fallbackMessage
  );
}


/* =========================================================
   QUERY CONFIGURATION
========================================================= */

export function getQueryConfiguration() {
  return {
    collection:
      RESULTS_COLLECTION,

    defaultPageSize:
      DEFAULT_PAGE_SIZE,

    maximumPageSize:
      MAX_PAGE_SIZE,

    dynamicFilters: [
      "studentId",
      "studentUid",
      "classId",
      "className",
      "section",
      "academicYear",
      "examinationName",
      "status",
      "createdBy",
    ],

    supportedStatuses:
      Object.values(
        RESULT_STATUS
      ),

    pagination:
      true,

    serverSideFiltering:
      true,

    clientSideSensitiveFiltering:
      false,
  };
}


/* =========================================================
   DEFAULT EXPORT
========================================================= */

export default {
  RESULTS_COLLECTION,
  RESULT_STATUS,

  buildResultQuery,
  searchResults,

  getResultById,

  queryStudentResults,
  queryStudentPublishedResults,
  queryOwnPublishedResults,

  queryClassResults,
  querySectionResults,

  queryAcademicYearResults,
  queryExaminationResults,

  queryPublishedResults,
  queryDraftResults,
  querySubmittedResults,
  queryVerifiedResults,
  queryRejectedResults,

  queryPendingVerification,

  queryTeacherResults,

  countResults,
  doesResultExist,
  findSingleResult,
  findStudentExamResult,

  getResultStatistics,
  getClassResultDashboard,

  getNextResultPage,

  searchByStudentRollNumber,

  getQueryConfiguration,
};