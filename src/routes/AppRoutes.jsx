import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

/* =========================================================
   PUBLIC
========================================================= */

import Home from "../pages/Home";
import StudentLogin from "../pages/StudentLogin";
import StudentDashboard from "../pages/StudentDashboard";
import AdminLogin from "../pages/AdminLogin";
import NotFound from "../pages/NotFound";

/* =========================================================
   ADMIN
========================================================= */

import AdminDashboard from "../pages/AdminDashboard";

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

import ProtectedAdminRoute from "./ProtectedAdminRoute";


function AppRoutes() {

  return (

    <BrowserRouter>

      <Routes>

        {/* =================================================
            PUBLIC
        ================================================= */}

        <Route
          path="/"
          element={<Home />}
        />

        <Route
          path="/student-login"
          element={<StudentLogin />}
        />

        <Route
          path="/student/login"
          element={<StudentLogin />}
        />

        <Route
          path="/student-dashboard"
          element={<StudentDashboard />}
        />

        <Route
          path="/student/dashboard"
          element={<StudentDashboard />}
        />

        <Route
          path="/student/result"
          element={<StudentDashboard />}
        />

        <Route
          path="/student/fees"
          element={<StudentDashboard />}
        />

        <Route
          path="/admin-login"
          element={<AdminLogin />}
        />

        <Route
          path="/admin/login"
          element={<AdminLogin />}
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
            ACADEMIC
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

        {/* ⭐ DYNAMIC FEE SETTINGS */}

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
          element={<NotFound />}
        />

      </Routes>

    </BrowserRouter>

  );

}

export default AppRoutes;