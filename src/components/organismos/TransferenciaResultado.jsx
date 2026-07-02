import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import toast from "react-hot-toast";
import { RiDeleteBin2Line } from "react-icons/ri";
import { TIPOS_ETIQUETA } from "../../utils/imprimirEtiqueta";
import { PreviewEtiquetaModal } from "../modals/PreviewEtiquetaModal";
import { DatosEtiquetaMotoModal } from "../modals/DatosEtiquetaMotoModal";
import { EtiquetaCodigoModal } from "../modals/EtiquetaCodigoModal";
import { supabaseConfigurado } from "../../supabase/supabase.config";
import { registrarListaProductosNuevos } from "../../supabase/crudListaProductos";
import { guardarMotoPorChasis } from "../../supabase/crudMotos";
import { interpretarErrorSupabase } from "../../utils/interpretarErrorSupabase";

export function TransferenciaResultado({
  data,
  nombreArchivo,
  soloEtiquetaMediana = false,
  tituloTabla = "Productos",
  abrirFormularioCodigoAlInicio = false,
  onFormularioCodigoCerrado,
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
  const [mostrarFormularioCodigo, setMostrarFormularioCodigo] = useState(
    abrirFormularioCodigoAlInicio
  );

  const cerrarFormularioCodigo = () => {
    setMostrarFormularioCodigo(false);
    onFormularioCodigoCerrado?.();
  };

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
        const { insertados } = await registrarListaProductosNuevos(productos);
        if (!cancelado && insertados > 0) {
          toast.success(`${insertados} producto(s) nuevo(s) guardado(s) en lista.`);
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

  const handleConfirmarDatosMoto = async (datos) => {
    const modo = formMoto?.modo;
    const item = formMoto?.item;

    if (soloEtiquetaMediana && supabaseConfigurado) {
      try {
        const contexto = {
          linkMega: datos.linkMega,
        };

        if (modo === "lote" && Array.isArray(datos.items)) {
          const productoMap = new Map(productosList.map((producto) => [producto.codigo, producto]));
          const resultados = await Promise.all(
            datos.items.map((fila) =>
              guardarMotoPorChasis({
                codigo: fila.codigo,
                producto: productoMap.get(fila.codigo)?.producto ?? "",
                chasis: fila.chasis,
                motor: fila.motor,
                camCpmRamw: fila.camCpmRamw,
                ...contexto,
              })
            )
          );

          const actualizados = resultados.filter((resultado) => resultado.actualizado).length;
          const nuevos = resultados.length - actualizados;

          if (nuevos > 0 && actualizados > 0) {
            toast.success(`${nuevos} moto(s) guardada(s), ${actualizados} actualizada(s).`);
          } else if (actualizados > 0) {
            toast.success(`${actualizados} moto(s) actualizada(s).`);
          } else {
            toast.success(`${nuevos} moto(s) guardada(s).`);
          }
        } else if (item) {
          const { actualizado } = await guardarMotoPorChasis({
            codigo: item.codigo,
            producto: item.producto,
            chasis: datos.chasis,
            motor: datos.motor,
            camCpmRamw: datos.camCpmRamw,
            ...contexto,
          });

          toast.success(
            actualizado ? "Moto actualizada en el registro." : "Moto guardada en el registro."
          );
        }
      } catch (error) {
        console.error(error);
        toast.error(interpretarErrorSupabase(error));
      }
    }

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

  const agregarProductoALista = (item) => {
    const existe = productosList.some((producto) => producto.codigo === item.codigo);
    if (existe) {
      toast.error("Ese código ya está en la tabla.");
      return false;
    }

    setProductosList((prev) => [...prev, item]);
    toast.success("Producto agregado a la tabla.");
    return true;
  };

  const handleAgregarDesdeFormulario = (item) => agregarProductoALista(item);

  const handleEliminarProducto = (index) => {
    const item = productosList[index];
    if (!item) return;

    setProductosList((prev) => prev.filter((_, i) => i !== index));

    if (previewItem?.codigo === item.codigo) {
      setPreviewItem(null);
      setDatosEtiquetaMoto(null);
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

          <AccionesCodigo>
            <BtnGenerarCodigo type="button" onClick={() => setMostrarFormularioCodigo(true)}>
              Generar etiqueta con código
            </BtnGenerarCodigo>
          </AccionesCodigo>
        </SelectorTipo>

        {productosList.length === 0 ? (
          <Empty>
            No hay productos en la tabla. Usa el botón &quot;Generar etiqueta con código&quot; para
            buscar o crear uno.
          </Empty>
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
                  <th aria-label="Eliminar"> </th>
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
                    <td>
                      <BtnEliminar
                        type="button"
                        onClick={() => handleEliminarProducto(index)}
                        aria-label={`Quitar ${item.codigo} de la tabla`}
                        title="Quitar de la tabla"
                      >
                        <RiDeleteBin2Line />
                      </BtnEliminar>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Tabla>
          </TablaWrapper>
        )}
      </SeccionTabla>

      {mostrarFormularioCodigo && (
        <EtiquetaCodigoModal
          onAgregar={handleAgregarDesdeFormulario}
          onClose={cerrarFormularioCodigo}
        />
      )}

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

const AccionesCodigo = styled.div`
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid #e8e8e8;
  display: flex;
  justify-content: flex-start;
`;

const BtnGenerarCodigo = styled.button`
  border: 1px solid #e53935;
  background: #fff;
  color: #e53935;
  padding: 10px 18px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;

  &:hover {
    background: #e53935;
    color: #fff;
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
  th:nth-child(5),
  th:nth-child(6) {
    text-align: center;
  }

  th:nth-child(5) {
    width: 140px;
  }

  th:nth-child(6) {
    width: 56px;
  }

  td:nth-child(5),
  td:nth-child(6) {
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

const BtnEliminar = styled.button`
  border: 1px solid #ddd;
  background: #fff;
  color: #888;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;

  &:hover {
    background: #ffebee;
    border-color: #e53935;
    color: #e53935;
  }
`;
