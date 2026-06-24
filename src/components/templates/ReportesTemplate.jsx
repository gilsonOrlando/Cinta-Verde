import styled from "styled-components";

export function ReportesTemplate() {
  return (
    <Container>
      <h1>Reportes</h1>
      <p>Módulo preparado para reportes de stock, kardex e inventario valorado.</p>
      <Grid>
        <Card>Stock actual</Card>
        <Card>Stock bajo mínimo</Card>
        <Card>Inventario valorado</Card>
      </Grid>
    </Container>
  );
}

const Container = styled.section`
  color: ${({ theme }) => theme.text};

  p {
    margin: 8px 0 20px;
    color: ${({ theme }) => theme.colorSubtitle};
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
`;

const Card = styled.div`
  background: ${({ theme }) => theme.bgcards};
  border: 1px solid ${({ theme }) => theme.bg4};
  border-radius: 12px;
  padding: 20px;
`;
