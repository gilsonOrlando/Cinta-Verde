import { Navigate } from "react-router-dom";
import { UserAuth } from "../context/AuthContext";

export const ProtectedRoute = ({ children, accessBy }) => {
  const { user, loading } = UserAuth();

  if (loading) {
    return null;
  }

  if (accessBy === "non-authenticated") {
    return !user ? children : <Navigate to="/gestion" />;
  }

  if (accessBy === "authenticated") {
    return user ? children : <Navigate to="/login" />;
  }

  return <Navigate to="/login" />;
};
