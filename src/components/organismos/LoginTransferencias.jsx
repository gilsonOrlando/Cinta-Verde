import { useEffect, useState } from "react";
import styled from "styled-components";
import toast from "react-hot-toast";
import { iniciarSesionTransferencia } from "../../supabase/crudUsuariosTransferencias";
import { interpretarErrorSupabase } from "../../utils/interpretarErrorSupabase";

export function LoginTransferencias({ sesion, onSesion, onSalir, onClose }) {
  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape" && !guardando) onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [guardando, onClose]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (guardando) return;
    setGuardando(true);
    try {
      const siguiente = await iniciarSesionTransferencia({ usuario, clave });
      onSesion(siguiente);
    } catch (error) {
      console.error(error);
      toast.error(interpretarErrorSupabase(error));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Overlay onClick={guardando ? undefined : onClose}>
      <Dialog
        role="dialog"
        aria-labelledby="credencial-titulo"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="credencial-titulo">Credencial de acceso</h2>
        {sesion ? (
          <>
            <p>
              Sesión activa: <strong>{sesion.sucursal_nombre}</strong> ·{" "}
              {sesion.tipo === "matriz" ? "Matriz" : "Agencia"}.
            </p>
            <Footer>
              <BtnSecundario type="button" onClick={onClose}>
                Cerrar
              </BtnSecundario>
              <BtnPeligro type="button" onClick={onSalir}>
                Cerrar sesión
              </BtnPeligro>
            </Footer>
          </>
        ) : (
          <>
            <p>
              Ingresa con usuario <strong>matriz</strong> o <strong>agencia</strong>. La clave
              es el usuario más el año, por ejemplo loja2026.
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
              <Footer>
                <BtnSecundario type="button" onClick={onClose} disabled={guardando}>
                  Cancelar
                </BtnSecundario>
                <BtnPrimario type="submit" disabled={guardando}>
                  {guardando ? "Ingresando..." : "Ingresar"}
                </BtnPrimario>
              </Footer>
            </Form>
          </>
        )}
      </Dialog>
    </Overlay>
  );
}

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1100;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
`;

const Dialog = styled.div`
  width: 100%;
  max-width: 460px;
  background: #fff;
  border-radius: 14px;
  padding: 22px 22px 18px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.22);

  h2 {
    margin: 0 0 8px;
    color: #1b5e20;
    font-size: 1.2rem;
  }

  p {
    margin: 0 0 16px;
    color: #666;
    font-size: 0.88rem;
    line-height: 1.45;
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 8px;

  label {
    margin-top: 4px;
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
`;

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 12px;
`;

const BtnSecundario = styled.button`
  border: 1px solid #ddd;
  background: #fff;
  color: #444;
  padding: 10px 16px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
`;

const BtnPrimario = styled.button`
  border: 1px solid #2e7d32;
  background: #2e7d32;
  color: #fff;
  padding: 10px 16px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;

  &:disabled {
    opacity: 0.7;
    cursor: wait;
  }
`;

const BtnPeligro = styled.button`
  border: 1px solid #c62828;
  background: #c62828;
  color: #fff;
  padding: 10px 16px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
`;
