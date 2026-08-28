import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

/* =========================================================
   PUBLIC
========================================================= */

import SchoolHome from "../pages/SchoolHome";
import Login from "../pages/Login";
import NotFound from "../pages/NotFound";

/* =========================================================
   STUDENT
========================================================= */

import StudentDashboard from "../pages/StudentDashboard";

/* =========================================================
   ADMIN
========================================================= */

import AdminDashboard from "../pages/AdminDashboard";
import TeacherManagement from "../pages/admin/TeacherManagement";

/* =========================================================
   TEACHER
========================================================= */

import TeacherDashboard from "../pages/TeacherDashboard";

/* =========================================================
   STUDENTS
========================================================= */

import AddStudent from "../pages/AddStudent";
import ViewStudents from "../pages/ViewStudents";
import EditStudent from "../pages/EditStudent";
import StudentAccounts from "../pages/admin/StudentAccounts";

/* =========================================================
   ACADEMIC
========================================================= */

import AcademicConfiguration from "../pages/AcademicConfiguration";
import SubjectManagement from "../pages/SubjectManagement";

/* =========================================================
   RESULTS
========================================================= */

import AddResult from "../pages/AddResult";
import ViewResults from "../pages/ViewResults";
import EditResult from "../pages/EditResult";
import ResultDetails from "../pages/ResultDetails";
import PublishResults from "../pages/PublishResults";

/* =========================================================
   EXCEL
========================================================= */

import ExcelExport from "../pages/ExcelExport";
import ExcelImport from "../pages/ExcelImport";

/* =========================================================
   FEES
========================================================= */

import FeeManagement from "../pages/FeeManagement";
import CollectFee from "../pages/CollectFee";
import PaymentHistory from "../pages/PaymentHistory";
import FeeSettings from "../pages/FeeSettings";

/* =========================================================
   OTHER
========================================================= */

import Archive from "../pages/Archive";
import Settings from "../pages/Settings";

/* =========================================================
   SECURITY
========================================================= */

import ProtectedAdminRoute from "./ProtectedAdminRoute";
import ProtectedStudentRoute from "./ProtectedStudentRoute";

/*
  IMPORTANT:
  Teacher currently has no dedicated ProtectedTeacherRoute
  in the existing project structure supplied to us, so the
  existing Teacher routes are preserved unchanged here.

  Once a ProtectedTeacherRoute is present, these two routes
  can be wrapped without changing the rest of the app.
*/

/* =========================================================
   APP ROUTES
========================================================= */

function AppRoutes() {
  return (
    <BrowserRouter>

      <Routes>

        {/* =================================================
            PUBLIC HOME
            NEW SCHOOL FRONTEND
        ================================================= */}

        <Route
          path="/"
          element={
            <SchoolHome />
          }
        />

        {/* =================================================
            CENTRAL LOGIN
            ONLY LOGIN PAGE
        ================================================= */}

        <Route
          path="/login"
          element={
            <Login />
          }
        />

        {/* =================================================
            LEGACY LOGIN URLS
            Redirect to the new central login.
            Old panels are no longer rendered.
        ================================================= */}

        <Route
          path="/student-login"
          element={
            <Navigate
              to="/login"
              replace
            />
          }
        />

        <Route
          path="/student/login"
          element={
            <Navigate
              to="/login"
              replace
            />
          }
        />

        <Route
          path="/studentLogin"
          element={
            <Navigate
              to="/login"
              replace
            />
          }
        />

        <Route
          path="/studentlogin"
          element={
            <Navigate
              to="/login"
              replace
            />
          }
        />

        <Route
          path="/admin-login"
          element={
            <Navigate
              to="/login"
              replace
            />
          }
        />

        <Route
          path="/admin/login"
          element={
            <Navigate
              to="/login"
              replace
            />
          }
        />

        {/* =================================================
            STUDENT DASHBOARD
        ================================================= */}

        <Route
          path="/student-dashboard"
          element={
            <ProtectedStudentRoute>
              <StudentDashboard />
            </ProtectedStudentRoute>
          }
        />

        <Route
          path="/student/dashboard"
          element={
            <ProtectedStudentRoute>
              <StudentDashboard />
            </ProtectedStudentRoute>
          }
        />

        <Route
          path="/student/result"
          element={
            <ProtectedStudentRoute>
              <StudentDashboard />
            </ProtectedStudentRoute>
          }
        />

        <Route
          path="/student/fees"
          element={
            <ProtectedStudentRoute>
              <StudentDashboard />
            </ProtectedStudentRoute>
          }
        />

        {/* =================================================
            TEACHER DASHBOARD
            Existing routes preserved
        ================================================= */}

        <Route
          path="/teacher-dashboard"
          element={
            <TeacherDashboard />
          }
        />

        <Route
          path="/teacher/dashboard"
          element={
            <TeacherDashboard />
          }
        />

        {/* =================================================
            ADMIN DASHBOARD
        ================================================= */}

        <Route
          path="/admin-dashboard"
          element={
            <ProtectedAdminRoute>
              <AdminDashboard />
            </ProtectedAdminRoute>
          }
        />

        <Route
          path="/admin/dashboard"
          element={
            <ProtectedAdminRoute>
              <AdminDashboard />
            </ProtectedAdminRoute>
          }
        />

        {/* =================================================
            TEACHER MANAGEMENT
            ADMIN ONLY
        ================================================= */}

        <Route
          path="/teacher-management"
          element={
            <ProtectedAdminRoute>
              <TeacherManagement />
            </ProtectedAdminRoute>
          }
        />

        <Route
          path="/admin/teachers"
          element={
            <ProtectedAdminRoute>
              <TeacherManagement />
            </ProtectedAdminRoute>
          }
        />

        {/* =================================================
            ACADEMIC
            ADMIN ONLY
        ================================================= */}

        <Route
          path="/academic-configuration"
          element={
            <ProtectedAdminRoute>
              <AcademicConfiguration />
            </ProtectedAdminRoute>
          }
        />

        <Route
          path="/subject-management"
          element={
            <ProtectedAdminRoute>
              <SubjectManagement />
            </ProtectedAdminRoute>
          }
        />

        {/* =================================================
            STUDENTS
            ADMIN ONLY
        ================================================= */}

        <Route
          path="/students"
          element={
            <ProtectedAdminRoute>
              <ViewStudents />
            </ProtectedAdminRoute>
          }
        />

        <Route
          path="/view-students"
          element={
            <ProtectedAdminRoute>
              <ViewStudents />
            </ProtectedAdminRoute>
          }
        />

        <Route
          path="/students/add"
          element={
            <ProtectedAdminRoute>
              <AddStudent />
            </ProtectedAdminRoute>
          }
        />

        <Route
          path="/add-student"
          element={
            <ProtectedAdminRoute>
              <AddStudent />
            </ProtectedAdminRoute>
          }
        />

        <Route
          path="/edit-student/:id"
          element={
            <ProtectedAdminRoute>
              <EditStudent />
            </ProtectedAdminRoute>
          }
        />

        <Route
          path="/student-accounts"
          element={
            <ProtectedAdminRoute>
              <StudentAccounts />
            </ProtectedAdminRoute>
          }
        />

        {/* =================================================
            RESULTS
            ADMIN ONLY
        ================================================= */}

        <Route
          path="/add-result"
          element={
            <ProtectedAdminRoute>
              <AddResult />
            </ProtectedAdminRoute>
          }
        />

        <Route
          path="/view-results"
          element={
            <ProtectedAdminRoute>
              <ViewResults />
            </ProtectedAdminRoute>
          }
        />

        <Route
          path="/edit-result/:id"
          element={
            <ProtectedAdminRoute>
              <EditResult />
            </ProtectedAdminRoute>
          }
        />

        <Route
          path="/result/:id"
          element={
            <ProtectedAdminRoute>
              <ResultDetails />
            </ProtectedAdminRoute>
          }
        />

        <Route
          path="/publish-results"
          element={
            <ProtectedAdminRoute>
              <PublishResults />
            </ProtectedAdminRoute>
          }
        />

        {/* =================================================
            EXCEL
            ADMIN ONLY
        ================================================= */}

        <Route
          path="/excel-export"
          element={
            <ProtectedAdminRoute>
              <ExcelExport />
            </ProtectedAdminRoute>
          }
        />

        <Route
          path="/excel-import"
          element={
            <ProtectedAdminRoute>
              <ExcelImport />
            </ProtectedAdminRoute>
          }
        />

        {/* =================================================
            FEES
            ADMIN ONLY
        ================================================= */}

        <Route
          path="/fees"
          element={
            <ProtectedAdminRoute>
              <FeeManagement />
            </ProtectedAdminRoute>
          }
        />

        <Route
          path="/fee-management"
          element={
            <ProtectedAdminRoute>
              <FeeManagement />
            </ProtectedAdminRoute>
          }
        />

        <Route
          path="/collect-fee/:id"
          element={
            <ProtectedAdminRoute>
              <CollectFee />
            </ProtectedAdminRoute>
          }
        />

        <Route
          path="/payment-history/:id"
          element={
            <ProtectedAdminRoute>
              <PaymentHistory />
            </ProtectedAdminRoute>
          }
        />

        <Route
          path="/fee-settings"
          element={
            <ProtectedAdminRoute>
              <FeeSettings />
            </ProtectedAdminRoute>
          }
        />

        {/* =================================================
            OTHER
            ADMIN ONLY
        ================================================= */}

        <Route
          path="/archive"
          element={
            <ProtectedAdminRoute>
              <Archive />
            </ProtectedAdminRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedAdminRoute>
              <Settings />
            </ProtectedAdminRoute>
          }
        />

        {/* =================================================
            404
        ================================================= */}

        <Route
          path="*"
          element={
            <NotFound />
          }
        />

      </Routes>

    </BrowserRouter>
  );
}

export default AppRoutes;
