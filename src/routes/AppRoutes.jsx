import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "../pages/Home";
import StudentLogin from "../pages/StudentLogin";
import StudentDashboard from "../pages/StudentDashboard";

import AdminLogin from "../pages/AdminLogin";
import AdminDashboard from "../pages/AdminDashboard";

import AddStudent from "../pages/AddStudent";
import ViewStudents from "../pages/ViewStudents";
import EditStudent from "../pages/EditStudent";

import AddResult from "../pages/AddResult";
import ViewResults from "../pages/ViewResults";
import EditResult from "../pages/EditResult";
import ResultDetails from "../pages/ResultDetails";
import PublishResults from "../pages/PublishResults";
import SubjectManagement from "../pages/SubjectManagement";

import FeeManagement from "../pages/FeeManagement";
import CollectFee from "../pages/CollectFee";
import PaymentHistory from "../pages/PaymentHistory";
import FeeSettings from "../pages/FeeSettings";

import Archive from "../pages/Archive";
import Settings from "../pages/Settings";
import NotFound from "../pages/NotFound";

import ProtectedAdminRoute from "./ProtectedAdminRoute";
function AppRoutes() {
  return (
    <BrowserRouter>

      <Routes>

        {/* Public */}

        <Route path="/" element={<Home />} />
        <Route path="/student-login" element={<StudentLogin />} />
        <Route path="/student-dashboard" element={<StudentDashboard />} />
        <Route path="/admin-login" element={<AdminLogin />} />

        {/* Dashboard */}

        <Route
          path="/admin-dashboard"
          element={
            <ProtectedAdminRoute>
              <AdminDashboard />
            </ProtectedAdminRoute>
          }
        />

        {/* Student */}

        <Route
          path="/add-student"
          element={
            <ProtectedAdminRoute>
              <AddStudent />
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
          path="/edit-student/:id"
          element={
            <ProtectedAdminRoute>
              <EditStudent />
            </ProtectedAdminRoute>
          }
        />

        {/* Result */}

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

        <Route
          path="/subject-management"
          element={
            <ProtectedAdminRoute>
              <SubjectManagement />
            </ProtectedAdminRoute>
          }
        />

        {/* Fee */}

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

        {/* Others */}

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

        <Route
          path="*"
          element={<NotFound />}
        />

      </Routes>

    </BrowserRouter>
  );
}

export default AppRoutes;

