import { useEffect, useState } from "react";
import styled from "styled-components";
import {
  nombreDeTransferencia,
  puedeEliminarItemTransferencia,
  puedeGestionarItemTransferencia,
  urlArchivoTransferencia,
} from "../../supabase/crudTransferencia";
import { esRutaTransitoria } from "../../supabase/crudRuta";

function esPdf(file) {
  const nombre = String(file?.name ?? "").toLowerCase();
  const tipo = String(file?.type ?? "");
  return tipo === "application/pdf" || nombre.endsWith(".pdf");
}

function pdfsDesde(list) {
  return [...(list ?? [])].filter(esPdf);
}

function nombreArchivo(file) {
  if (!file) return "";
  const kb = file.size / 1024;
  const tamano = kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(kb))} KB`;
  return `${file.name} · ${tamano}`;
}

function ZonaPdf({ id, etiqueta, archivo, disabled, onArchivos }) {
  const [sobre, setSobre] = useState(false);

  const tomar = (files) => {
    const pdfs = pdfsDesde(files);
    if (pdfs.length === 0) return;
    onArchivos(pdfs);
  };

  return (
    <Campo>
      <label htmlFor={id}>{etiqueta}</label>
      <Drop
        $activo={Boolean(archivo)}
        $sobre={sobre}
        $disabled={disabled}
        onDragEnter={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (!disabled) setSobre(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (!event.currentTarget.contains(event.relatedTarget)) setSobre(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setSobre(false);
          if (!disabled) tomar(event.dataTransfer.files);
        }}
      >
        <input
          id={id}
          type="file"
          accept="application/pdf,.pdf"
          disabled={disabled}
          onChange={(event) => {
            tomar(event.target.files);
            event.target.value = "";
          }}
        />
        <strong>{archivo ? nombreArchivo(archivo) : "Arrastra el PDF aquí"}</strong>
        <small>{archivo ? "Suelta otro archivo para reemplazarlo" : "o haz clic para seleccionar"}</small>
      </Drop>
    </Campo>
  );
}

function mismoId(a, b) {
  return String(a ?? "") === String(b ?? "");
}

function nombreSucursal(sucursales, id) {
  return sucursales.find((item) => mismoId(item.id, id))?.nombre ?? "—";
}

export function CargarTransferenciaModal({
  ruta,
  transferencias = [],
  sucursales = [],
  sesion,
  transferenciaEdicionId = null,
  puedeEditar = false,
  guardando,
  onConfirmar,
  onEliminar,
  onDevolver,
  onClose,
}) {
  const [archivoTransferencia, setArchivoTransferencia] = useState(null);
  const [archivoGuia, setArchivoGuia] = useState(null);
  const [sucursalId, setSucursalId] = useState("");
  const [aviso, setAviso] = useState("");
  const [editandoId, setEditandoId] = useState(transferenciaEdicionId);
  const [seleccionadaId, setSeleccionadaId] = useState(
    transferenciaEdicionId || transferencias[0]?.id || ""
  );
  const itemEditando = transferencias.find((item) => mismoId(item.id, editandoId));
  const itemSeleccionado = transferencias.find((item) =>
    mismoId(item.id, seleccionadaId)
  );
  const origenId = itemEditando?.origen_id || sesion?.sucursal_id || "";
  const origenNombre =
    nombreSucursal(sucursales, origenId) !== "—"
      ? nombreSucursal(sucursales, origenId)
      : sesion?.sucursal_nombre ?? "—";
  const sucursalesCombo = sucursales.filter(
    (item) => !mismoId(item.id, sesion?.sucursal_id)
  );

  useEffect(() => {
    if (!transferenciaEdicionId) return;
    const item = transferencias.find((actual) => mismoId(actual.id, transferenciaEdicionId));
    setEditandoId(transferenciaEdicionId);
    setSeleccionadaId(transferenciaEdicionId);
    setSucursalId(item?.sucursal_id ?? "");
  }, [transferenciaEdicionId]);

  useEffect(() => {
    if (transferencias.length === 0) {
      setSeleccionadaId("");
      return;
    }
    if (!transferencias.some((item) => mismoId(item.id, seleccionadaId))) {
      setSeleccionadaId(transferenciaEdicionId || transferencias[0].id);
    }
  }, [transferencias, transferenciaEdicionId, seleccionadaId]);

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

  const asignar = (pdfs, destino) => {
    if (pdfs.length === 0) {
      setAviso("Solo se aceptan archivos PDF.");
      return;
    }

    setAviso("");
    if (pdfs.length >= 2) {
      setArchivoTransferencia(pdfs[0]);
      setArchivoGuia(pdfs[1]);
      return;
    }

    if (destino === "guia") setArchivoGuia(pdfs[0]);
    else setArchivoTransferencia(pdfs[0]);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!puedeEditar || guardando || !archivoTransferencia || !archivoGuia || !sucursalId) {
      return;
    }
    if (editandoId && !puedeGestionarItemTransferencia(sesion, itemEditando, ruta)) {
      setAviso("Solo la agencia origen o la matriz de la ruta pueden editar esta transferencia.");
      return;
    }
    onConfirmar({
      id: editandoId,
      origenId,
      sucursalId,
      archivoTransferencia,
      archivoGuia,
    });
  };

  return (
    <Overlay onClick={guardando ? undefined : onClose}>
      <Dialog
        role="dialog"
        aria-labelledby="cargar-transferencia-titulo"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="cargar-transferencia-titulo">
          {puedeEditar ? "Gestionar transferencia" : "Transferencias de la ruta"}
        </h2>
        <p>
          {puedeEditar
            ? `La agencia origen es la sucursal con la que ingresaste. Elige otra sucursal y carga ambos PDF (máximo 5 MB y 3 páginas). Ruta: ${ruta?.chofer ?? "—"}.`
            : `Consulta los PDF de esta ruta. Ruta: ${ruta?.chofer ?? "—"}.`}
        </p>

        <Form onSubmit={handleSubmit}>
          {puedeEditar && (
            <Grid>
              <Campo>
                <label htmlFor="transferencia-origen">Agencia origen</label>
                <input
                  id="transferencia-origen"
                  value={origenNombre || "—"}
                  readOnly
                  disabled
                />
              </Campo>
              <Campo>
                <label htmlFor="transferencia-sucursal">Sucursal</label>
                <select
                  id="transferencia-sucursal"
                  value={sucursalId}
                  onChange={(event) => setSucursalId(event.target.value)}
                  disabled={guardando}
                  required
                >
                  <option value="">Selecciona una sucursal</option>
                  {sucursalesCombo.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nombre}
                      {String(item.tipo ?? "").toLowerCase() === "matriz"
                        ? " (Matriz)"
                        : " (Agencia)"}
                    </option>
                  ))}
                </select>
              </Campo>
            </Grid>
          )}

          {puedeEditar && (
            <Grid>
              <ZonaPdf
                id="pdf-transferencia"
                etiqueta="PDF transferencia"
                archivo={archivoTransferencia}
                disabled={guardando}
                onArchivos={(pdfs) => asignar(pdfs, "transferencia")}
              />
              <ZonaPdf
                id="pdf-guia"
                etiqueta="PDF guía"
                archivo={archivoGuia}
                disabled={guardando}
                onArchivos={(pdfs) => asignar(pdfs, "guia")}
              />
            </Grid>
          )}

          {aviso && <Aviso>{aviso}</Aviso>}

          {transferencias.length > 0 && (
            <Lista>
              <CabeceraLista>
                <span>Cargadas en esta ruta</span>
                {puedeEditar && itemSeleccionado && (
                  <AccionesLista>
                    {puedeGestionarItemTransferencia(sesion, itemSeleccionado, ruta) && (
                      <BtnTexto
                        type="button"
                        disabled={guardando}
                        onClick={() => {
                          setEditandoId(itemSeleccionado.id);
                          setSucursalId(itemSeleccionado.sucursal_id ?? "");
                        }}
                      >
                        {mismoId(editandoId, itemSeleccionado.id) ? "Editando" : "Editar"}
                      </BtnTexto>
                    )}
                    {puedeGestionarItemTransferencia(sesion, itemSeleccionado, ruta) &&
                      !esRutaTransitoria(ruta) && (
                        <BtnTexto
                          type="button"
                          disabled={guardando}
                          onClick={() => onDevolver?.(itemSeleccionado)}
                        >
                          A transitorio
                        </BtnTexto>
                      )}
                    {puedeEliminarItemTransferencia(sesion, itemSeleccionado, ruta) && (
                      <BtnTexto
                        type="button"
                        $peligro
                        disabled={guardando}
                        onClick={() => onEliminar?.(itemSeleccionado)}
                      >
                        Eliminar
                      </BtnTexto>
                    )}
                  </AccionesLista>
                )}
              </CabeceraLista>
              <Carrusel>
                {transferencias.map((item) => (
                  <Tarjeta
                    key={item.id}
                    type="button"
                    $activo={mismoId(seleccionadaId, item.id)}
                    onClick={() => setSeleccionadaId(item.id)}
                  >
                    <strong>{nombreDeTransferencia(item)}</strong>
                    <em>
                      {nombreSucursal(sucursales, item.origen_id)} →{" "}
                      {nombreSucursal(sucursales, item.sucursal_id)}
                    </em>
                    <Enlaces>
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
                    </Enlaces>
                  </Tarjeta>
                ))}
              </Carrusel>
            </Lista>
          )}
          {!puedeEditar && transferencias.length === 0 && (
            <Aviso>Esta ruta aún no tiene transferencias.</Aviso>
          )}

          <Footer>
            <BtnSecundario type="button" onClick={onClose} disabled={guardando}>
              {puedeEditar ? "Cancelar" : "Cerrar"}
            </BtnSecundario>
            {puedeEditar && (
              <BtnPrimario
                type="submit"
                disabled={guardando || !archivoTransferencia || !archivoGuia || !sucursalId}
              >
                {guardando
                  ? "Subiendo..."
                  : editandoId
                    ? "Actualizar ambos PDF"
                    : "Guardar ambos PDF"}
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
  max-width: 760px;
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

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

const Campo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;

  label {
    font-size: 0.76rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #666;
  }

  input,
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

const Drop = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 132px;
  padding: 16px 12px;
  border: 2px dashed ${({ $sobre, $activo }) => ($sobre ? "#1b5e20" : $activo ? "#81c784" : "#cfd8dc")};
  border-radius: 10px;
  background: ${({ $sobre, $activo }) => ($sobre ? "#e8f5e9" : $activo ? "#f1f8e9" : "#fafafa")};
  text-align: center;
  cursor: ${({ $disabled }) => ($disabled ? "wait" : "pointer")};
  pointer-events: ${({ $disabled }) => ($disabled ? "none" : "auto")};

  input {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
  }

  strong {
    font-size: 0.84rem;
    color: #1b5e20;
    word-break: break-word;
    line-height: 1.3;
  }

  small {
    color: #777;
    font-size: 0.76rem;
  }
`;

const Aviso = styled.p`
  margin: 0;
  color: #c62828;
  font-size: 0.84rem;
  font-weight: 600;
`;

const Lista = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-top: 1px solid #eee;
  padding-top: 10px;
`;

const CabeceraLista = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;

  span {
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #888;
  }
`;

const AccionesLista = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const Carrusel = styled.div`
  display: flex;
  gap: 10px;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 4px 2px 10px;
  scroll-snap-type: x proximity;

  &::-webkit-scrollbar {
    height: 8px;
  }

  &::-webkit-scrollbar-thumb {
    background: #bdbdbd;
    border-radius: 999px;
  }
`;

const Tarjeta = styled.button`
  flex: 0 0 210px;
  scroll-snap-align: start;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  text-align: left;
  border: 1px solid ${({ $activo }) => ($activo ? "#2e7d32" : "#e0e0e0")};
  background: ${({ $activo }) => ($activo ? "#e8f5e9" : "#fafafa")};
  border-radius: 10px;
  padding: 10px 12px;
  cursor: pointer;

  strong {
    color: #1b5e20;
    font-size: 0.82rem;
    line-height: 1.25;
    word-break: break-word;
  }

  em {
    font-style: normal;
    color: #666;
    font-size: 0.74rem;
  }
`;

const Enlaces = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 4px;

  a {
    color: #2e7d32;
    font-weight: 600;
    font-size: 0.76rem;
  }
`;

const BtnTexto = styled.button`
  border: none;
  background: transparent;
  padding: 0;
  color: ${({ $peligro }) => ($peligro ? "#c62828" : "#1565c0")};
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: wait;
  }
`;

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 4px;
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
