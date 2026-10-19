import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { esMatriz } from "../../supabase/crudSucursal";

function fechaHoy() {
  return new Date().toISOString().slice(0, 10);
}

export function CrearRutaModal({
  sucursales,
  sesion,
  rutaInicial,
  guardando,
  onConfirmar,
  onClose,
}) {
  const matrices = useMemo(
    () => sucursales.filter((item) => esMatriz(item.tipo)),
    [sucursales]
  );
  const agencias = useMemo(
    () => sucursales.filter((item) => !esMatriz(item.tipo)),
    [sucursales]
  );
  const editando = Boolean(rutaInicial?.id);
  const origenId = sesion?.sucursal_id ?? rutaInicial?.origen_id ?? matrices[0]?.id ?? "";
  const origenNombre =
    sucursales.find((item) => item.id === origenId)?.nombre ??
    sesion?.sucursal_nombre ??
    "Matriz";
  const destinosDisponibles = useMemo(
    () => [
      ...matrices.filter((item) => item.id !== origenId),
      ...agencias,
    ],
    [matrices, agencias, origenId]
  );

  const [fecha, setFecha] = useState(
    String(rutaInicial?.fecha ?? "").slice(0, 10) || fechaHoy()
  );
  const [chofer, setChofer] = useState(rutaInicial?.chofer ?? "");
  const [destinoIds, setDestinoIds] = useState(rutaInicial?.destinoIds ?? []);

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

  const toggleDestino = (id) => {
    setDestinoIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (guardando) return;
    onConfirmar({ origenId, fecha, chofer, destinoIds });
  };

  return (
    <Overlay onClick={guardando ? undefined : onClose}>
      <Dialog
        role="dialog"
        aria-labelledby="crear-ruta-titulo"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="crear-ruta-titulo">{editando ? "Editar ruta" : "Crear ruta"}</h2>
        <p>
          El origen es la matriz autenticada. Puedes marcar la otra matriz y varias agencias
          como destino.
        </p>

        <Form onSubmit={handleSubmit}>
          <Campo>
            <label htmlFor="ruta-origen">Origen (matriz)</label>
            <input id="ruta-origen" value={origenNombre} readOnly disabled />
          </Campo>

          <Grid>
            <Campo>
              <label htmlFor="ruta-fecha">Fecha de la ruta</label>
              <input
                id="ruta-fecha"
                type="date"
                value={fecha}
                onChange={(event) => setFecha(event.target.value)}
                disabled={guardando}
                required
              />
            </Campo>
            <Campo>
              <label htmlFor="ruta-chofer">Chofer</label>
              <input
                id="ruta-chofer"
                type="text"
                value={chofer}
                onChange={(event) => setChofer(event.target.value)}
                placeholder="Nombre del chofer"
                disabled={guardando}
                required
              />
            </Campo>
          </Grid>

          <Campo>
            <label>Destinos (agencias)</label>
            <ListaDestinos>
              {destinosDisponibles.map((item) => (
                <Destino key={item.id}>
                  <input
                    type="checkbox"
                    checked={destinoIds.includes(item.id)}
                    onChange={() => toggleDestino(item.id)}
                    disabled={guardando}
                  />
                  <span>
                    {item.nombre}
                    {esMatriz(item.tipo) ? " (Matriz)" : ""}
                  </span>
                </Destino>
              ))}
            </ListaDestinos>
          </Campo>

          <Footer>
            <BtnSecundario type="button" onClick={onClose} disabled={guardando}>
              Cancelar
            </BtnSecundario>
            <BtnPrimario type="submit" disabled={guardando}>
              {guardando ? "Guardando..." : editando ? "Guardar cambios" : "Crear ruta"}
            </BtnPrimario>
          </Footer>
        </Form>
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
  max-width: 760px;
  max-height: min(90vh, 760px);
  overflow: auto;
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
  gap: 14px;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

const Campo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;

  label {
    font-size: 0.76rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #666;
  }

  input,
  select {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #ccc;
    border-radius: 8px;
    font-size: 0.95rem;
    color: #222;
    background: #fff;

    &:focus {
      outline: none;
      border-color: #2e7d32;
      box-shadow: 0 0 0 2px rgba(46, 125, 50, 0.15);
    }
  }
`;

const ListaDestinos = styled.div`
  max-height: 280px;
  overflow: auto;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 12px 14px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  column-gap: 16px;
  row-gap: 6px;
  width: 100%;

  @media (max-width: 640px) {
    grid-template-columns: 1fr 1fr;
  }

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const Destino = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 32px;
  padding: 4px 2px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.82rem;
  line-height: 1;
  color: #333;
  min-width: 0;

  input[type="checkbox"] {
    appearance: auto;
    flex: 0 0 16px;
    width: 16px;
    height: 16px;
    margin: 0;
    padding: 0;
    accent-color: #2e7d32;
  }

  span {
    flex: 1 1 auto;
    min-width: 0;
    white-space: nowrap;
    line-height: 1.2;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &:hover {
    background: #f3f8f3;
  }
`;

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 4px;
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
