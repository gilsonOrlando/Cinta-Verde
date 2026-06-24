import styled from "styled-components";

function PlaceholderPage({ title, description }) {
  return (
    <Container>
      <h1>{title}</h1>
      <p>{description}</p>
    </Container>
  );
}

export function Categorias() {
  return (
    <PlaceholderPage
      title="Categorías"
      description="Aquí irán los formularios y tablas de categorías."
    />
  );
}

export function Proveedores() {
  return (
    <PlaceholderPage
      title="Proveedores"
      description="Aquí irá la gestión de proveedores."
    />
  );
}

export function Usuarios() {
  return (
    <PlaceholderPage
      title="Personal"
      description="Aquí irá la gestión de usuarios y permisos."
    />
  );
}

const Container = styled.section`
  color: ${({ theme }) => theme.text};

  p {
    margin-top: 8px;
    color: ${({ theme }) => theme.colorSubtitle};
  }
`;
