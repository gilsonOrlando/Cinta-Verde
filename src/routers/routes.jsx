import { Routes, Route, Navigate } from "react-router-dom";
import { PublicLayout } from "../hooks/PublicLayout";
import { Home } from "../pages/Home";
import { Motos } from "../pages/Motos";
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
        path="/motos"
        element={
          <PublicLayout>
            <Motos />
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
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
