import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "../pages/Home";
import StudentLogin from "../pages/StudentLogin";
import AdminLogin from "../pages/AdminLogin";
import NotFound from "../pages/NotFound";

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/student-login" element={<StudentLogin />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;