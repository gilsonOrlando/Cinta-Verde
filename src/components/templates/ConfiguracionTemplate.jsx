import styled from "styled-components";
import { Link } from "react-router-dom";
import { DataModulosConfiguracion } from "../../utils/dataEstatica";

export function ConfiguracionTemplate() {
  return (
    <Container>
      <header>
        <h1>Configuración</h1>
        <p>Administra los módulos principales del inventario</p>
      </header>
      <Grid>
        {DataModulosConfiguracion.map((modulo) => (
          <Card key={modulo.link} to={modulo.link}>
            <h3>{modulo.title}</h3>
            <p>{modulo.subtitle}</p>
          </Card>
        ))}
      </Grid>
    </Container>
  );
}

const Container = styled.section`
  color: ${({ theme }) => theme.text};

  header {
    margin-bottom: 24px;
  }

  p {
    color: ${({ theme }) => theme.colorSubtitle};
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
`;

const Card = styled(Link)`
  background: ${({ theme }) => theme.bgcards};
  border: 1px solid ${({ theme }) => theme.bg4};
  border-radius: 12px;
  padding: 20px;
  text-decoration: none;
  color: inherit;
  transition: transform 0.2s ease;

  &:hover {
    transform: translateY(-2px);
  }

  h3 {
    margin-bottom: 8px;
  }

  p {
    font-size: 0.9rem;
  }
`;
