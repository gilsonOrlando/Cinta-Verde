import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { ClipLoader } from "react-spinners";
import {
  generarDocumentoEtiqueta,
  generarDocumentoEtiquetasLote,
  getEtiquetaTipoLabel,
  imprimirDesdeIframe,
  TIPOS_ETIQUETA,
} from "../../utils/imprimirEtiqueta";
import {
  generarDocumentoEtiquetaMoto,
  generarDocumentoEtiquetasMotoLote,
} from "../../utils/imprimirEtiquetaMoto";

export function PreviewEtiquetaModal({
  producto,
  productos,
  tipo,
  datosEtiquetaMoto,
  onClose,
}) {
  const iframeRef = useRef(null);
  const [html, setHtml] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [resumenLote, setResumenLote] = useState(null);

  const esLote = Array.isArray(productos) && productos.length > 0;
  const esEtiquetaMoto =
    tipo === TIPOS_ETIQUETA.MEDIANA && Boolean(datosEtiquetaMoto);

  useEffect(() => {
    let activo = true;

    async function cargar() {
      setCargando(true);
      setError("");
      setResumenLote(null);

      try {
        if (esLote) {
          const resultado = esEtiquetaMoto
            ? await generarDocumentoEtiquetasMotoLote(productos, datosEtiquetaMoto)
            : await generarDocumentoEtiquetasLote(productos, tipo);

          if (activo) {
            setHtml(resultado.html);
            setResumenLote({
              totalEtiquetas: resultado.totalEtiquetas,
              totalHojas: resultado.totalHojas,
            });
          }
        } else {
          const resultado = esEtiquetaMoto
            ? await generarDocumentoEtiquetaMoto(producto, datosEtiquetaMoto)
            : await generarDocumentoEtiqueta(producto, tipo);

          if (activo) setHtml(resultado.html);
        }
      } catch (err) {
        console.error(err);
        if (activo) setError("No se pudo generar la vista previa.");
      } finally {
        if (activo) setCargando(false);
      }
    }

    cargar();
    return () => {
      activo = false;
    };
  }, [producto, productos, tipo, datosEtiquetaMoto, esLote, esEtiquetaMoto]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const handleImprimir = () => {
    try {
      imprimirDesdeIframe(iframeRef.current, { onAfterPrint: onClose });
    } catch (err) {
      console.error(err);
      setError("No se pudo abrir el diálogo de impresión.");
    }
  };

  const titulo = esLote ? "Vista previa de etiquetas" : "Vista previa de etiqueta";

  const subtitulo = esLote
    ? `${resumenLote?.totalEtiquetas ?? "…"} etiqueta(s) · ${resumenLote?.totalHojas ?? "…"} hoja(s) · ${getEtiquetaTipoLabel(tipo)}`
    : `${producto.producto} · COD: ${producto.codigo} · ${getEtiquetaTipoLabel(tipo)}`;

  const iframeTitle = esLote
    ? "Vista previa etiquetas lote"
    : `Vista previa etiqueta ${producto.codigo}`;

  return (
    <Overlay onClick={onClose} role="presentation">
      <Dialog
        role="dialog"
        aria-modal="true"
        aria-labelledby="preview-etiqueta-titulo"
        onClick={(event) => event.stopPropagation()}
        $esLote={esLote}
      >
        <DialogHeader>
          <div>
            <Titulo id="preview-etiqueta-titulo">{titulo}</Titulo>
            <Subtitulo>{subtitulo}</Subtitulo>
          </div>
          <BtnCerrar type="button" onClick={onClose} aria-label="Cerrar">
            ×
          </BtnCerrar>
        </DialogHeader>

        <PreviewArea $esLote={esLote}>
          {cargando && (
            <EstadoCentrado>
              <ClipLoader color="#e53935" size={36} />
              <span>{esLote ? "Generando etiquetas…" : "Generando etiqueta…"}</span>
            </EstadoCentrado>
          )}

          {!cargando && error && (
            <EstadoCentrado>
              <span>{error}</span>
            </EstadoCentrado>
          )}

          {!cargando && !error && html && (
            <IframePreview
              ref={iframeRef}
              title={iframeTitle}
              srcDoc={html}
              $esLote={esLote}
            />
          )}
        </PreviewArea>

        <DialogFooter>
          <BtnSecundario type="button" onClick={onClose}>
            Cancelar
          </BtnSecundario>
          <BtnImprimir type="button" onClick={handleImprimir} disabled={cargando || !!error}>
            Imprimir
          </BtnImprimir>
        </DialogFooter>
      </Dialog>
    </Overlay>
  );
}

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
`;

const Dialog = styled.div`
  width: 100%;
  max-width: ${({ $esLote }) => ($esLote ? "820px" : "720px")};
  max-height: min(90vh, ${({ $esLote }) => ($esLote ? "760px" : "640px")});
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.22);
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const DialogHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px 14px;
  border-bottom: 1px solid #eee;
`;

const Titulo = styled.h3`
  margin: 0 0 4px;
  font-size: 1.1rem;
  color: #222;
`;

const Subtitulo = styled.p`
  margin: 0;
  font-size: 0.82rem;
  color: #666;
  line-height: 1.4;
`;

const BtnCerrar = styled.button`
  border: none;
  background: #f3f3f3;
  color: #555;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  font-size: 1.4rem;
  line-height: 1;
  cursor: pointer;
  flex-shrink: 0;

  &:hover {
    background: #e8e8e8;
    color: #222;
  }
`;

const PreviewArea = styled.div`
  flex: 1;
  min-height: ${({ $esLote }) => ($esLote ? "360px" : "280px")};
  background: #525659;
  position: relative;
  overflow: auto;
`;

const IframePreview = styled.iframe`
  width: 100%;
  height: 100%;
  min-height: ${({ $esLote }) => ($esLote ? "480px" : "320px")};
  border: none;
  display: block;
  background: #525659;
`;

const EstadoCentrado = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #fff;
  font-size: 0.9rem;
`;

const DialogFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid #eee;
  background: #fafafa;
`;

const BtnBase = styled.button`
  padding: 10px 18px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease, opacity 0.2s ease;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const BtnSecundario = styled(BtnBase)`
  border: 1px solid #ccc;
  background: #fff;
  color: #444;

  &:hover:not(:disabled) {
    background: #f3f3f3;
  }
`;

const BtnImprimir = styled(BtnBase)`
  border: 1px solid #e53935;
  background: #e53935;
  color: #fff;

  &:hover:not(:disabled) {
    background: #c62828;
    border-color: #c62828;
  }
`;
