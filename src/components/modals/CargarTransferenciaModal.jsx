import { useEffect, useState } from "react";
import styled from "styled-components";
import { urlArchivoTransferencia } from "../../supabase/crudTransferencia";

export function CargarTransferenciaModal({
  ruta,
  transferencias = [],
  guardando,
  onConfirmar,
  onClose,
}) {
  const [archivoTransferencia, setArchivoTransferencia] = useState(null);
  const [archivoGuia, setArchivoGuia] = useState(null);

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

  const handleSubmit = (event) => {
    event.preventDefault();
    if (guardando) return;
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
          Cada transferencia lleva su guía. Ambos PDF son obligatorios, de máximo 5 MB y
          3 páginas. Ruta: {ruta?.chofer ?? "—"}.
        </p>

        <Form onSubmit={handleSubmit}>
          <Grid>
            <Campo>
              <label htmlFor="pdf-transferencia">PDF transferencia</label>
              <input
                id="pdf-transferencia"
                type="file"
                accept="application/pdf,.pdf"
                disabled={guardando}
                required
                onChange={(event) => setArchivoTransferencia(event.target.files?.[0] ?? null)}
              />
            </Campo>
            <Campo>
              <label htmlFor="pdf-guia">PDF guía</label>
              <input
                id="pdf-guia"
                type="file"
                accept="application/pdf,.pdf"
                disabled={guardando}
                required
                onChange={(event) => setArchivoGuia(event.target.files?.[0] ?? null)}
              />
            </Campo>
          </Grid>

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
  max-width: 640px;
  max-height: min(90vh, 720px);
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

  input[type="file"] {
    width: 100%;
    padding: 10px 8px;
    border: 1px solid #ccc;
    border-radius: 8px;
    font-size: 0.82rem;
    background: #fff;
  }
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
