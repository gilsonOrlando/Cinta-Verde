import { useEffect, useState } from "react";
import styled from "styled-components";
import { ClipLoader } from "react-spinners";
import {
  esCodigoAccesoValido,
  generarCodigoAcceso,
  normalizarCodigoAcceso,
} from "../../utils/codigoAcceso";

export function CrearProyectoModal({
  nombreArchivo,
  totalProductos,
  guardando,
  onConfirmar,
  onClose,
}) {
  const [nombre, setNombre] = useState("");
  const [codigoAcceso, setCodigoAcceso] = useState(() => generarCodigoAcceso());
  const [errorCodigo, setErrorCodigo] = useState("");

  useEffect(() => {
    if (!nombreArchivo) {
      setNombre("");
      return;
    }

    const base = nombreArchivo.replace(/\.(xls|xlsx)$/i, "").trim();
    setNombre(base || "");
  }, [nombreArchivo]);

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

  const handleCodigoChange = (event) => {
    const valor = normalizarCodigoAcceso(event.target.value);
    setCodigoAcceso(valor);
    setErrorCodigo("");
  };

  const handleGenerarCodigo = () => {
    setCodigoAcceso(generarCodigoAcceso());
    setErrorCodigo("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const nombreValor = nombre.trim();
    const codigoValor = normalizarCodigoAcceso(codigoAcceso);

    if (!nombreValor || guardando) return;

    if (!esCodigoAccesoValido(codigoValor)) {
      setErrorCodigo("Usa entre 4 y 12 caracteres (letras y números).");
      return;
    }

    onConfirmar({ nombre: nombreValor, codigoAcceso: codigoValor });
  };

  const codigoValido = esCodigoAccesoValido(codigoAcceso);

  return (
    <Overlay onClick={guardando ? undefined : onClose}>
      <Dialog
        role="dialog"
        aria-labelledby="crear-proyecto-titulo"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="crear-proyecto-titulo">Crear proyecto</h2>
        <p>
          Guarda esta toma física y define un código de acceso. En la app móvil el usuario
          ingresará ese código para conectarse, escanear productos y contabilizar la cantidad
          física frente a la del sistema.
        </p>

        <Resumen>
          <span>{totalProductos} producto(s) listos para guardar</span>
          {nombreArchivo && <small>Archivo: {nombreArchivo}</small>}
        </Resumen>

        <Form onSubmit={handleSubmit}>
          <label htmlFor="nombre-proyecto">Nombre del proyecto</label>
          <input
            id="nombre-proyecto"
            type="text"
            value={nombre}
            onChange={(event) => setNombre(event.target.value)}
            placeholder="Ej. Toma física bodega norte - marzo"
            disabled={guardando}
            autoFocus
          />

          <label htmlFor="codigo-acceso">Código de acceso (app móvil)</label>
          <CodigoFila>
            <InputCodigo
              id="codigo-acceso"
              type="text"
              value={codigoAcceso}
              onChange={handleCodigoChange}
              placeholder="Ej. TF8K2MNP"
              disabled={guardando}
              maxLength={12}
              autoComplete="off"
              spellCheck={false}
            />
            <BtnGenerar type="button" onClick={handleGenerarCodigo} disabled={guardando}>
              Generar
            </BtnGenerar>
          </CodigoFila>
          <AyudaCodigo>
            Comparte este código con quien hará la toma física desde el celular.
          </AyudaCodigo>
          {errorCodigo && <ErrorCodigo>{errorCodigo}</ErrorCodigo>}

          <Acciones>
            <BtnSecundario type="button" onClick={onClose} disabled={guardando}>
              Cancelar
            </BtnSecundario>
            <BtnPrimario
              type="submit"
              disabled={guardando || !nombre.trim() || !codigoValido}
            >
              {guardando ? (
                <>
                  <ClipLoader size={16} color="#fff" />
                  Guardando...
                </>
              ) : (
                "Guardar proyecto"
              )}
            </BtnPrimario>
          </Acciones>
        </Form>
      </Dialog>
    </Overlay>
  );
}

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 1000;
`;

const Dialog = styled.div`
  width: 100%;
  max-width: 520px;
  background: #fff;
  border-radius: 14px;
  padding: 24px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.18);

  h2 {
    margin: 0 0 8px;
    font-size: 1.25rem;
    color: #222;
  }

  p {
    margin: 0 0 16px;
    color: #666;
    line-height: 1.5;
    font-size: 0.95rem;
  }
`;

const Resumen = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 14px;
  margin-bottom: 16px;
  border-radius: 10px;
  background: #fafafa;
  border: 1px solid #e8e8e8;

  span {
    color: #222;
    font-weight: 600;
    font-size: 0.92rem;
  }

  small {
    color: #888;
    font-size: 0.82rem;
    word-break: break-all;
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 8px;

  label {
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #888;
    font-weight: 600;
  }

  input {
    padding: 11px 12px;
    border: 1px solid #ccc;
    border-radius: 8px;
    font-size: 0.95rem;
    color: #222;

    &:focus {
      outline: none;
      border-color: #e53935;
      box-shadow: 0 0 0 2px rgba(229, 57, 53, 0.15);
    }

    &:disabled {
      background: #f5f5f5;
      cursor: not-allowed;
    }
  }
`;

const CodigoFila = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
`;

const InputCodigo = styled.input`
  flex: 1;
  font-family: "Consolas", "Courier New", monospace;
  letter-spacing: 0.08em;
  font-weight: 700;
`;

const BtnGenerar = styled.button`
  border: 1px solid #ddd;
  background: #fff;
  color: #444;
  padding: 11px 14px;
  border-radius: 8px;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;

  &:hover:not(:disabled) {
    border-color: #e53935;
    color: #e53935;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const AyudaCodigo = styled.p`
  margin: 0;
  color: #888;
  font-size: 0.82rem;
  line-height: 1.4;
`;

const ErrorCodigo = styled.p`
  margin: 0;
  color: #c62828;
  font-size: 0.82rem;
`;

const Acciones = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 12px;
`;

const BtnSecundario = styled.button`
  border: 1px solid #ddd;
  background: #fff;
  color: #444;
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const BtnPrimario = styled.button`
  border: 1px solid #e53935;
  background: #e53935;
  color: #fff;
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;

  &:hover:not(:disabled) {
    background: #c62828;
    border-color: #c62828;
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;
