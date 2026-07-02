import { useEffect, useState } from "react";
import styled from "styled-components";
import toast from "react-hot-toast";
import { buscarMotoPorChasis } from "../../supabase/crudMotos";
import { supabaseConfigurado } from "../../supabase/supabase.config";
import { interpretarErrorSupabase } from "../../utils/interpretarErrorSupabase";
import { formatearFechaProyecto } from "../../utils/tomaFisicaReporte";

export function BuscarMotoChasisModal({ onClose }) {
  const [chasis, setChasis] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [resultado, setResultado] = useState(null);

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

  const handleBuscar = async (event) => {
    event?.preventDefault();

    const termino = chasis.trim();
    if (!termino) {
      toast.error("Ingresa un número de chasis.");
      return;
    }

    if (!supabaseConfigurado) {
      toast.error(interpretarErrorSupabase());
      return;
    }

    setBuscando(true);
    setResultado(null);

    try {
      const moto = await buscarMotoPorChasis(termino);

      if (!moto) {
        toast.error("No se encontró una moto con ese chasis.");
        return;
      }

      setResultado(moto);
    } catch (error) {
      console.error(error);
      toast.error(interpretarErrorSupabase(error));
    } finally {
      setBuscando(false);
    }
  };

  return (
    <Overlay onClick={onClose} role="presentation">
      <Dialog
        role="dialog"
        aria-modal="true"
        aria-labelledby="buscar-moto-titulo"
        onClick={(event) => event.stopPropagation()}
      >
        <DialogHeader>
          <div>
            <Titulo id="buscar-moto-titulo">Buscar moto por chasis</Titulo>
            <Subtitulo>Consulta un registro guardado al imprimir etiquetas de motos.</Subtitulo>
          </div>
          <BtnCerrar type="button" onClick={onClose} aria-label="Cerrar">
            ×
          </BtnCerrar>
        </DialogHeader>

        <Contenido>
          <FormBusqueda onSubmit={handleBuscar}>
            <Campo>
              <label htmlFor="busqueda-chasis">Número de chasis</label>
              <input
                id="busqueda-chasis"
                type="search"
                value={chasis}
                onChange={(event) => setChasis(event.target.value)}
                placeholder="Ej. LZSPCKLN7V1000621"
                autoFocus
              />
            </Campo>
            <BtnBuscar type="submit" disabled={buscando}>
              {buscando ? "Buscando..." : "Buscar"}
            </BtnBuscar>
          </FormBusqueda>

          {resultado && (
            <Resultado>
              <ResultadoTitulo>Registro encontrado</ResultadoTitulo>
              <Grid>
                <Item>
                  <span>Código</span>
                  <strong>{resultado.codigo}</strong>
                </Item>
                <Item>
                  <span>Producto</span>
                  <strong>{resultado.producto}</strong>
                </Item>
                <Item>
                  <span>Chasis</span>
                  <strong>{resultado.chasis}</strong>
                </Item>
                <Item>
                  <span>Motor</span>
                  <strong>{resultado.motor}</strong>
                </Item>
                <Item>
                  <span>CAM / CPM / RAMW</span>
                  <strong>{resultado.cam_cpm_ramw}</strong>
                </Item>
                <Item>
                  <span>Agencia</span>
                  <strong>{resultado.agencia ?? "—"}</strong>
                </Item>
                <Item $completo>
                  <span>Enlace MEGA</span>
                  <strong>{resultado.link_mega ?? "—"}</strong>
                </Item>
                <Item>
                  <span>Transferencia</span>
                  <strong>{resultado.transferencia_numero ?? "—"}</strong>
                </Item>
                <Item>
                  <span>Última actualización</span>
                  <strong>{formatearFechaProyecto(resultado.updated_at)}</strong>
                </Item>
              </Grid>
            </Resultado>
          )}
        </Contenido>

        <DialogFooter>
          <BtnSecundario type="button" onClick={onClose}>
            Cerrar
          </BtnSecundario>
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
  max-width: 640px;
  max-height: min(90vh, 720px);
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

const Contenido = styled.div`
  overflow-y: auto;
  padding: 16px 20px 20px;
`;

const FormBusqueda = styled.form`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  align-items: end;

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

const Campo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;

  label {
    font-size: 0.78rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #666;
  }

  input {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #ccc;
    border-radius: 8px;
    font-size: 0.95rem;
    color: #222;
    font-family: Consolas, "Courier New", monospace;
    letter-spacing: 0.04em;

    &:focus {
      outline: none;
      border-color: #e53935;
      box-shadow: 0 0 0 2px rgba(229, 57, 53, 0.15);
    }
  }
`;

const BtnBuscar = styled.button`
  border: 1px solid #e53935;
  background: #e53935;
  color: #fff;
  padding: 10px 18px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  height: 42px;

  &:hover:not(:disabled) {
    background: #c62828;
    border-color: #c62828;
  }

  &:disabled {
    opacity: 0.7;
    cursor: wait;
  }
`;

const Resultado = styled.section`
  margin-top: 18px;
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  background: #fafafa;
  padding: 16px;
`;

const ResultadoTitulo = styled.h4`
  margin: 0 0 12px;
  font-size: 0.9rem;
  color: #2e7d32;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

const Item = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  grid-column: ${({ $completo }) => ($completo ? "1 / -1" : "auto")};

  span {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #888;
    font-weight: 600;
  }

  strong {
    font-size: 0.92rem;
    color: #222;
    word-break: break-word;
  }
`;

const DialogFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid #eee;
  background: #fafafa;
`;

const BtnSecundario = styled.button`
  border: 1px solid #ccc;
  background: #fff;
  color: #444;
  padding: 10px 18px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background: #f3f3f3;
  }
`;
