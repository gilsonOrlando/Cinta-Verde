import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import toast from "react-hot-toast";
import { TIPOS_ETIQUETA } from "../../utils/imprimirEtiqueta";
import { PreviewEtiquetaModal } from "../modals/PreviewEtiquetaModal";
import { DatosEtiquetaMotoModal } from "../modals/DatosEtiquetaMotoModal";
import { supabaseConfigurado } from "../../supabase/supabase.config";
import {
  buscarCatalogoProductos,
  registrarProductosNuevos,
} from "../../supabase/crudCatalogoProductos";
import { interpretarErrorSupabase } from "../../utils/interpretarErrorSupabase";

export function TransferenciaResultado({
  data,
  nombreArchivo,
  soloEtiquetaMediana = false,
  tituloTabla = "Productos",
}) {
  const { numero, bodegaOrigen, bodegaDestino, productos } = data;
  const [tipoEtiqueta, setTipoEtiqueta] = useState(
    soloEtiquetaMediana ? TIPOS_ETIQUETA.MEDIANA : TIPOS_ETIQUETA.PEQUENA
  );
  const [previewItem, setPreviewItem] = useState(null);
  const [previewLote, setPreviewLote] = useState(false);
  const [datosEtiquetaMoto, setDatosEtiquetaMoto] = useState(null);
  const [formMoto, setFormMoto] = useState(null);
  const [productosList, setProductosList] = useState(productos);
  const [codigoManual, setCodigoManual] = useState("");
  const [productoManual, setProductoManual] = useState("");
  const [busquedaCatalogo, setBusquedaCatalogo] = useState("");
  const [resultadosCatalogo, setResultadosCatalogo] = useState([]);
  const [buscandoCatalogo, setBuscandoCatalogo] = useState(false);

  const productosKey = useMemo(
    () => productos.map((item) => `${item.codigo}:${item.producto}`).join("|"),
    [productos]
  );

  useEffect(() => {
    setProductosList(productos);
  }, [productos]);

  useEffect(() => {
    if (!supabaseConfigurado || !productos.length) return;

    let cancelado = false;

    (async () => {
      try {
        const { insertados } = await registrarProductosNuevos(productos);
        if (!cancelado && insertados > 0) {
          toast.success(`${insertados} producto(s) nuevo(s) guardado(s) en catálogo.`);
        }
      } catch (error) {
        console.error(error);
        if (!cancelado) {
          toast.error(interpretarErrorSupabase(error));
        }
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [productosKey]);

  const handleImprimir = (item) => {
    setPreviewLote(false);
    setDatosEtiquetaMoto(null);

    if (soloEtiquetaMediana) {
      setFormMoto({ modo: "single", item });
      return;
    }

    setPreviewItem(item);
  };

  const handleImprimirTodo = () => {
    setPreviewItem(null);
    setDatosEtiquetaMoto(null);

    if (soloEtiquetaMediana) {
      setFormMoto({ modo: "lote", items: productosList });
      return;
    }

    setPreviewLote(true);
  };

  const handleConfirmarDatosMoto = (datos) => {
    const modo = formMoto?.modo;
    const item = formMoto?.item;

    setDatosEtiquetaMoto(datos);
    setFormMoto(null);

    if (modo === "lote") {
      setPreviewLote(true);
      return;
    }

    setPreviewItem(item ?? null);
  };

  const cerrarPreview = () => {
    setPreviewItem(null);
    setPreviewLote(false);
    setDatosEtiquetaMoto(null);
  };

  const handleCrearCodigo = async () => {
    const codigo = codigoManual.trim();
    const producto = productoManual.trim();

    if (!codigo) {
      toast.error("Ingresa un código.");
      return;
    }

    if (!producto) {
      toast.error("Ingresa el nombre del producto.");
      return;
    }

    const nuevo = { codigo, producto, cantidad: 1 };

    setProductosList((prev) => [...prev, nuevo]);
    setCodigoManual("");
    setProductoManual("");
    toast.success("Etiqueta agregada a la tabla.");

    if (!supabaseConfigurado) return;

    try {
      const { insertados } = await registrarProductosNuevos([nuevo]);
      if (insertados > 0) {
        toast.success("Producto guardado en catálogo.");
      }
    } catch (error) {
      console.error(error);
      toast.error(interpretarErrorSupabase(error));
    }
  };

  const handleBuscarCatalogo = async () => {
    const termino = busquedaCatalogo.trim();

    if (!termino) {
      toast.error("Escribe un código o nombre para buscar.");
      return;
    }

    if (!supabaseConfigurado) {
      toast.error("Supabase no está configurado.");
      return;
    }

    setBuscandoCatalogo(true);

    try {
      const resultados = await buscarCatalogoProductos(termino);
      setResultadosCatalogo(resultados);

      if (resultados.length === 0) {
        toast.error("No se encontraron productos en el catálogo.");
      }
    } catch (error) {
      console.error(error);
      toast.error(interpretarErrorSupabase(error));
    } finally {
      setBuscandoCatalogo(false);
    }
  };

  const handleCatalogoKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleBuscarCatalogo();
    }
  };

  const agregarDesdeCatalogo = (item) => {
    const existe = productosList.some((producto) => producto.codigo === item.codigo);
    if (existe) {
      toast.error("Ese código ya está en la tabla.");
      return;
    }

    setProductosList((prev) => [
      ...prev,
      { codigo: item.codigo, producto: item.producto, cantidad: 1 },
    ]);
    toast.success("Producto agregado desde catálogo.");
  };

  const handleManualKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleCrearCodigo();
    }
  };

  return (
    <Wrapper>
      {nombreArchivo && <Archivo>{nombreArchivo}</Archivo>}

      <Encabezado>
        <Campo>
          <label>Número de transferencia</label>
          <strong>{numero ?? "—"}</strong>
        </Campo>
        <Campo>
          <label>Bodega origen</label>
          <strong>{bodegaOrigen ?? "—"}</strong>
        </Campo>
        <Campo>
          <label>Bodega destino</label>
          <strong>{bodegaDestino ?? "—"}</strong>
        </Campo>
      </Encabezado>

      <SeccionTabla>
        <TablaHeader>
          <TablaHeaderInfo>
            <h2>{tituloTabla}</h2>
            <span>
              {productosList.length === 1
                ? "1 producto encontrado"
                : `${productosList.length} productos encontrados`}
            </span>
          </TablaHeaderInfo>
          {productosList.length > 0 && (
            <BtnImprimirTodo type="button" onClick={handleImprimirTodo}>
              Imprimir todo
            </BtnImprimirTodo>
          )}
        </TablaHeader>

        <SelectorTipo>
          {soloEtiquetaMediana ? (
            <EtiquetaFija>
              <strong>Etiqueta mediana</strong>
              <span>70 × 51 mm · 1 etiqueta por producto</span>
            </EtiquetaFija>
          ) : (
            <>
              <SelectorLabel>Tipo de etiqueta</SelectorLabel>
              <RadioGroup>
                <RadioOption>
                  <input
                    type="radio"
                    name="tipo-etiqueta"
                    value={TIPOS_ETIQUETA.PEQUENA}
                    checked={tipoEtiqueta === TIPOS_ETIQUETA.PEQUENA}
                    onChange={() => setTipoEtiqueta(TIPOS_ETIQUETA.PEQUENA)}
                  />
                  <RadioText>
                    <strong>Pequeña</strong>
                    <span>105 × 28 mm · 3 por fila (márgenes 2 mm, separación 3 mm)</span>
                  </RadioText>
                </RadioOption>

                <RadioOption>
                  <input
                    type="radio"
                    name="tipo-etiqueta"
                    value={TIPOS_ETIQUETA.MEDIANA}
                    checked={tipoEtiqueta === TIPOS_ETIQUETA.MEDIANA}
                    onChange={() => setTipoEtiqueta(TIPOS_ETIQUETA.MEDIANA)}
                  />
                  <RadioText>
                    <strong>Mediana</strong>
                    <span>70 × 51 mm · 1 etiqueta</span>
                  </RadioText>
                </RadioOption>
              </RadioGroup>
            </>
          )}

          <ManualCodigo>
            <ManualLabel>Buscar producto guardado</ManualLabel>
            <ManualGrid>
              <InputProducto
                type="search"
                value={busquedaCatalogo}
                onChange={(event) => setBusquedaCatalogo(event.target.value)}
                onKeyDown={handleCatalogoKeyDown}
                placeholder="Código o nombre del producto"
              />
              <BtnCrear type="button" onClick={handleBuscarCatalogo} disabled={buscandoCatalogo}>
                {buscandoCatalogo ? "Buscando..." : "Buscar"}
              </BtnCrear>
            </ManualGrid>

            {resultadosCatalogo.length > 0 && (
              <CatalogoResultados>
                {resultadosCatalogo.map((item) => (
                  <CatalogoItem key={item.id}>
                    <CatalogoInfo>
                      <strong>{item.codigo}</strong>
                      <span>{item.producto}</span>
                    </CatalogoInfo>
                    <CatalogoAcciones>
                      <BtnCatalogoSecundario type="button" onClick={() => agregarDesdeCatalogo(item)}>
                        Agregar
                      </BtnCatalogoSecundario>
                      <BtnCatalogoPrimario type="button" onClick={() => handleImprimir(item)}>
                        Imprimir
                      </BtnCatalogoPrimario>
                    </CatalogoAcciones>
                  </CatalogoItem>
                ))}
              </CatalogoResultados>
            )}
          </ManualCodigo>

          <ManualCodigo>
            <ManualLabel>Generar etiqueta solo con código</ManualLabel>
            <ManualGrid>
              <InputCodigo
                type="text"
                value={codigoManual}
                onChange={(event) => setCodigoManual(event.target.value)}
                onKeyDown={handleManualKeyDown}
                placeholder="Código"
              />
              <InputProducto
                type="text"
                value={productoManual}
                onChange={(event) => setProductoManual(event.target.value)}
                onKeyDown={handleManualKeyDown}
                placeholder="Nombre del producto"
              />
              <BtnCrear type="button" onClick={handleCrearCodigo}>
                Crear
              </BtnCrear>
            </ManualGrid>
          </ManualCodigo>
        </SelectorTipo>

        {productosList.length === 0 ? (
          <Empty>No hay productos en la tabla. Agrega un código con el botón Crear.</Empty>
        ) : (
          <TablaWrapper>
            <Tabla>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Código</th>
                  <th>Producto</th>
                  <th>Cantidad</th>
                  <th>Imprimir etiqueta</th>
                </tr>
              </thead>
              <tbody>
                {productosList.map((item, index) => (
                  <tr key={`${item.codigo}-${index}`}>
                    <td>{index + 1}</td>
                    <td data-label="Código">{item.codigo}</td>
                    <td data-label="Producto">{item.producto}</td>
                    <td data-label="Cantidad">{item.cantidad}</td>
                    <td>
                      <BtnImprimir
                        type="button"
                        onClick={() => handleImprimir(item)}
                      >
                        Imprimir
                      </BtnImprimir>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Tabla>
          </TablaWrapper>
        )}
      </SeccionTabla>

      {formMoto?.modo === "single" && (
        <DatosEtiquetaMotoModal
          producto={formMoto.item}
          bodegaDestino={bodegaDestino}
          onConfirmar={handleConfirmarDatosMoto}
          onClose={() => setFormMoto(null)}
        />
      )}

      {formMoto?.modo === "lote" && (
        <DatosEtiquetaMotoModal
          productos={formMoto.items}
          bodegaDestino={bodegaDestino}
          onConfirmar={handleConfirmarDatosMoto}
          onClose={() => setFormMoto(null)}
        />
      )}

      {previewLote && (
        <PreviewEtiquetaModal
          productos={productosList}
          tipo={soloEtiquetaMediana ? TIPOS_ETIQUETA.MEDIANA : tipoEtiqueta}
          datosEtiquetaMoto={soloEtiquetaMediana ? datosEtiquetaMoto : null}
          onClose={cerrarPreview}
        />
      )}

      {previewItem && (
        <PreviewEtiquetaModal
          producto={previewItem}
          tipo={soloEtiquetaMediana ? TIPOS_ETIQUETA.MEDIANA : tipoEtiqueta}
          datosEtiquetaMoto={soloEtiquetaMediana ? datosEtiquetaMoto : null}
          onClose={cerrarPreview}
        />
      )}
    </Wrapper>
  );
}

const Wrapper = styled.div`
  width: 100%;
  max-width: 960px;
  text-align: left;
`;

const Archivo = styled.p`
  text-align: center;
  color: #888;
  font-size: 0.9rem;
  margin-bottom: 20px;
`;

const Encabezado = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 28px;
`;

const Campo = styled.div`
  background: #fafafa;
  border: 1px solid #e5e5e5;
  border-radius: 10px;
  padding: 14px 16px;

  label {
    display: block;
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #888;
    margin-bottom: 6px;
  }

  strong {
    color: #222;
    font-size: 1rem;
    word-break: break-word;
  }
`;

const SeccionTabla = styled.section`
  margin-top: 8px;
`;

const TablaHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
`;

const TablaHeaderInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;

  h2 {
    margin: 0;
    font-size: 1.2rem;
    color: #222;
  }

  span {
    color: #888;
    font-size: 0.9rem;
  }
`;

const SelectorTipo = styled.div`
  background: #fafafa;
  border: 1px solid #e5e5e5;
  border-radius: 10px;
  padding: 14px 16px;
  margin-bottom: 12px;
`;

const SelectorLabel = styled.p`
  margin: 0 0 10px;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #888;
  font-weight: 600;
`;

const RadioGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
`;

const RadioOption = styled.label`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  cursor: pointer;

  input[type="radio"] {
    margin-top: 3px;
    accent-color: #e53935;
    width: 16px;
    height: 16px;
    cursor: pointer;
  }
`;

const RadioText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;

  strong {
    font-size: 0.95rem;
    color: #222;
  }

  span {
    font-size: 0.8rem;
    color: #666;
  }
`;

const EtiquetaFija = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;

  strong {
    font-size: 0.95rem;
    color: #222;
  }

  span {
    font-size: 0.8rem;
    color: #666;
  }
`;

const ManualCodigo = styled.div`
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid #e8e8e8;
`;

const ManualLabel = styled.p`
  margin: 0 0 8px;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #888;
  font-weight: 600;
`;

const ManualGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(140px, 1fr) minmax(180px, 2fr) auto;
  gap: 10px;
  align-items: center;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

const InputCodigo = styled.input`
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
`;

const InputProducto = styled(InputCodigo)``;

const BtnCrear = styled.button`
  border: 1px solid #e53935;
  background: #e53935;
  color: #fff;
  padding: 10px 18px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s ease;

  &:hover:not(:disabled) {
    background: #c62828;
    border-color: #c62828;
  }

  &:disabled {
    opacity: 0.7;
    cursor: wait;
  }
`;

const CatalogoResultados = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
`;

const CatalogoItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  background: #fff;

  @media (max-width: 720px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const CatalogoInfo = styled.div`
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

const CatalogoAcciones = styled.div`
  display: flex;
  gap: 8px;
  flex-shrink: 0;
`;

const BtnCatalogoSecundario = styled.button`
  border: 1px solid #ddd;
  background: #fff;
  color: #444;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    border-color: #e53935;
    color: #e53935;
  }
`;

const BtnCatalogoPrimario = styled.button`
  border: 1px solid #e53935;
  background: #e53935;
  color: #fff;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background: #c62828;
    border-color: #c62828;
  }
`;

const TablaWrapper = styled.div`
  overflow-x: auto;
  border: 1px solid #ddd;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
`;

const Tabla = styled.table`
  width: 100%;
  border-collapse: collapse;
  background: #fff;
  min-width: 780px;

  th,
  td {
    padding: 14px 16px;
    text-align: left;
    border-bottom: 1px solid #eee;
  }

  th {
    background: #222;
    color: #fff;
    font-size: 0.82rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  td:first-child,
  th:first-child {
    width: 48px;
    text-align: center;
    color: #888;
    font-weight: 600;
  }

  td:nth-child(2) {
    font-weight: 700;
    color: #222;
    white-space: nowrap;
  }

  td:nth-child(4) {
    white-space: nowrap;
    font-weight: 700;
    color: #e53935;
    text-align: center;
    width: 100px;
  }

  th:nth-child(4),
  th:nth-child(5) {
    text-align: center;
  }

  th:nth-child(5) {
    width: 140px;
  }

  td:nth-child(5) {
    text-align: center;
    white-space: nowrap;
  }

  tbody tr:nth-child(even) {
    background: #fafafa;
  }

  tbody tr:hover {
    background: #fff4f3;
  }

  tbody tr:last-child td {
    border-bottom: none;
  }
`;

const Empty = styled.p`
  text-align: center;
  color: #888;
  padding: 24px;
  border: 1px dashed #ddd;
  border-radius: 10px;
`;

const BtnImprimirTodo = styled.button`
  border: 1px solid #e53935;
  background: #e53935;
  color: #fff;
  padding: 10px 18px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s ease;

  &:hover {
    background: #c62828;
    border-color: #c62828;
  }
`;

const BtnImprimir = styled.button`
  border: 1px solid #e53935;
  background: #fff;
  color: #e53935;
  padding: 8px 14px;
  border-radius: 6px;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;

  &:hover {
    background: #e53935;
    color: #fff;
  }
`;
