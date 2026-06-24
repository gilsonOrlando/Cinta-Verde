import { useEffect, useState } from "react";
import styled, { keyframes } from "styled-components";

const MENSAJES = [
  "Leyendo el documento PDF...",
  "Extrayendo datos de transferencia...",
  "Identificando productos...",
  "Preparando la tabla...",
];

export function CargandoTransferencia() {
  const [paso, setPaso] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setPaso((prev) => (prev + 1) % MENSAJES.length);
    }, 900);

    return () => clearInterval(timer);
  }, []);

  return (
    <Wrapper>
      <Spinner />
      <Titulo>Procesando transferencia</Titulo>
      <Mensaje key={paso}>{MENSAJES[paso]}</Mensaje>
      <Barra>
        <Progreso />
      </Barra>
    </Wrapper>
  );
}

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const slide = keyframes`
  0% { width: 10%; margin-left: 0; }
  50% { width: 45%; margin-left: 30%; }
  100% { width: 10%; margin-left: 90%; }
`;

const Wrapper = styled.div`
  width: 100%;
  max-width: 420px;
  padding: 32px 24px;
  border: 1px solid #e8e8e8;
  border-radius: 16px;
  background: #fafafa;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
`;

const Spinner = styled.div`
  width: 48px;
  height: 48px;
  border: 4px solid #eee;
  border-top-color: #e53935;
  border-radius: 50%;
  animation: ${spin} 0.9s linear infinite;
`;

const Titulo = styled.h2`
  font-size: 1.15rem;
  color: #222;
  margin: 0;
`;

const Mensaje = styled.p`
  font-size: 0.95rem;
  color: #666;
  min-height: 1.4em;
  margin: 0;
  transition: opacity 0.3s ease;
`;

const Barra = styled.div`
  width: 100%;
  height: 6px;
  background: #e8e8e8;
  border-radius: 999px;
  overflow: hidden;
  margin-top: 8px;
`;

const Progreso = styled.div`
  height: 100%;
  background: linear-gradient(90deg, #e53935, #ff7043);
  border-radius: 999px;
  animation: ${slide} 1.4s ease-in-out infinite;
`;
