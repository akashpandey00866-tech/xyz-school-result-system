import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function ProtectedAdminRoute({ children }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/admin-login" replace />;
  }

  return children;
}

export default ProtectedAdminRoute;