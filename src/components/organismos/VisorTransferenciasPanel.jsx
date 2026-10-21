import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { RiArrowLeftSLine, RiArrowRightSLine, RiCloseLine } from "react-icons/ri";
import { esRutaTransitoria } from "../../supabase/crudRuta";
import {
  obtenerBufferArchivoTransferencia,
  puedeGestionarItemTransferencia,
} from "../../supabase/crudTransferencia";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const FRACCION_VISIBLE = 0.62;

export const ICONO_VERIFICAR_TRANSFERENCIAS = "/iconos/verificar-transferencias.png";

function mismoId(a, b) {
  return String(a ?? "") === String(b ?? "");
}

function PdfHoja({ path }) {
  const marcoRef = useRef(null);
  const lienzoRef = useRef(null);
  const bufferRef = useRef(null);
  const [estado, setEstado] = useState("cargando");
  const [tamano, setTamano] = useState({ ancho: 0, alto: 0 });

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
        const escala = Math.min(
          ancho / base.width,
          alto / (base.height * FRACCION_VISIBLE)
        );
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
  }, [estado, path, tamano.ancho, tamano.alto]);

  return (
    <Marco ref={marcoRef}>
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
            <PdfHoja path={actual.transferencia} />

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
  overflow: auto;
  background: #5d564d;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 12px;
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
`;
