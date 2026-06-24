import styled from "styled-components";

export function MenuHambur() {
  return (
    <Button type="button" aria-label="Menú">
      ☰
    </Button>
  );
}

const Button = styled.button`
  border: none;
  background: ${({ theme }) => theme.primary};
  color: white;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1.2rem;
`;
