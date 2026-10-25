import { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import toast from "react-hot-toast";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import {
  RiAddLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiCloseLine,
  RiSubtractLine,
} from "react-icons/ri";
import { esRutaTransitoria } from "../../supabase/crudRuta";
import {
  obtenerBufferArchivoTransferencia,
  nombreDeGuia,
  nombreDeTransferencia,
  puedeEliminarItemTransferencia,
  puedeGestionarItemTransferencia,
} from "../../supabase/crudTransferencia";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const FRACCION_VISIBLE = 0.62;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.5;
const ZOOM_PASO = 0.2;
const ZOOM_PREDETERMINADO = 1.6;

export const ICONO_VERIFICAR_TRANSFERENCIAS = "/iconos/verificar-transferencias.png";

function mismoId(a, b) {
  return String(a ?? "") === String(b ?? "");
}

function destinosDeRuta(ruta) {
  return [...new Set((ruta?.destinoIds ?? []).map((id) => String(id)).filter(Boolean))];
}

function esIngresoTransferencia(item, ruta) {
  const destinos = destinosDeRuta(ruta);
  if (destinos.length > 0) return destinos.includes(String(item?.sucursal_id ?? ""));
  return mismoId(item?.sucursal_id, ruta?.origen_id);
}

function tipoDeSucursal(sucursales, id) {
  return String(
    sucursales.find((item) => mismoId(item.id, id))?.tipo ?? ""
  ).toLowerCase();
}

function esEgresoTransferencia(item, ruta, sucursales = []) {
  const destinos = destinosDeRuta(ruta);
  const origen = String(item?.origen_id ?? "");
  const destino = String(item?.sucursal_id ?? "");
  if (!origen) return false;
  if (destinos.length === 0) return mismoId(origen, ruta?.origen_id);
  if (destinos.includes(origen)) return true;
  if (destinos.includes(destino)) return false;
  return (
    mismoId(destino, ruta?.origen_id) || tipoDeSucursal(sucursales, destino) === "agencia"
  );
}

function sentidoPorDefecto({ transferencias, ruta, sesion, transferenciaInicialId }) {
  const actual = transferencias.find((item) => mismoId(item.id, transferenciaInicialId));
  if (sesion?.sucursal_id && actual) {
    if (mismoId(actual.sucursal_id, sesion.sucursal_id)) return "ingresos";
    if (mismoId(actual.origen_id, sesion.sucursal_id)) return "egresos";
  }
  if (sesion?.sucursal_id && destinosDeRuta(ruta).includes(String(sesion.sucursal_id))) {
    return "ingresos";
  }
  return "egresos";
}

async function imprimirPdfTransferencia(path) {
  if (!path) throw new Error("No hay PDF de transferencia para imprimir.");
  const buffer = await obtenerBufferArchivoTransferencia(path);
  const url = URL.createObjectURL(new Blob([buffer], { type: "application/pdf" }));

  await new Promise((resolve, reject) => {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        resolve();
      } catch (error) {
        reject(error);
      } finally {
        setTimeout(() => {
          URL.revokeObjectURL(url);
          iframe.remove();
        }, 120000);
      }
    };
    iframe.onerror = () => {
      URL.revokeObjectURL(url);
      iframe.remove();
      reject(new Error("No se pudo abrir el PDF para imprimir."));
    };
    iframe.src = url;
    document.body.appendChild(iframe);
  });
}

function PdfHoja({ path }) {
  const marcoRef = useRef(null);
  const lienzoRef = useRef(null);
  const bufferRef = useRef(null);
  const [estado, setEstado] = useState("cargando");
  const [tamano, setTamano] = useState({ ancho: 0, alto: 0 });
  const [zoom, setZoom] = useState(ZOOM_PREDETERMINADO);

  useEffect(() => {
    const contenedor = marcoRef.current;
    if (!contenedor) return undefined;

    const medir = () => {
      setTamano({
        ancho: contenedor.clientWidth,
        alto: contenedor.clientHeight,
      });
    };

    medir();
    const observer = new ResizeObserver(() => medir());
    observer.observe(contenedor);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    bufferRef.current = null;
    setEstado("cargando");
    setZoom(ZOOM_PREDETERMINADO);
    if (!path) return undefined;

    let cancelado = false;
    async function cargar() {
      try {
        const buffer = await obtenerBufferArchivoTransferencia(path);
        if (cancelado) return;
        bufferRef.current = buffer;
        setEstado("listo");
      } catch (error) {
        console.error(error);
        if (!cancelado) setEstado("error");
      }
    }

    cargar();
    return () => {
      cancelado = true;
    };
  }, [path]);

  useEffect(() => {
    const canvas = lienzoRef.current;
    const buffer = bufferRef.current;
    if (estado !== "listo" || !canvas || !buffer || tamano.alto < 80) return undefined;

    let cancelado = false;
    let pdf;

    async function pintar() {
      try {
        pdf = await pdfjsLib.getDocument({ data: buffer.slice(0) }).promise;
        if (cancelado) {
          pdf.destroy();
          return;
        }
        const pagina = await pdf.getPage(1);
        const base = pagina.getViewport({ scale: 1 });
        const ancho = Math.max(280, tamano.ancho - 24);
        const alto = Math.max(240, tamano.alto - 16);
        const escala =
          Math.min(ancho / base.width, alto / (base.height * FRACCION_VISIBLE)) *
          zoom;
        const pixeles = window.devicePixelRatio || 1;
        const viewport = pagina.getViewport({ scale: escala });
        canvas.width = Math.floor(viewport.width * pixeles);
        canvas.height = Math.floor(viewport.height * pixeles);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        const contexto = canvas.getContext("2d");
        contexto.setTransform(pixeles, 0, 0, pixeles, 0, 0);
        await pagina.render({ canvasContext: contexto, viewport }).promise;
      } catch (error) {
        console.error(error);
        if (!cancelado) setEstado("error");
      } finally {
        pdf?.destroy();
      }
    }

    pintar();
    return () => {
      cancelado = true;
    };
  }, [estado, path, tamano.ancho, tamano.alto, zoom]);

  return (
    <Marco ref={marcoRef}>
      {estado === "listo" && (
        <BarraZoom>
          <BtnZoom
            type="button"
            title="Alejar"
            aria-label="Alejar"
            disabled={zoom <= ZOOM_MIN}
            onClick={() =>
              setZoom((prev) => Math.max(ZOOM_MIN, +(prev - ZOOM_PASO).toFixed(1)))
            }
          >
            <RiSubtractLine />
          </BtnZoom>
          <Porcentaje>{Math.round(zoom * 100)}%</Porcentaje>
          <BtnZoom
            type="button"
            title="Acercar"
            aria-label="Acercar"
            disabled={zoom >= ZOOM_MAX}
            onClick={() =>
              setZoom((prev) => Math.min(ZOOM_MAX, +(prev + ZOOM_PASO).toFixed(1)))
            }
          >
            <RiAddLine />
          </BtnZoom>
        </BarraZoom>
      )}
      {estado === "cargando" && <AvisoVista>Cargando transferencia…</AvisoVista>}
      {estado === "error" && (
        <AvisoVista>No se pudo previsualizar el PDF.</AvisoVista>
      )}
      <Hoja $oculto={estado !== "listo"}>
        <canvas ref={lienzoRef} />
      </Hoja>
    </Marco>
  );
}

export function VisorTransferenciasPanel({
  titulo,
  transferencias = [],
  transferenciaInicialId = null,
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
  const [imprimiendo, setImprimiendo] = useState(false);
  const [sentido, setSentido] = useState(() =>
    sentidoPorDefecto({ transferencias, ruta, sesion, transferenciaInicialId })
  );
  const visibles = useMemo(
    () =>
      transferencias.filter((item) =>
        sentido === "ingresos"
          ? esIngresoTransferencia(item, ruta)
          : esEgresoTransferencia(item, ruta, sucursales)
      ),
    [transferencias, ruta, sucursales, sentido]
  );
  const ids = visibles.map((item) => item.id).join(",");

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
    setSentido(
      sentidoPorDefecto({ transferencias, ruta, sesion, transferenciaInicialId })
    );
  }, [ruta?.id, sesion?.sucursal_id, transferenciaInicialId]);

  useEffect(() => {
    const lista = ids ? ids.split(",") : [];
    const i = lista.findIndex((id) => mismoId(id, transferenciaInicialId));
    setIndice(i >= 0 ? i : 0);
  }, [ruta?.id, transferenciaInicialId, ids]);

  const actual =
    visibles.length > 0 ? visibles[Math.min(indice, visibles.length - 1)] : null;
  const origen = actual
    ? sucursales.find((item) => mismoId(item.id, actual.origen_id))?.nombre ?? "—"
    : "";
  const destino = actual
    ? sucursales.find((item) => mismoId(item.id, actual.sucursal_id))?.nombre ?? "—"
    : "";
  const puedeGestionar = puedeGestionarItemTransferencia(sesion, actual, ruta);
  const puedeEliminar = puedeEliminarItemTransferencia(sesion, actual, ruta);
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
                {nombreDeTransferencia(actual)}
                <span>
                  {nombreDeGuia(actual)
                    ? `${nombreDeGuia(actual)} · ${origen} → ${destino}`
                    : `${origen} → ${destino}`}
                </span>
              </strong>
            ) : (
              <em>
                {sentido === "ingresos"
                  ? "Sin ingresos para verificar"
                  : "Sin egresos para verificar"}
              </em>
            )}
          </div>
          <BtnCerrar type="button" aria-label="Cerrar" onClick={onClose}>
            <RiCloseLine />
          </BtnCerrar>
        </Cabecera>

        <BarraMovimiento>
          <label htmlFor="visor-sentido">Movimiento</label>
          <select
            id="visor-sentido"
            value={sentido}
            onChange={(event) => setSentido(event.target.value)}
          >
            <option value="egresos">Egresos</option>
            <option value="ingresos">Ingresos</option>
          </select>
          <small>
            {sentido === "ingresos"
              ? "Mercadería que llega a las agencias o matriz destino de esta ruta."
              : "Mercadería que suben los destinos de esta ruta, u otras agencias o matrices hacia otra agencia o la matriz origen."}
          </small>
        </BarraMovimiento>

        {actual ? (
          <>
            <PdfHoja
              key={`${actual.id}:${actual.transferencia}:${sentido}`}
              path={actual.transferencia}
            />

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
                {indice + 1} / {visibles.length}
              </Contador>
              <BtnNav
                type="button"
                disabled={indice >= visibles.length - 1}
                onClick={() =>
                  setIndice((prev) => Math.min(visibles.length - 1, prev + 1))
                }
              >
                Siguiente
                <RiArrowRightSLine />
              </BtnNav>
            </Navegacion>

            <Acciones>
              <BtnAccion
                type="button"
                disabled={imprimiendo}
                onClick={async () => {
                  setImprimiendo(true);
                  try {
                    await imprimirPdfTransferencia(actual.transferencia);
                  } catch (error) {
                    console.error(error);
                    toast.error(error?.message || "No se pudo imprimir la transferencia.");
                  } finally {
                    setImprimiendo(false);
                  }
                }}
              >
                {imprimiendo ? "Imprimiendo..." : "Imprimir"}
              </BtnAccion>
              {puedeEditar && puedeGestionar && (
                <BtnAccion type="button" onClick={() => onEditar?.(actual)}>
                  Editar
                </BtnAccion>
              )}
              {puedeEditar && mostrarDevolver && (
                <BtnAccion type="button" onClick={() => onDevolver?.(actual)}>
                  A transitorio
                </BtnAccion>
              )}
              {puedeEditar && puedeEliminar && (
                <BtnAccion type="button" $peligro onClick={() => onEliminar?.(actual)}>
                  Eliminar
                </BtnAccion>
              )}
            </Acciones>
          </>
        ) : (
          <VacioVisor>
            {sentido === "ingresos"
              ? "No hay ingresos de mercadería hacia las agencias o matriz destino de esta ruta."
              : "No hay egresos de esta ruta."}
          </VacioVisor>
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
  width: min(96vw, 980px);
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

    span {
      display: block;
      margin-top: 2px;
      font-size: 0.78rem;
      font-weight: 600;
      color: #6d5c50;
    }
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

const BarraMovimiento = styled.div`
  display: grid;
  grid-template-columns: auto minmax(160px, 220px) 1fr;
  align-items: center;
  gap: 8px 12px;

  label {
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #666;
  }

  select {
    width: 100%;
    padding: 8px 10px;
    border: 1px solid #ccc;
    border-radius: 8px;
    font-size: 0.9rem;
    color: #222;
    background: #fff;

    &:focus {
      outline: none;
      border-color: #2e7d32;
      box-shadow: 0 0 0 2px rgba(46, 125, 50, 0.15);
    }
  }

  small {
    color: #6d5c50;
    font-size: 0.76rem;
    line-height: 1.35;
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;

    label {
      margin-bottom: -4px;
    }
  }
`;

const VacioVisor = styled.p`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 24px;
  border: 1px dashed #cfd8dc;
  border-radius: 10px;
  color: #666;
  font-size: 0.9rem;
  text-align: center;
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
  position: relative;
  flex: 1;
  min-height: 0;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  overflow: auto;
  background: #5d564d;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 12px;
`;

const BarraZoom = styled.div`
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 6px;
  align-self: flex-end;
  background: rgba(255, 255, 255, 0.94);
  border-radius: 8px;
  padding: 4px 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
`;

const BtnZoom = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid #cfd8dc;
  background: #fff;
  color: #333;
  border-radius: 6px;
  cursor: pointer;

  svg {
    width: 18px;
    height: 18px;
  }

  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
`;

const Porcentaje = styled.span`
  min-width: 44px;
  text-align: center;
  font-size: 0.78rem;
  font-weight: 700;
  color: #333;
`;

const Hoja = styled.div`
  display: ${({ $oculto }) => ($oculto ? "none" : "block")};
  background: #fff;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28);
  line-height: 0;
  margin: 0 auto;
`;

const AvisoVista = styled.p`
  margin: auto;
  color: #fff;
  font-size: 0.9rem;
  text-align: center;

  a {
    color: #c8e6c9;
    font-weight: 700;
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

  &:disabled {
    opacity: 0.6;
    cursor: wait;
  }
`;
