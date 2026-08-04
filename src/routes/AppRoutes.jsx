import ViewStudents from "../pages/ViewStudents";
import { BrowserRouter, Routes, Route } from "react-router-dom";


import Home from "../pages/Home";
import StudentLogin from "../pages/StudentLogin";
import AdminLogin from "../pages/AdminLogin";
import AdminDashboard from "../pages/AdminDashboard";
import AddStudent from "../pages/AddStudent";
import NotFound from "../pages/NotFound";

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
        path="/view-students"
  element={<ViewStudents />}
/>


        <Route path="/" element={<Home />} />

        <Route
          path="/student-login"
          element={<StudentLogin />}
        />

        <Route
          path="/admin-login"
          element={<AdminLogin />}
        />

        <Route
          path="/admin-dashboard"
          element={<AdminDashboard />}
        />

        <Route
          path="/add-student"
          element={<AddStudent />}
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