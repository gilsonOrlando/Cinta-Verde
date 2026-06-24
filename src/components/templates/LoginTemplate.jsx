import styled from "styled-components";
import { useAuthStore } from "../../store/AuthStore";

export function LoginTemplate() {
  const { loginGoogle } = useAuthStore();

  return (
    <Container>
      <Card>
        <h1>Inventarios</h1>
        <p>Inicia sesión para acceder al panel de gestión.</p>
        <button type="button" onClick={loginGoogle}>
          Continuar con Google
        </button>
      </Card>
    </Container>
  );
}

const Container = styled.main`
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: ${({ theme }) => theme.bgtotal};
`;

const Card = styled.section`
  background: ${({ theme }) => theme.bgcards};
  border: 1px solid ${({ theme }) => theme.bg4};
  border-radius: 16px;
  padding: 32px;
  width: min(420px, 90vw);
  text-align: center;
  color: ${({ theme }) => theme.text};

  p {
    margin: 12px 0 24px;
    color: ${({ theme }) => theme.colorSubtitle};
  }

  button {
    width: 100%;
    border: none;
    background: ${({ theme }) => theme.primary};
    color: white;
    padding: 12px;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
  }
`;
