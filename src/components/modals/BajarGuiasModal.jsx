import { useEffect } from "react";
import styled from "styled-components";
import { RiDownload2Fill, RiTruckFill } from "react-icons/ri";
import { nombreDeGuia, nombreDeTransferencia } from "../../supabase/crudTransferencia";

function formatearFecha(fecha) {
  const texto = String(fecha ?? "").slice(0, 10);
  const [anio, mes, dia] = texto.split("-");
  if (!anio || !mes || !dia) return texto;
  return `${dia}/${mes}/${anio}`;
}

export function BajarGuiasModal({
  sucursalNombre,
  sentido = "egresos",
  onSentidoChange,
  rutas = [],
  rutaResaltadaId,
  descargando,
  onDescargarRuta,
  onDescargarTodas,
  onClose,
}) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape" && !descargando) onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [descargando, onClose]);

  const totalGuias = rutas.reduce((suma, ruta) => suma + (ruta.guias?.length ?? 0), 0);

  return (
    <Overlay onClick={descargando ? undefined : onClose}>
      <Dialog
        role="dialog"
        aria-labelledby="bajar-guias-titulo"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="bajar-guias-titulo">Bajar guías</h2>
        <CampoSentido>
          <label htmlFor="sentido-guias">Movimiento</label>
          <select
            id="sentido-guias"
            value={sentido}
            disabled={descargando}
            onChange={(event) => onSentidoChange?.(event.target.value)}
          >
            <option value="egresos">Egresos · salen a otras agencias o matriz</option>
            <option value="ingresos">Ingresos · llegan de otras agencias o matriz</option>
          </select>
        </CampoSentido>
        <p>
          {sentido === "ingresos"
            ? `Guías de transferencias que entran a ${sucursalNombre || "tu sucursal"}.`
            : `Guías de transferencias que salen de ${sucursalNombre || "tu sucursal"}.`}
        </p>

        <Lista>
          {rutas.length === 0 ? (
            <Vacio>
              {sentido === "ingresos"
                ? "No hay guías de ingreso para descargar."
                : "No hay guías de egreso para descargar."}
            </Vacio>
          ) : (
            rutas.map((ruta) => {
              const cantidad = ruta.guias?.length ?? 0;
              return (
                <RutaCard
                  key={ruta.id}
                  $resaltada={String(ruta.id) === String(rutaResaltadaId ?? "")}
                >
                  <RiTruckFill />
                  <div>
                    <strong>{ruta.chofer}</strong>
                    <small>
                      {formatearFecha(ruta.fecha)}
                      {ruta.destinos ? ` · ${ruta.destinos}` : ""}
                    </small>
                    <em>
                      {cantidad === 0
                        ? sentido === "ingresos"
                          ? "Sin guías de ingreso"
                          : "Sin guías de egreso"
                        : `${cantidad} guía${cantidad === 1 ? "" : "s"} de ${
                            sentido === "ingresos" ? "ingreso" : "egreso"
                          }`}
                    </em>
                    {cantidad > 0 && (
                      <NombresGuias>
                        {ruta.guias.map((item) => (
                          <li key={item.id}>
                            {nombreDeGuia(item)
                              ? `${nombreDeGuia(item)} · ${nombreDeTransferencia(item)}`
                              : nombreDeTransferencia(item)}
                          </li>
                        ))}
                      </NombresGuias>
                    )}
                  </div>
                  <BtnRuta
                    type="button"
                    disabled={descargando || cantidad === 0}
                    onClick={() => onDescargarRuta(ruta)}
                  >
                    <RiDownload2Fill />
                    Bajar
                  </BtnRuta>
                </RutaCard>
              );
            })
          )}
        </Lista>

        <Footer>
          <BtnSecundario type="button" onClick={onClose} disabled={descargando}>
            Cerrar
          </BtnSecundario>
          <BtnPrimario
            type="button"
            disabled={descargando || totalGuias === 0}
            onClick={onDescargarTodas}
          >
            <RiDownload2Fill />
            {descargando ? "Descargando..." : `Bajar todas (${totalGuias})`}
          </BtnPrimario>
        </Footer>
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
  max-width: 640px;
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

const CampoSentido = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;

  label {
    font-size: 0.76rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #666;
  }

  select {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #ccc;
    border-radius: 8px;
    font-size: 0.95rem;
    color: #222;
    background: #fff;

    &:disabled {
      background: #f5f5f5;
      color: #555;
    }

    &:focus {
      outline: none;
      border-color: #2e7d32;
      box-shadow: 0 0 0 2px rgba(46, 125, 50, 0.15);
    }
  }
`;

const Lista = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 420px;
  overflow-y: auto;
  padding-right: 4px;
`;

const Vacio = styled.em`
  font-style: normal;
  color: #888;
  font-size: 0.86rem;
`;

const RutaCard = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  border: 1px solid ${({ $resaltada }) => ($resaltada ? "#2e7d32" : "#e0e0e0")};
  background: ${({ $resaltada }) => ($resaltada ? "#e8f5e9" : "#fafafa")};
  border-radius: 10px;
  padding: 12px;

  > svg {
    color: #1b5e20;
    width: 22px;
    height: 22px;
    margin-top: 2px;
  }

  div {
    flex: 1;
    min-width: 0;
  }

  strong {
    display: block;
    color: #1b5e20;
  }

  small,
  em {
    display: block;
    margin-top: 4px;
    color: #666;
    font-size: 0.78rem;
    line-height: 1.3;
    font-style: normal;
  }
`;

const NombresGuias = styled.ul`
  margin: 8px 0 0;
  padding-left: 16px;
  color: #3e2723;
  font-size: 0.76rem;
  line-height: 1.35;

  li + li {
    margin-top: 2px;
  }
`;

const BtnRuta = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 1px solid #2e7d32;
  background: #fff;
  color: #2e7d32;
  border-radius: 8px;
  padding: 8px 10px;
  font-weight: 700;
  font-size: 0.78rem;
  cursor: pointer;

  svg {
    width: 16px;
    height: 16px;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 16px;
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
  display: inline-flex;
  align-items: center;
  gap: 6px;
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
