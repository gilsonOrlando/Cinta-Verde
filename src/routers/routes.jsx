import { Routes, Route } from "react-router-dom";
import { PublicLayout } from "../hooks/PublicLayout";
import { Home } from "../pages/Home";
import { TomaFisica } from "../pages/TomaFisica";

export function MyRoutes() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <PublicLayout>
            <Home />
          </PublicLayout>
        }
      />
      <Route
        path="/toma-fisica"
        element={
          <PublicLayout>
            <TomaFisica />
          </PublicLayout>
        }
      />
    </Routes>
  );
}
