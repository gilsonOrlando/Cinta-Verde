import { useEffect, useState } from "react";
import styled from "styled-components";
import { urlArchivoTransferencia } from "../../supabase/crudTransferencia";

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

export function CargarTransferenciaModal({
  ruta,
  transferencias = [],
  guardando,
  onConfirmar,
  onClose,
}) {
  const [archivoTransferencia, setArchivoTransferencia] = useState(null);
  const [archivoGuia, setArchivoGuia] = useState(null);
  const [aviso, setAviso] = useState("");

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
    if (guardando || !archivoTransferencia || !archivoGuia) return;
    onConfirmar({ archivoTransferencia, archivoGuia });
  };

  return (
    <Overlay onClick={guardando ? undefined : onClose}>
      <Dialog
        role="dialog"
        aria-labelledby="cargar-transferencia-titulo"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="cargar-transferencia-titulo">Cargar transferencia</h2>
        <p>
          Cada transferencia lleva su guía. Arrastra los PDF o selecciónalos. Máximo 5 MB y
          3 páginas. Ruta: {ruta?.chofer ?? "—"}.
        </p>

        <Form onSubmit={handleSubmit}>
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

          {aviso && <Aviso>{aviso}</Aviso>}

          {transferencias.length > 0 && (
            <Lista>
              <span>Cargadas en esta ruta</span>
              {transferencias.map((item, index) => (
                <Fila key={item.id}>
                  <strong>#{index + 1}</strong>
                  <a href={urlArchivoTransferencia(item.transferencia)} target="_blank" rel="noreferrer">
                    Transferencia
                  </a>
                  <a href={urlArchivoTransferencia(item.guia)} target="_blank" rel="noreferrer">
                    Guía
                  </a>
                </Fila>
              ))}
            </Lista>
          )}

          <Footer>
            <BtnSecundario type="button" onClick={onClose} disabled={guardando}>
              Cancelar
            </BtnSecundario>
            <BtnPrimario
              type="submit"
              disabled={guardando || !archivoTransferencia || !archivoGuia}
            >
              {guardando ? "Subiendo..." : "Guardar ambos PDF"}
            </BtnPrimario>
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
  max-width: 720px;
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

  span {
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #888;
  }
`;

const Fila = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.86rem;

  strong {
    color: #1b5e20;
  }

  a {
    color: #2e7d32;
    font-weight: 600;
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
