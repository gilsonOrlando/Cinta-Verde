import { useEffect } from "react";
import styled from "styled-components";
import { buildHtmlTomaFisica, descargarPdfTomaFisica } from "../../utils/generarPdfTomaFisica";
import { formatearFechaProyecto } from "../../utils/tomaFisicaReporte";

export function PreviewTomaFisicaModal({ proyecto, productos, onClose }) {
  const html = buildHtmlTomaFisica({ proyecto, productos });

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

  const handleDescargar = () => {
    descargarPdfTomaFisica({ proyecto, productos });
  };

  return (
    <Overlay onClick={onClose} role="presentation">
      <Dialog
        role="dialog"
        aria-modal="true"
        aria-labelledby="preview-toma-fisica-titulo"
        onClick={(event) => event.stopPropagation()}
      >
        <DialogHeader>
          <div>
            <Titulo id="preview-toma-fisica-titulo">Vista previa de toma física</Titulo>
            <Subtitulo>
              {proyecto.nombre} · Código {proyecto.codigo_acceso} ·{" "}
              {formatearFechaProyecto(proyecto.created_at)}
            </Subtitulo>
          </div>
          <BtnCerrar type="button" onClick={onClose} aria-label="Cerrar">
            ×
          </BtnCerrar>
        </DialogHeader>

        <PreviewArea>
          <IframePreview title="Vista previa toma física" srcDoc={html} />
        </PreviewArea>

        <DialogFooter>
          <BtnSecundario type="button" onClick={onClose}>
            Cerrar
          </BtnSecundario>
          <BtnDescargar type="button" onClick={handleDescargar}>
            Descargar PDF
          </BtnDescargar>
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
  max-width: 960px;
  max-height: min(92vh, 820px);
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
  min-height: 420px;
  background: #525659;
  overflow: auto;
`;

const IframePreview = styled.iframe`
  width: 100%;
  height: 100%;
  min-height: 520px;
  border: none;
  display: block;
  background: #fff;
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
`;

const BtnSecundario = styled(BtnBase)`
  border: 1px solid #ccc;
  background: #fff;
  color: #444;

  &:hover {
    background: #f3f3f3;
  }
`;

const BtnDescargar = styled(BtnBase)`
  border: 1px solid #e53935;
  background: #e53935;
  color: #fff;

  &:hover {
    background: #c62828;
    border-color: #c62828;
  }
`;
