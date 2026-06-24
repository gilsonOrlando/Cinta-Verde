import { useState } from "react";
import styled from "styled-components";
import toast from "react-hot-toast";
import { CrearProyectoModal } from "../modals/CrearProyectoModal";
import { CrearProyectoConProductos } from "../../supabase/crudProyectos";

export function TomaFisicaResultado({ data, nombreArchivo }) {
  const { productos } = data;
  const [mostrarModal, setMostrarModal] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [proyectoGuardado, setProyectoGuardado] = useState(null);

  const handleCrearProyecto = async ({ nombre, codigoAcceso }) => {
    setGuardando(true);

    try {
      const resultado = await CrearProyectoConProductos({
        nombre,
        codigoAcceso,
        nombreArchivo,
        productos,
      });

      setProyectoGuardado(resultado.proyecto);
      setMostrarModal(false);
      toast.success(
        `Proyecto "${resultado.proyecto.nombre}" guardado. Código móvil: ${resultado.proyecto.codigo_acceso}`
      );
    } catch (error) {
      console.error(error);
      if (error.message === "CODIGO_ACCESO_DUPLICADO") {
        toast.error("Ese código de acceso ya existe. Elige otro o genera uno nuevo.");
        return;
      }
      toast.error("No se pudo guardar el proyecto. Verifica la conexión con Supabase.");
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
              {productos.length === 1
                ? "1 producto encontrado"
                : `${productos.length} productos encontrados`}
            </span>
            {proyectoGuardado && (
              <>
                <BadgeProyecto>Proyecto guardado: {proyectoGuardado.nombre}</BadgeProyecto>
                <BadgeCodigo>Código móvil: {proyectoGuardado.codigo_acceso}</BadgeCodigo>
              </>
            )}
          </TablaHeaderInfo>

          {productos.length > 0 && !proyectoGuardado && (
            <BtnCrearProyecto type="button" onClick={() => setMostrarModal(true)}>
              Crear proyecto
            </BtnCrearProyecto>
          )}
        </TablaHeader>

        {productos.length === 0 ? (
          <Empty>No se encontraron productos en el archivo.</Empty>
        ) : (
          <TablaWrapper>
            <Tabla>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Código</th>
                  <th>Producto</th>
                  <th>Cantidad sistema</th>
                  <th>Cantidad toma física</th>
                </tr>
              </thead>
              <tbody>
                {productos.map((item, index) => (
                  <tr key={`${item.codigo}-${index}`}>
                    <td>{index + 1}</td>
                    <td>{item.codigo}</td>
                    <td>{item.producto}</td>
                    <td>{item.cantidad_sistema}</td>
                    <td>{item.cantidad_toma_fisica}</td>
                  </tr>
                ))}
              </tbody>
            </Tabla>
          </TablaWrapper>
        )}
      </SeccionTabla>

      {mostrarModal && (
        <CrearProyectoModal
          nombreArchivo={nombreArchivo}
          totalProductos={productos.length}
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

const BadgeProyecto = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  background: #e8f5e9;
  color: #2e7d32;
  font-size: 0.82rem;
  font-weight: 600;
`;

const BadgeCodigo = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  background: #fff3e0;
  color: #e65100;
  font-size: 0.82rem;
  font-weight: 700;
  font-family: "Consolas", "Courier New", monospace;
  letter-spacing: 0.06em;
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
