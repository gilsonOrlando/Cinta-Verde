import { useState } from "react";
import styled from "styled-components";
import { LoginTransferencias } from "../organismos/LoginTransferencias";
import { PizarraTransferencias } from "../organismos/PizarraTransferencias";
import {
  borrarSesionTransferencia,
  leerSesionTransferencia,
} from "../../supabase/crudUsuariosTransferencias";

export function TransferenciasBodegasTemplate() {
  const [sesion, setSesion] = useState(() => leerSesionTransferencia());

  if (!sesion) {
    return <LoginTransferencias onSesion={setSesion} />;
  }

  return (
    <Caja>
      <Barra>
        <span>
          {sesion.sucursal_nombre} · {sesion.tipo === "matriz" ? "Matriz" : "Agencia"}
        </span>
        <button
          type="button"
          onClick={() => {
            borrarSesionTransferencia();
            setSesion(null);
          }}
        >
          Cerrar sesión
        </button>
      </Barra>
      <PizarraTransferencias sesion={sesion} />
    </Caja>
  );
}

const Caja = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const Barra = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: #e8f5e9;
  border: 1px solid #c8e6c9;
  border-radius: 8px;
  color: #1b5e20;
  font-size: 0.88rem;
  font-weight: 700;

  button {
    border: 1px solid #2e7d32;
    background: #fff;
    color: #1b5e20;
    padding: 6px 10px;
    border-radius: 6px;
    font-weight: 700;
    cursor: pointer;
  }
`;
