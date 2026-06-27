import { useEffect, useState } from "react";
import styled from "styled-components";
import toast from "react-hot-toast";
import { supabaseConfigurado } from "../../supabase/supabase.config";
import {
  buscarListaProductos,
  registrarListaProductosNuevos,
} from "../../supabase/crudListaProductos";
import { interpretarErrorSupabase } from "../../utils/interpretarErrorSupabase";

export function EtiquetaCodigoModal({ onAgregar, onClose }) {
  const [codigo, setCodigo] = useState("");
  const [producto, setProducto] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [guardando, setGuardando] = useState(false);

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

  const construirProducto = () => {
    const codigoLimpio = codigo.trim();
    const productoLimpio = producto.trim();

    if (!codigoLimpio) {
      toast.error("Ingresa un código.");
      return null;
    }

    if (!productoLimpio) {
      toast.error("Ingresa el nombre del producto.");
      return null;
    }

    return { codigo: codigoLimpio, producto: productoLimpio, cantidad: 1 };
  };

  const guardarEnCatalogo = async (item) => {
    if (!supabaseConfigurado) return;

    try {
      const { insertados } = await registrarListaProductosNuevos([item]);
      if (insertados > 0) {
        toast.success("Producto guardado en lista.");
      }
    } catch (error) {
      console.error(error);
      toast.error(interpretarErrorSupabase(error));
    }
  };

  const handleBuscar = async (event) => {
    event?.preventDefault();

    const termino = busqueda.trim();
    if (!termino) {
      toast.error("Escribe un código o nombre para buscar.");
      return;
    }

    if (!supabaseConfigurado) {
      toast.error("Supabase no está configurado.");
      return;
    }

    setBuscando(true);

    try {
      const items = await buscarListaProductos(termino);
      setResultados(items);

      if (items.length === 0) {
        toast.error("No se encontraron productos en la lista.");
      }
    } catch (error) {
      console.error(error);
      toast.error(interpretarErrorSupabase(error));
    } finally {
      setBuscando(false);
    }
  };

  const handleAgregarResultado = (item) => {
    const productoItem = { codigo: item.codigo, producto: item.producto, cantidad: 1 };
    const agregado = onAgregar(productoItem);
    if (agregado !== false) {
      onClose();
    }
  };

  const handleAgregar = async (event) => {
    event.preventDefault();

    const item = construirProducto();
    if (!item) return;

    setGuardando(true);
    try {
      await guardarEnCatalogo(item);
      const agregado = onAgregar(item);
      if (agregado !== false) {
        onClose();
      }
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Overlay onClick={onClose} role="presentation">
      <Dialog
        role="dialog"
        aria-modal="true"
        aria-labelledby="etiqueta-codigo-titulo"
        onClick={(event) => event.stopPropagation()}
      >
        <DialogHeader>
          <div>
            <Titulo id="etiqueta-codigo-titulo">Generar etiqueta con código</Titulo>
            <Subtitulo>
              Busca un producto guardado o ingresa código y nombre para agregar a la tabla.
            </Subtitulo>
          </div>
          <BtnCerrar type="button" onClick={onClose} aria-label="Cerrar">
            ×
          </BtnCerrar>
        </DialogHeader>

        <Contenido>
          <Seccion>
            <SeccionTitulo>Buscar producto guardado</SeccionTitulo>
            <FormBusqueda onSubmit={handleBuscar}>
              <Campo>
                <label htmlFor="busqueda-catalogo">Código o nombre</label>
                <input
                  id="busqueda-catalogo"
                  type="search"
                  value={busqueda}
                  onChange={(event) => setBusqueda(event.target.value)}
                  placeholder="Ej. 12345 o FILTRO ACEITE"
                />
              </Campo>
              <BtnBuscar type="submit" disabled={buscando}>
                {buscando ? "Buscando..." : "Buscar"}
              </BtnBuscar>
            </FormBusqueda>

            {resultados.length > 0 && (
              <Resultados>
                {resultados.map((item) => (
                  <ResultadoItem key={item.id}>
                    <ResultadoInfo>
                      <strong>{item.codigo}</strong>
                      <span>{item.producto}</span>
                    </ResultadoInfo>
                    <ResultadoAcciones>
                      <BtnPrimario type="button" onClick={() => handleAgregarResultado(item)}>
                        Agregar
                      </BtnPrimario>
                    </ResultadoAcciones>
                  </ResultadoItem>
                ))}
              </Resultados>
            )}
          </Seccion>

          <Separador />

          <Seccion>
            <SeccionTitulo>Crear etiqueta manual</SeccionTitulo>
            <FormManual onSubmit={handleAgregar}>
              <GridCampos>
                <Campo>
                  <label htmlFor="codigo-manual">Código</label>
                  <input
                    id="codigo-manual"
                    type="text"
                    value={codigo}
                    onChange={(event) => setCodigo(event.target.value)}
                    placeholder="Ej. 12345"
                    autoFocus
                  />
                </Campo>
                <Campo>
                  <label htmlFor="producto-manual">Producto</label>
                  <input
                    id="producto-manual"
                    type="text"
                    value={producto}
                    onChange={(event) => setProducto(event.target.value)}
                    placeholder="Nombre del producto"
                  />
                </Campo>
              </GridCampos>

              <DialogFooter>
                <BtnSecundario type="button" onClick={onClose} disabled={guardando}>
                  Cancelar
                </BtnSecundario>
                <BtnPrimario type="submit" disabled={guardando}>
                  Agregar a tabla
                </BtnPrimario>
              </DialogFooter>
            </FormManual>
          </Seccion>
        </Contenido>
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
  max-width: 560px;
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

const Seccion = styled.section`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const SeccionTitulo = styled.h4`
  margin: 0;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #888;
  font-weight: 700;
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

const FormManual = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const GridCampos = styled.div`
  display: grid;
  grid-template-columns: 1fr 1.4fr;
  gap: 12px;

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

const Separador = styled.hr`
  border: none;
  border-top: 1px solid #eee;
  margin: 18px 0;
`;

const Resultados = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const ResultadoItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  background: #fafafa;

  @media (max-width: 520px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const ResultadoInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;

  strong {
    color: #222;
    font-size: 0.92rem;
  }

  span {
    color: #666;
    font-size: 0.85rem;
    word-break: break-word;
  }
`;

const ResultadoAcciones = styled.div`
  display: flex;
  gap: 8px;
  flex-shrink: 0;
`;

const DialogFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 10px;
  padding-top: 4px;
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

  &:hover:not(:disabled) {
    border-color: #e53935;
    color: #e53935;
  }

  &:disabled {
    opacity: 0.7;
    cursor: wait;
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

  &:hover:not(:disabled) {
    background: #c62828;
    border-color: #c62828;
  }

  &:disabled {
    opacity: 0.7;
    cursor: wait;
  }
`;
