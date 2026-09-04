import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import SchoolHome from "../pages/SchoolHome";
import Login from "../pages/Login";
import NotFound from "../pages/NotFound";

import StudentDashboard from "../pages/StudentDashboard";
import AdminDashboard from "../pages/AdminDashboard";
import TeacherManagement from "../pages/admin/TeacherManagement";
import TeacherDashboard from "../pages/TeacherDashboard";

import AddStudent from "../pages/AddStudent";
import ViewStudents from "../pages/ViewStudents";
import EditStudent from "../pages/EditStudent";
import StudentAccounts from "../pages/admin/StudentAccounts";

import AcademicConfiguration from "../pages/AcademicConfiguration";
import SubjectManagement from "../pages/SubjectManagement";

import AddResult from "../pages/AddResult";
import ViewResults from "../pages/ViewResults";
import EditResult from "../pages/EditResult";
import ResultDetails from "../pages/ResultDetails";
import PublishResults from "../pages/PublishResults";

import ExcelExport from "../pages/ExcelExport";
import ExcelImport from "../pages/ExcelImport";

import FeeManagement from "../pages/FeeManagement";
import CollectFee from "../pages/CollectFee";
import PaymentHistory from "../pages/PaymentHistory";
import FeeSettings from "../pages/FeeSettings";

import Archive from "../pages/Archive";
import Settings from "../pages/Settings";

import ProtectedAdminRoute from "./ProtectedAdminRoute";
import ProtectedStudentRoute from "./ProtectedStudentRoute";
import ProtectedTeacherRoute from "./ProtectedTeacherRoute";

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>

        {/* PUBLIC */}
        <Route path="/" element={<SchoolHome />} />
        <Route path="/login" element={<Login />} />

        {/* LEGACY LOGIN URLS — compatibility only */}
        <Route
          path="/student-login"
          element={<Navigate to="/login" replace />}
        />
        <Route
          path="/student/login"
          element={<Navigate to="/login" replace />}
        />
        <Route
          path="/studentLogin"
          element={<Navigate to="/login" replace />}
        />
        <Route
          path="/studentlogin"
          element={<Navigate to="/login" replace />}
        />
        <Route
          path="/admin-login"
          element={<Navigate to="/login" replace />}
        />
        <Route
          path="/admin/login"
          element={<Navigate to="/login" replace />}
        />

        {/* =====================================================
            STUDENT PORTAL
            Internal navigation does NOT logout.
        ===================================================== */}

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

        {/* =====================================================
            TEACHER PORTAL
        ===================================================== */}

        <Route
          path="/teacher-dashboard"
          element={
            <ProtectedTeacherRoute>
              <TeacherDashboard />
            </ProtectedTeacherRoute>
          }
        />

        <Route
          path="/teacher/dashboard"
          element={
            <ProtectedTeacherRoute>
              <TeacherDashboard />
            </ProtectedTeacherRoute>
          }
        />

        {/* =====================================================
            ADMIN PORTAL
        ===================================================== */}

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

        {/* ADMIN — TEACHERS */}
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

        {/* ADMIN — ACADEMIC */}
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

        {/* ADMIN — STUDENTS */}
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

        {/* ADMIN — RESULTS */}
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

        {/* ADMIN — EXCEL */}
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

        {/* ADMIN — FEES */}
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

        {/* ADMIN — OTHER */}
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

        {/* 404 */}
        <Route
          path="*"
          element={<NotFound />}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;
