import styled from "styled-components";
import { useQuery } from "@tanstack/react-query";
import { useProductosStore } from "../../store/ProductosStore";
import { v } from "../../styles/variables";

export function ProductosTemplate() {
  const { dataproductos, mostrarProductos, buscador, setBuscador } =
    useProductosStore();

  const { isLoading } = useQuery({
    queryKey: ["productos"],
    queryFn: mostrarProductos,
  });

  const filtrados = dataproductos.filter(
    (item) =>
      item.producto?.toLowerCase().includes(buscador.toLowerCase()) ||
      item.codigo?.toLowerCase().includes(buscador.toLowerCase())
  );

  return (
    <Container>
      <header>
        <div>
          <h1>Productos</h1>
          <p>Productos guardados desde toma física</p>
        </div>
        <input
          type="search"
          placeholder="Buscar por código o producto..."
          value={buscador}
          onChange={(e) => setBuscador(e.target.value)}
        />
      </header>

      {isLoading ? (
        <p>Cargando productos...</p>
      ) : (
        <Table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Producto</th>
              <th>Cantidad sistema</th>
              <th>Cantidad toma física</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr>
                <td colSpan="4">No hay productos registrados</td>
              </tr>
            ) : (
              filtrados.map((item) => (
                <tr key={item.id}>
                  <td>{item.codigo}</td>
                  <td>{item.producto}</td>
                  <td>{item.cantidad_sistema}</td>
                  <td>{item.cantidad_toma_fisica}</td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      )}

      <Hint>
        <v.iconostock />
        <span>Los productos se guardan al crear un proyecto en Toma física.</span>
      </Hint>
    </Container>
  );
}

const Container = styled.section`
  color: ${({ theme }) => theme.text};

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    margin-bottom: 20px;
    flex-wrap: wrap;
  }

  input {
    padding: 10px 12px;
    border-radius: 8px;
    border: 1px solid ${({ theme }) => theme.bg4};
    background: ${({ theme }) => theme.bgcards};
    color: ${({ theme }) => theme.text};
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  background: ${({ theme }) => theme.bgcards};
  border-radius: 12px;
  overflow: hidden;

  th,
  td {
    padding: 12px;
    border-bottom: 1px solid ${({ theme }) => theme.bg4};
    text-align: left;
  }

  th {
    background: ${({ theme }) => theme.bg2};
  }
`;

const Hint = styled.div`
  margin-top: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${({ theme }) => theme.colorSubtitle};
  font-size: 0.9rem;
`;
