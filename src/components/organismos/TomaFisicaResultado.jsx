import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import { RiDeleteBin2Line } from "react-icons/ri";
import { CrearProyectoModal } from "../modals/CrearProyectoModal";
import { PreviewTomaFisicaModal } from "../modals/PreviewTomaFisicaModal";
import { CrearProyectoConProductos } from "../../supabase/crudProyectos";
import { supabaseConfigurado } from "../../supabase/supabase.config";
import { interpretarErrorSupabase } from "../../utils/interpretarErrorSupabase";
import { descargarPdfTomaFisica } from "../../utils/generarPdfTomaFisica";

export function TomaFisicaResultado({ data, nombreArchivo, onProyectoGuardado }) {
  const { productos } = data;
  const [productosList, setProductosList] = useState(productos);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("");
  const [paginaActual, setPaginaActual] = useState(1);
  const [filasPorPagina, setFilasPorPagina] = useState(10);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [mostrarPreview, setMostrarPreview] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    setProductosList(productos);
    setCategoriaSeleccionada("");
    setPaginaActual(1);
  }, [productos]);

  const categorias = useMemo(
    () =>
      [...new Set(productosList.map((item) => item.categoria || "Sin categoría"))].sort(
        (a, b) => a.localeCompare(b, "es", { sensitivity: "base" })
      ),
    [productosList]
  );

  const productosFiltrados = useMemo(
    () =>
      categoriaSeleccionada
        ? productosList.filter(
            (item) => (item.categoria || "Sin categoría") === categoriaSeleccionada
          )
        : productosList,
    [categoriaSeleccionada, productosList]
  );

  const totalPaginas = Math.max(1, Math.ceil(productosFiltrados.length / filasPorPagina));
  const paginaSegura = Math.min(paginaActual, totalPaginas);
  const inicioPagina = (paginaSegura - 1) * filasPorPagina;
  const productosPagina = productosFiltrados.slice(
    inicioPagina,
    inicioPagina + filasPorPagina
  );

  const handleEliminarProducto = (codigo) => {
    const listaActualizada = productosList.filter((item) => item.codigo !== codigo);
    setProductosList(listaActualizada);

    if (
      categoriaSeleccionada &&
      !listaActualizada.some(
        (item) => (item.categoria || "Sin categoría") === categoriaSeleccionada
      )
    ) {
      setCategoriaSeleccionada("");
    }

    setPaginaActual(1);
  };

  const proyectoBorrador = {
    nombre: nombreArchivo?.replace(/\.[^/.]+$/, "") || "Toma física",
    codigo_acceso: "BORRADOR",
    created_at: new Date().toISOString(),
    nombre_archivo: nombreArchivo ?? null,
  };

  const handleDescargarPdf = async () => {
    if (!productosFiltrados.length) {
      toast.error("No hay productos para incluir en el PDF.");
      return;
    }

    try {
      await descargarPdfTomaFisica({
        proyecto: proyectoBorrador,
        productos: productosFiltrados,
      });
      toast.success("PDF descargado correctamente.");
    } catch (error) {
      console.error(error);
      toast.error("No se pudo generar el PDF.");
    }
  };

  const handleCrearProyecto = async ({ nombre, codigoAcceso }) => {
    if (!supabaseConfigurado) {
      toast.error(interpretarErrorSupabase());
      return;
    }

    setGuardando(true);

    try {
      const resultado = await CrearProyectoConProductos({
        nombre,
        codigoAcceso,
        nombreArchivo,
        productos: productosFiltrados,
      });

      setMostrarModal(false);

      const { nombre: nombreProyecto, codigo_acceso: codigoMovil } = resultado.proyecto;
      const nombreSeguro = String(nombreProyecto)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

      await Swal.fire({
        title: "Proyecto guardado",
        html: `
          <p style="margin:0 0 12px">El proyecto <strong>${nombreSeguro}</strong> se guardó correctamente.</p>
          <p style="margin:0 0 8px;color:#666;font-size:0.95rem">Código de acceso para la app móvil:</p>
          <p style="margin:0;font-size:1.6rem;font-weight:700;font-family:Consolas,monospace;letter-spacing:0.12em;color:#e65100">${codigoMovil}</p>
        `,
        icon: "success",
        confirmButtonText: "Entendido",
        confirmButtonColor: "#e53935",
      });

      onProyectoGuardado?.();
    } catch (error) {
      console.error(error);
      if (error.message === "CODIGO_ACCESO_DUPLICADO") {
        toast.error("Ese código de acceso ya existe. Elige otro o genera uno nuevo.");
        return;
      }
      toast.error(interpretarErrorSupabase(error));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Wrapper>
      {nombreArchivo && <Archivo>{nombreArchivo}</Archivo>}

      <SeccionTabla>
        <TablaHeader>
          <TablaHeaderInfo>
            <h2>Lista de toma física</h2>
            <span>
              {productosFiltrados.length === productosList.length
                ? `${productosList.length} producto(s) encontrado(s)`
                : `${productosFiltrados.length} de ${productosList.length} producto(s)`}
            </span>
          </TablaHeaderInfo>

          {productosList.length > 0 && (
            <AccionesTabla>
              <BtnSecundario type="button" onClick={() => setMostrarPreview(true)}>
                Vista previa
              </BtnSecundario>
              <BtnSecundario type="button" onClick={handleDescargarPdf}>
                Descargar PDF
              </BtnSecundario>
              <BtnCrearProyecto type="button" onClick={() => setMostrarModal(true)}>
                Crear proyecto
              </BtnCrearProyecto>
            </AccionesTabla>
          )}
        </TablaHeader>

        {productosList.length > 0 && (
          <Filtros>
            <label htmlFor="filtro-categoria">Categoría</label>
            <select
              id="filtro-categoria"
              value={categoriaSeleccionada}
              onChange={(event) => {
                setCategoriaSeleccionada(event.target.value);
                setPaginaActual(1);
              }}
            >
              <option value="">Todas las categorías</option>
              {categorias.map((categoria) => (
                <option key={categoria} value={categoria}>
                  {categoria}
                </option>
              ))}
            </select>
            <span>
              El proyecto, la vista previa y el PDF usarán los productos filtrados.
            </span>
          </Filtros>
        )}

        {productosList.length === 0 ? (
          <Empty>No se encontraron productos en el archivo.</Empty>
        ) : productosFiltrados.length === 0 ? (
          <Empty>No hay productos para la categoría seleccionada.</Empty>
        ) : (
          <>
            <TablaWrapper>
              <Tabla>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Código</th>
                    <th>Producto</th>
                    <th>Cantidad sistema</th>
                    <th>Cantidad toma física</th>
                    <th aria-label="Eliminar"> </th>
                  </tr>
                </thead>
                <tbody>
                  {productosPagina.map((item, index) => (
                    <tr key={`${item.codigo}-${inicioPagina + index}`}>
                      <td>{inicioPagina + index + 1}</td>
                      <td>{item.codigo}</td>
                      <td>{item.producto}</td>
                      <td>{item.cantidad_sistema}</td>
                      <td>{item.cantidad_toma_fisica}</td>
                      <td>
                        <BtnEliminar
                          type="button"
                          onClick={() => handleEliminarProducto(item.codigo)}
                          aria-label={`Eliminar ${item.codigo}`}
                          title="Eliminar de la tabla"
                        >
                          <RiDeleteBin2Line />
                        </BtnEliminar>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Tabla>
            </TablaWrapper>

            <Paginacion>
              <FilasPagina>
                <label htmlFor="filas-por-pagina">Filas por página</label>
                <select
                  id="filas-por-pagina"
                  value={filasPorPagina}
                  onChange={(event) => {
                    setFilasPorPagina(Number(event.target.value));
                    setPaginaActual(1);
                  }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </FilasPagina>
              <span>
                Página {paginaSegura} de {totalPaginas}
              </span>
              <ControlesPagina>
                <button
                  type="button"
                  onClick={() => setPaginaActual((pagina) => Math.max(1, pagina - 1))}
                  disabled={paginaSegura === 1}
                >
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPaginaActual((pagina) => Math.min(totalPaginas, pagina + 1))
                  }
                  disabled={paginaSegura === totalPaginas}
                >
                  Siguiente
                </button>
              </ControlesPagina>
            </Paginacion>
          </>
        )}
      </SeccionTabla>

      {mostrarPreview && (
        <PreviewTomaFisicaModal
          proyecto={proyectoBorrador}
          productos={productosFiltrados}
          onClose={() => setMostrarPreview(false)}
        />
      )}

      {mostrarModal && (
        <CrearProyectoModal
          nombreArchivo={nombreArchivo}
          totalProductos={productosFiltrados.length}
          guardando={guardando}
          onConfirmar={handleCrearProyecto}
          onClose={() => {
            if (!guardando) setMostrarModal(false);
          }}
        />
      )}
    </Wrapper>
  );
}

const Wrapper = styled.div`
  width: 100%;
  max-width: 1100px;
  text-align: left;
`;

const Archivo = styled.p`
  text-align: center;
  color: #888;
  font-size: 0.9rem;
  margin-bottom: 20px;
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

const AccionesTabla = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`;

const Filtros = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  padding: 12px 14px;
  margin-bottom: 12px;
  border: 1px solid #e5e5e5;
  border-radius: 10px;
  background: #fafafa;

  label {
    color: #444;
    font-size: 0.88rem;
    font-weight: 700;
  }

  select {
    min-width: 220px;
    padding: 9px 12px;
    border: 1px solid #ccc;
    border-radius: 8px;
    background: #fff;
    color: #222;
  }

  span {
    color: #777;
    font-size: 0.82rem;
  }
`;

const BtnSecundario = styled.button`
  border: 1px solid #ddd;
  background: #fff;
  color: #444;
  padding: 10px 18px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    border-color: #e53935;
    color: #e53935;
  }
`;

const BtnCrearProyecto = styled.button`
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
  min-width: 900px;

  th,
  td {
    padding: 14px 16px;
    text-align: left;
    border-bottom: 1px solid #eee;
    vertical-align: top;
  }

  th {
    background: #222;
    color: #fff;
    font-size: 0.82rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    white-space: nowrap;
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

  td:nth-child(4),
  td:nth-child(5),
  th:nth-child(4),
  th:nth-child(5) {
    text-align: center;
    white-space: nowrap;
    width: 140px;
  }

  td:nth-child(4) {
    font-weight: 600;
    color: #444;
  }

  td:nth-child(5) {
    font-weight: 700;
    color: #e53935;
  }

  th:nth-child(6),
  td:nth-child(6) {
    width: 64px;
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

const Paginacion = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 12px;
  color: #666;
  font-size: 0.88rem;
`;

const FilasPagina = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;

  select {
    padding: 7px 9px;
    border: 1px solid #ccc;
    border-radius: 7px;
    background: #fff;
  }
`;

const ControlesPagina = styled.div`
  display: flex;
  gap: 8px;

  button {
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 7px;
    background: #fff;
    color: #444;
    cursor: pointer;

    &:hover:not(:disabled) {
      border-color: #e53935;
      color: #e53935;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
`;

const BtnEliminar = styled.button`
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #fff;
  color: #888;
  font-size: 1.1rem;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;

  &:hover {
    background: #ffebee;
    border-color: #e53935;
    color: #e53935;
  }
`;

const Empty = styled.p`
  text-align: center;
  color: #888;
  padding: 24px;
  border: 1px dashed #ddd;
  border-radius: 10px;
`;
