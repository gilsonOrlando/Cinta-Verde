import { useState } from "react";
import styled from "styled-components";
import toast from "react-hot-toast";
import { iniciarSesionTransferencia } from "../../supabase/crudUsuariosTransferencias";
import { interpretarErrorSupabase } from "../../utils/interpretarErrorSupabase";

export function LoginTransferencias({ onSesion }) {
  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");
  const [guardando, setGuardando] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (guardando) return;
    setGuardando(true);
    try {
      const sesion = await iniciarSesionTransferencia({ usuario, clave });
      onSesion(sesion);
    } catch (error) {
      console.error(error);
      toast.error(interpretarErrorSupabase(error));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Card>
      <h2>Acceso a transferencias</h2>
      <p>
        Hay dos tipos de usuario: <strong>matriz</strong> y <strong>agencia</strong>. Cada
        sucursal tiene su propia credencial. La clave es el usuario más el año, por
        ejemplo loja2026.
      </p>
      <Form onSubmit={handleSubmit}>
        <label htmlFor="usuario-transferencia">Usuario</label>
        <input
          id="usuario-transferencia"
          value={usuario}
          onChange={(event) => setUsuario(event.target.value)}
          autoComplete="username"
          placeholder="Ej. loja"
          disabled={guardando}
          required
        />
        <label htmlFor="clave-transferencia">Clave</label>
        <input
          id="clave-transferencia"
          type="password"
          value={clave}
          onChange={(event) => setClave(event.target.value)}
          autoComplete="current-password"
          disabled={guardando}
          required
        />
        <button type="submit" disabled={guardando}>
          {guardando ? "Ingresando..." : "Ingresar"}
        </button>
      </Form>
    </Card>
  );
}

const Card = styled.section`
  width: min(460px, 100%);
  margin: 40px auto;
  background: #fff;
  border: 1px solid #e0d6c6;
  border-radius: 14px;
  padding: 28px 24px 22px;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.08);

  h2 {
    margin: 0 0 8px;
    color: #1b5e20;
    font-size: 1.3rem;
  }

  p {
    margin: 0 0 18px;
    color: #666;
    font-size: 0.9rem;
    line-height: 1.45;
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 8px;

  label {
    margin-top: 6px;
    font-size: 0.74rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #666;
  }

  input {
    padding: 10px 12px;
    border: 1px solid #ccc;
    border-radius: 8px;
    font-size: 0.95rem;

    &:focus {
      outline: none;
      border-color: #2e7d32;
      box-shadow: 0 0 0 2px rgba(46, 125, 50, 0.15);
    }
  }

  button {
    margin-top: 12px;
    border: 1px solid #2e7d32;
    background: #2e7d32;
    color: #fff;
    padding: 12px 16px;
    border-radius: 8px;
    font-weight: 700;
    cursor: pointer;

    &:disabled {
      opacity: 0.7;
      cursor: wait;
    }
  }
`;
