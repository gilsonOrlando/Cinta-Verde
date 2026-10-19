import { useEffect, useState } from "react";
import styled from "styled-components";
import { RiArrowLeftSLine, RiArrowRightSLine, RiCloseLine } from "react-icons/ri";
import { esRutaTransitoria } from "../../supabase/crudRuta";
import {
  puedeGestionarItemTransferencia,
  urlArchivoTransferencia,
} from "../../supabase/crudTransferencia";

export const ICONO_VERIFICAR_TRANSFERENCIAS = "/iconos/verificar-transferencias.png";

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
  onClose,
}) {
  const [indice, setIndice] = useState(0);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose?.();
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  useEffect(() => {
    setIndice(0);
  }, [ruta?.id]);

  useEffect(() => {
    if (indice > transferencias.length - 1) {
      setIndice(Math.max(0, transferencias.length - 1));
    }
  }, [transferencias.length, indice]);

  const actual =
    transferencias.length > 0
      ? transferencias[Math.min(indice, transferencias.length - 1)]
      : null;
  const origen = actual
    ? sucursales.find((item) => mismoId(item.id, actual.origen_id))?.nombre ?? "—"
    : "";
  const destino = actual
    ? sucursales.find((item) => mismoId(item.id, actual.sucursal_id))?.nombre ?? "—"
    : "";
  const url = actual ? urlArchivoTransferencia(actual.transferencia) : "";
  const puedeGestionar = puedeGestionarItemTransferencia(sesion, actual, ruta);
  const mostrarDevolver = puedeGestionar && ruta && !esRutaTransitoria(ruta);

  return (
    <Overlay onClick={onClose}>
      <Dialog
        role="dialog"
        aria-labelledby="visor-transferencias-titulo"
        onClick={(event) => event.stopPropagation()}
      >
        <Cabecera>
          <img src={ICONO_VERIFICAR_TRANSFERENCIAS} alt="" />
          <div>
            <h2 id="visor-transferencias-titulo">{titulo}</h2>
            {actual ? (
              <strong>
                {origen} → {destino}
              </strong>
            ) : (
              <em>Sin transferencias para verificar</em>
            )}
          </div>
          <BtnCerrar type="button" aria-label="Cerrar" onClick={onClose}>
            <RiCloseLine />
          </BtnCerrar>
        </Cabecera>

        {actual && (
          <>
            <Marco>
              <iframe title="Vista de transferencia" src={`${url}#view=FitH`} />
            </Marco>

            <Navegacion>
              <BtnNav
                type="button"
                disabled={indice <= 0}
                onClick={() => setIndice((prev) => Math.max(0, prev - 1))}
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
                onClick={() =>
                  setIndice((prev) => Math.min(transferencias.length - 1, prev + 1))
                }
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
          </>
        )}
      </Dialog>
    </Overlay>
  );
}

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1080;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
`;

const Dialog = styled.div`
  width: min(96vw, 1280px);
  height: min(94vh, 920px);
  overflow: hidden;
  background: #fff;
  border-radius: 14px;
  padding: 18px 20px 16px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.22);
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const Cabecera = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;

  img {
    width: 52px;
    height: 52px;
    object-fit: contain;
  }

  h2 {
    margin: 0 0 4px;
    color: #1b5e20;
    font-size: 1.1rem;
  }

  strong {
    display: block;
    color: #3e2723;
    font-size: 0.88rem;
  }

  em {
    font-style: normal;
    color: #888;
    font-size: 0.84rem;
  }

  div {
    min-width: 0;
    flex: 1;
  }
`;

const BtnCerrar = styled.button`
  border: none;
  background: transparent;
  color: #666;
  cursor: pointer;
  padding: 4px;

  svg {
    width: 26px;
    height: 26px;
  }
`;

const Marco = styled.div`
  flex: 1;
  min-height: 0;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  overflow: hidden;
  background: #fafafa;

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
  border: 1px solid #ddd;
  background: #fff;
  color: #333;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;

  svg {
    width: 20px;
    height: 20px;
  }

  &:disabled {
    opacity: 0.45;
    cursor: default;
  }
`;

const Contador = styled.span`
  font-size: 0.84rem;
  font-weight: 700;
  color: #555;
`;

const Acciones = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px 16px;
`;

const BtnAccion = styled.button`
  border: none;
  background: transparent;
  padding: 0;
  color: ${({ $peligro }) => ($peligro ? "#c62828" : "#1565c0")};
  font-weight: 700;
  font-size: 0.86rem;
  cursor: pointer;
`;
