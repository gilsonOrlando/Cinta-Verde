import { useEffect, useState } from "react";
import styled from "styled-components";
import {
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiFileSearchFill,
} from "react-icons/ri";
import { esRutaTransitoria } from "../../supabase/crudRuta";
import {
  puedeGestionarItemTransferencia,
  urlArchivoTransferencia,
} from "../../supabase/crudTransferencia";

function mismoId(a, b) {
  return String(a ?? "") === String(b ?? "");
}

export function VisorTransferenciasPanel({
  titulo,
  transferencias = [],
  ruta,
  sucursales = [],
  sesion,
  puedeEditar = false,
  onEditar,
  onEliminar,
  onDevolver,
}) {
  const [indice, setIndice] = useState(0);
  const [documento, setDocumento] = useState("transferencia");

  useEffect(() => {
    setIndice(0);
    setDocumento("transferencia");
  }, [ruta?.id]);

  useEffect(() => {
    if (indice > transferencias.length - 1) {
      setIndice(Math.max(0, transferencias.length - 1));
    }
  }, [transferencias.length, indice]);

  if (transferencias.length === 0) {
    return (
      <Caja>
        <Cabecera>
          <Icono aria-hidden="true">
            <RiFileSearchFill />
          </Icono>
          <div>
            <Kicker>{titulo}</Kicker>
            <em>Sin transferencias para verificar</em>
          </div>
        </Cabecera>
      </Caja>
    );
  }

  const actual = transferencias[Math.min(indice, transferencias.length - 1)];
  const origen =
    sucursales.find((item) => mismoId(item.id, actual.origen_id))?.nombre ?? "—";
  const destino =
    sucursales.find((item) => mismoId(item.id, actual.sucursal_id))?.nombre ?? "—";
  const url =
    documento === "guia"
      ? urlArchivoTransferencia(actual.guia)
      : urlArchivoTransferencia(actual.transferencia);
  const puedeGestionar = puedeGestionarItemTransferencia(sesion, actual, ruta);
  const mostrarDevolver = puedeGestionar && ruta && !esRutaTransitoria(ruta);

  return (
    <Caja>
      <Cabecera>
        <Icono aria-hidden="true">
          <RiFileSearchFill />
        </Icono>
        <div>
          <Kicker>{titulo}</Kicker>
          <strong>
            {origen} → {destino}
          </strong>
        </div>
      </Cabecera>

      <Tabs>
        <Tab
          type="button"
          $activo={documento === "transferencia"}
          onClick={() => setDocumento("transferencia")}
        >
          Transferencia
        </Tab>
        <Tab type="button" $activo={documento === "guia"} onClick={() => setDocumento("guia")}>
          Guía
        </Tab>
      </Tabs>

      <Marco>
        <iframe title={`Vista de ${documento}`} src={`${url}#view=FitH`} />
      </Marco>

      <Navegacion>
        <BtnNav
          type="button"
          disabled={indice <= 0}
          onClick={() => {
            setIndice((prev) => Math.max(0, prev - 1));
            setDocumento("transferencia");
          }}
        >
          <RiArrowLeftSLine />
          Atrás
        </BtnNav>
        <Contador>
          {indice + 1} / {transferencias.length}
        </Contador>
        <BtnNav
          type="button"
          disabled={indice >= transferencias.length - 1}
          onClick={() => {
            setIndice((prev) => Math.min(transferencias.length - 1, prev + 1));
            setDocumento("transferencia");
          }}
        >
          Siguiente
          <RiArrowRightSLine />
        </BtnNav>
      </Navegacion>

      {puedeEditar && puedeGestionar && (
        <Acciones>
          <BtnAccion type="button" onClick={() => onEditar?.(actual)}>
            Editar
          </BtnAccion>
          {mostrarDevolver && (
            <BtnAccion type="button" onClick={() => onDevolver?.(actual)}>
              A transitorio
            </BtnAccion>
          )}
          <BtnAccion type="button" $peligro onClick={() => onEliminar?.(actual)}>
            Eliminar
          </BtnAccion>
        </Acciones>
      )}
    </Caja>
  );
}

const Caja = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;
  min-height: 0;
`;

const Cabecera = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;

  strong {
    display: block;
    color: #3e2723;
    font-size: 0.82rem;
    line-height: 1.3;
  }

  em {
    display: block;
    font-style: normal;
    color: #888;
    font-size: 0.8rem;
  }
`;

const Icono = styled.span`
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: #e8f5e9;
  color: #1b5e20;

  svg {
    width: 38px;
    height: 38px;
  }
`;

const Kicker = styled.span`
  display: block;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #8d6e63;
`;

const Tabs = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
`;

const Tab = styled.button`
  border: 1px solid ${({ $activo }) => ($activo ? "#2e7d32" : "#ddd2c2")};
  background: ${({ $activo }) => ($activo ? "#e8f5e9" : "#fff")};
  color: ${({ $activo }) => ($activo ? "#1b5e20" : "#5d4037")};
  border-radius: 8px;
  padding: 6px 8px;
  font-size: 0.76rem;
  font-weight: 700;
  cursor: pointer;
`;

const Marco = styled.div`
  height: 240px;
  border: 1px solid #e0d6c6;
  border-radius: 10px;
  overflow: hidden;
  background: #fff;

  iframe {
    width: 100%;
    height: 100%;
    border: 0;
  }
`;

const Navegacion = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`;

const BtnNav = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  border: 1px solid #ddd2c2;
  background: #fff;
  color: #3e2723;
  border-radius: 8px;
  padding: 6px 8px;
  font-size: 0.76rem;
  font-weight: 700;
  cursor: pointer;

  svg {
    width: 18px;
    height: 18px;
  }

  &:disabled {
    opacity: 0.45;
    cursor: default;
  }
`;

const Contador = styled.span`
  font-size: 0.78rem;
  font-weight: 700;
  color: #6d4c41;
`;

const Acciones = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px 12px;
`;

const BtnAccion = styled.button`
  border: none;
  background: transparent;
  padding: 0;
  color: ${({ $peligro }) => ($peligro ? "#c62828" : "#1565c0")};
  font-weight: 700;
  font-size: 0.78rem;
  cursor: pointer;
`;
