import { Routes, Route, Navigate } from "react-router-dom";

import ResultDashboard from "../pages/ResultDashboard";
import ResultDetail from "../pages/ResultDetail";
import ResultMarkEntry from "../pages/ResultMarkEntry";
import StudentResultView from "../pages/StudentResultView";

import ProtectedStudentRoute from "../../../routes/ProtectedStudentRoute";


/* =========================================================
   RESULT ROUTES
========================================================= */

export default function ResultRoutes({
  actor,
}) {
  /*
   * actor should come from your AuthContext.
   *
   * Example:
   *
   * {
   *   uid: user.uid,
   *   role: "admin"
   * }
   */


  const role =
    String(
      actor?.role || ""
    ).toLowerCase();


  const isAdmin =
    role === "admin";


  const isTeacher =
    role === "teacher";


  const isStudent =
    role === "student";


  return (
    <Routes>

      {/* =================================================
          ADMIN / TEACHER DASHBOARD
      ================================================= */}

      {(isAdmin ||
        isTeacher) && (
        <Route
          path="/"
          element={
            <ResultDashboard
              actor={
                actor
              }
              onOpenResult={(
                result
              ) => {
                /*
                 * Navigation is handled
                 * by parent route/navigation.
                 */
                window.history.pushState(
                  {},
                  "",
                  `/results/${result.id}`
                );

                window.dispatchEvent(
                  new PopStateEvent(
                    "popstate"
                  )
                );
              }}
            />
          }
        />
      )}


      {/* =================================================
          RESULT DETAIL
      ================================================= */}

      {(isAdmin ||
        isTeacher) && (
        <Route
          path="/:resultId"
          element={
            <ResultDetailRoute
              actor={
                actor
              }
            />
          }
        />
      )}


      {/* =================================================
          MARK ENTRY / EDIT
      ================================================= */}

      {(isAdmin ||
        isTeacher) && (
        <Route
          path="/:resultId/edit"
          element={
            <ResultMarkEntryRoute
              actor={
                actor
              }
            />
          }
        />
      )}


      {/* =================================================
          STUDENT RESULT
      ================================================= */}

      {isStudent && (
        <Route
          path="/student/:resultId"
          element={
            <ProtectedStudentRoute>
              <StudentResultViewRoute
                actor={
                  actor
                }
              />
            </ProtectedStudentRoute>
          }
        />
      )}


      {/* =================================================
          INVALID RESULT ROUTE
      ================================================= */}

      <Route
        path="*"
        element={
          <Navigate
            to="/"
            replace
          />
        }
      />

    </Routes>
  );
}


/* =========================================================
   DETAIL ROUTE
========================================================= */

function ResultDetailRoute({
  actor,
}) {
  const resultId =
    window.location.pathname
      .split("/")
      .filter(Boolean)
      .pop();


  return (
    <ResultDetail
      actor={
        actor
      }

      resultId={
        resultId
      }

      onBack={() => {
        window.history.back();
      }}

      onEdit={(result) => {
        if (!result?.id) {
          return;
        }

        window.history.pushState(
          {},
          "",
          `/results/${result.id}/edit`
        );

        window.dispatchEvent(
          new PopStateEvent(
            "popstate"
          )
        );
      }}
    />
  );
}


/* =========================================================
   MARK ENTRY ROUTE
========================================================= */

function ResultMarkEntryRoute({
  actor,
}) {
  const parts =
    window.location.pathname
      .split("/")
      .filter(Boolean);


  const resultId =
    parts[parts.length - 2];


  return (
    <ResultMarkEntry
      actor={
        actor
      }

      resultId={
        resultId
      }

      onSaved={() => {
        window.history.back();
      }}

      onSubmitted={() => {
        window.history.pushState(
          {},
          "",
          `/results/${resultId}`
        );

        window.dispatchEvent(
          new PopStateEvent(
            "popstate"
          )
        );
      }}
    />
  );
}


/* =========================================================
   STUDENT RESULT ROUTE
========================================================= */

function StudentResultViewRoute({
  actor,
}) {
  const resultId =
    window.location.pathname
      .split("/")
      .filter(Boolean)
      .pop();


  return (
    <StudentResultView
      actor={
        actor
      }

      resultId={
        resultId
      }

      onBack={() => {
        window.history.back();
      }}
    />
  );
}