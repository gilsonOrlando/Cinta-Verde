import { useEffect, useState } from "react";
import styled from "styled-components";
import { RiFilePdfFill, RiTruckFill } from "react-icons/ri";
import { urlArchivoTransferencia } from "../../supabase/crudTransferencia";

function nombreDe(nombres, id) {
  if (nombres[id]) return nombres[id];
  const clave = Object.keys(nombres).find((item) => String(item) === String(id ?? ""));
  return clave ? nombres[clave] : "—";
}

function formatearFecha(fecha) {
  const texto = String(fecha ?? "").slice(0, 10);
  const [anio, mes, dia] = texto.split("-");
  if (!anio || !mes || !dia) return texto;
  return `${dia}/${mes}/${anio}`;
}

export function AsignarTransferenciasModal({
  matriz,
  pendientes = [],
  rutasDestino = [],
  nombresSucursal,
  puedeMover,
  guardando,
  onConfirmar,
  onEliminar,
  onClose,
}) {
  const [seleccionadas, setSeleccionadas] = useState([]);
  const [rutaId, setRutaId] = useState(rutasDestino[0]?.id ?? "");
  const [sobreRuta, setSobreRuta] = useState(null);

  useEffect(() => {
    setSeleccionadas((prev) => {
      const next = prev.filter((id) =>
        pendientes.some((item) => String(item.id) === String(id))
      );
      return next.length === prev.length ? prev : next;
    });
  }, [pendientes]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape" && !guardando) onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [guardando, onClose]);

  const toggle = (id) => {
    setSeleccionadas((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const marcarTodas = () => {
    if (seleccionadas.length === pendientes.length) setSeleccionadas([]);
    else setSeleccionadas(pendientes.map((item) => item.id));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!puedeMover || guardando) return;
    onConfirmar({ ids: seleccionadas, rutaId });
  };

  return (
    <Overlay onClick={guardando ? undefined : onClose}>
      <Dialog
        role="dialog"
        aria-labelledby="asignar-transferencias-titulo"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="asignar-transferencias-titulo">Pasar pendientes a ruta</h2>
        <p>
          Transferencias de la ruta transitorio de <strong>{matriz?.nombre}</strong>. Elige
          los PDF y una ruta (agencia o matriz), o arrástralos sobre la ruta.
        </p>

        <Form onSubmit={handleSubmit}>
          <Columnas>
            <Columna>
              <CabeceraCol>
                <span>Pendientes</span>
                {puedeMover && pendientes.length > 0 && (
                  <button type="button" onClick={marcarTodas} disabled={guardando}>
                    {seleccionadas.length === pendientes.length
                      ? "Quitar todas"
                      : "Marcar todas"}
                  </button>
                )}
              </CabeceraCol>
              <Lista>
                {pendientes.length === 0 ? (
                  <Vacio>No hay transferencias en la ruta transitorio.</Vacio>
                ) : (
                  pendientes.map((item) => (
                    <Item
                      key={item.id}
                      $activo={seleccionadas.includes(item.id)}
                      draggable={puedeMover}
                      onDragStart={(event) => {
                        if (!puedeMover) return;
                        if (!seleccionadas.includes(item.id)) {
                          setSeleccionadas((prev) => [...prev, item.id]);
                        }
                        event.dataTransfer.setData("text/plain", item.id);
                        event.dataTransfer.effectAllowed = "move";
                      }}
                      onClick={() => puedeMover && toggle(item.id)}
                    >
                      {puedeMover && (
                        <input
                          type="checkbox"
                          checked={seleccionadas.includes(item.id)}
                          onChange={() => toggle(item.id)}
                          onClick={(event) => event.stopPropagation()}
                        />
                      )}
                      <RiFilePdfFill />
                      <div>
                        <strong>
                          {String(item.nombre ?? "").trim() ||
                            `${nombreDe(nombresSucursal, item.origen_id)} → ${nombreDe(
                              nombresSucursal,
                              item.sucursal_id
                            )}`}
                        </strong>
                        {String(item.nombre ?? "").trim() ? (
                          <small>
                            {nombreDe(nombresSucursal, item.origen_id)} →{" "}
                            {nombreDe(nombresSucursal, item.sucursal_id)}
                          </small>
                        ) : null}
                        <a
                          href={urlArchivoTransferencia(item.transferencia)}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(event) => event.stopPropagation()}
                        >
                          Transferencia
                        </a>
                        <a
                          href={urlArchivoTransferencia(item.guia)}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(event) => event.stopPropagation()}
                        >
                          Guía
                        </a>
                        {puedeMover && (
                          <BtnEliminar
                            type="button"
                            disabled={guardando}
                            onClick={(event) => {
                              event.stopPropagation();
                              onEliminar?.(item);
                            }}
                          >
                            Eliminar
                          </BtnEliminar>
                        )}
                      </div>
                    </Item>
                  ))
                )}
              </Lista>
            </Columna>

            <Columna>
              <CabeceraCol>
                <span>Rutas de la matriz</span>
              </CabeceraCol>
              <Lista>
                {rutasDestino.length === 0 ? (
                  <Vacio>Crea primero una ruta hacia una agencia o la otra matriz.</Vacio>
                ) : (
                  rutasDestino.map((ruta) => (
                    <RutaCard
                      key={ruta.id}
                      type="button"
                      $activo={rutaId === ruta.id}
                      $sobre={sobreRuta === ruta.id}
                      disabled={!puedeMover || guardando}
                      onClick={() => setRutaId(ruta.id)}
                      onDragOver={(event) => {
                        event.preventDefault();
                        setSobreRuta(ruta.id);
                      }}
                      onDragLeave={() => setSobreRuta(null)}
                      onDrop={(event) => {
                        event.preventDefault();
                        setSobreRuta(null);
                        const id = event.dataTransfer.getData("text/plain");
                        const ids = seleccionadas.includes(id)
                          ? seleccionadas
                          : [...seleccionadas, id].filter(Boolean);
                        if (ids.length === 0) return;
                        onConfirmar({ ids, rutaId: ruta.id });
                      }}
                    >
                      <RiTruckFill />
                      <div>
                        <strong>{ruta.chofer}</strong>
                        <small>
                          {formatearFecha(ruta.fecha)} ·{" "}
                          {(ruta.destinoIds ?? [])
                            .map((id) => nombresSucursal[id])
                            .filter(Boolean)
                            .join(", ") || "Sin destinos"}
                        </small>
                      </div>
                    </RutaCard>
                  ))
                )}
              </Lista>
            </Columna>
          </Columnas>

          <Footer>
            <BtnSecundario type="button" onClick={onClose} disabled={guardando}>
              Cerrar
            </BtnSecundario>
            {puedeMover && (
              <BtnPrimario
                type="submit"
                disabled={guardando || seleccionadas.length === 0 || !rutaId}
              >
                {guardando
                  ? "Moviendo..."
                  : `Mover ${seleccionadas.length || ""} a la ruta`}
              </BtnPrimario>
            )}
          </Footer>
        </Form>
      </Dialog>
    </Overlay>
  );
}

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1100;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
`;

const Dialog = styled.div`
  width: 100%;
  max-width: 860px;
  max-height: min(90vh, 760px);
  overflow: auto;
  background: #fff;
  border-radius: 14px;
  padding: 22px 22px 18px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.22);

  h2 {
    margin: 0 0 8px;
    color: #1b5e20;
    font-size: 1.2rem;
  }

  p {
    margin: 0 0 16px;
    color: #666;
    font-size: 0.88rem;
    line-height: 1.45;
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const Columnas = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

const Columna = styled.div`
  min-width: 0;
`;

const CabeceraCol = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;

  span {
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #666;
  }

  button {
    border: none;
    background: transparent;
    color: #2e7d32;
    font-size: 0.78rem;
    font-weight: 700;
    cursor: pointer;
  }
`;

const Lista = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 320px;
  overflow-y: auto;
  padding-right: 4px;
`;

const Vacio = styled.em`
  font-size: 0.84rem;
  color: #888;
  font-style: normal;
`;

const Item = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  border: 1px solid ${({ $activo }) => ($activo ? "#2e7d32" : "#e0e0e0")};
  background: ${({ $activo }) => ($activo ? "#e8f5e9" : "#fafafa")};
  border-radius: 10px;
  padding: 10px;
  cursor: pointer;

  svg {
    margin-top: 2px;
    color: #c62828;
    width: 18px;
    height: 18px;
  }

  div {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 10px;
    font-size: 0.82rem;
  }

  strong {
    width: 100%;
    color: #1b5e20;
  }

  small {
    width: 100%;
    color: #666;
    font-size: 0.74rem;
  }

  a {
    color: #2e7d32;
    font-weight: 600;
  }
`;

const BtnEliminar = styled.button`
  border: none;
  background: transparent;
  padding: 0;
  color: #c62828;
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: wait;
  }
`;

const RutaCard = styled.button`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  width: 100%;
  text-align: left;
  border: 2px dashed ${({ $sobre, $activo }) => ($sobre ? "#1b5e20" : $activo ? "#2e7d32" : "#cfd8dc")};
  background: ${({ $sobre, $activo }) => ($sobre ? "#e8f5e9" : $activo ? "#f1f8e9" : "#fff")};
  border-radius: 10px;
  padding: 12px;
  cursor: pointer;

  svg {
    color: #1b5e20;
    width: 22px;
    height: 22px;
  }

  strong {
    display: block;
    color: #1b5e20;
  }

  small {
    display: block;
    margin-top: 4px;
    color: #666;
    font-size: 0.78rem;
    line-height: 1.3;
  }

  &:disabled {
    cursor: default;
  }
`;

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
`;

const BtnSecundario = styled.button`
  border: 1px solid #ddd;
  background: #fff;
  color: #444;
  padding: 10px 16px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
`;

const BtnPrimario = styled.button`
  border: 1px solid #2e7d32;
  background: #2e7d32;
  color: #fff;
  padding: 10px 16px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;
