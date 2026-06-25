import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import toast from "react-hot-toast";
import {
  abrirRepositorioMega,
  esEnlaceMegaValido,
} from "../../utils/enlaceMega";
import { formatearAgenciaDesdeBodega } from "../../utils/imprimirEtiquetaMoto";

const LINK_MEGA_EJEMPLO = "https://mega.nz/fm/KmpHEJLB";

function crearFilaVacia() {
  return { chasis: "", motor: "", camCpmRamw: "" };
}

export function DatosEtiquetaMotoModal({
  producto,
  productos,
  bodegaDestino,
  onConfirmar,
  onClose,
}) {
  const esLote = Array.isArray(productos) && productos.length > 0;

  const filasIniciales = useMemo(() => {
    if (!esLote) return [];

    const unicos = [];
    const vistos = new Set();

    for (const item of productos) {
      if (vistos.has(item.codigo)) continue;
      vistos.add(item.codigo);
      unicos.push({
        codigo: item.codigo,
        producto: item.producto,
        ...crearFilaVacia(),
      });
    }

    return unicos;
  }, [esLote, productos]);

  const [chasis, setChasis] = useState("");
  const [motor, setMotor] = useState("");
  const [camCpmRamw, setCamCpmRamw] = useState("");
  const [linkMega, setLinkMega] = useState("");
  const [filas, setFilas] = useState(filasIniciales);
  const agenciaEtiqueta = formatearAgenciaDesdeBodega(bodegaDestino);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const actualizarFila = (codigo, campo, valor) => {
    setFilas((prev) =>
      prev.map((fila) =>
        fila.codigo === codigo ? { ...fila, [campo]: valor } : fila
      )
    );
  };

  const validarYConfirmar = (event) => {
    event.preventDefault();

    const enlace = linkMega.trim();
    if (!esEnlaceMegaValido(enlace)) {
      toast.error("Ingresa un enlace válido de MEGA (http o https).");
      return;
    }

    const agenciaLimpia = agenciaEtiqueta;

    if (esLote) {
      const items = filas.map((fila) => ({
        codigo: fila.codigo,
        chasis: fila.chasis.trim(),
        motor: fila.motor.trim(),
        camCpmRamw: fila.camCpmRamw.trim(),
      }));

      const incompleta = items.find(
        (item) => !item.chasis || !item.motor || !item.camCpmRamw
      );

      if (incompleta) {
        toast.error(
          `Completa chasis, motor y CAM/CPM/RAMW para el código ${incompleta.codigo}.`
        );
        return;
      }

      onConfirmar({
        linkMega: enlace,
        agencia: agenciaLimpia,
        items,
      });
      return;
    }

    const datos = {
      chasis: chasis.trim(),
      motor: motor.trim(),
      camCpmRamw: camCpmRamw.trim(),
      linkMega: enlace,
      agencia: agenciaLimpia,
    };

    if (!datos.chasis || !datos.motor || !datos.camCpmRamw) {
      toast.error("Completa chasis, motor y CAM/CPM/RAMW.");
      return;
    }

    onConfirmar(datos);
  };

  const handleAbrirMega = () => {
    const resultado = abrirRepositorioMega(linkMega);

    if (resultado.usoFallback) {
      toast("Copia el enlace de tu carpeta en MEGA y pégalo aquí al volver.", {
        icon: "ℹ️",
      });
    }
  };

  const titulo = esLote ? "Datos para etiquetas de motos" : "Datos para etiqueta de moto";
  const subtitulo = esLote
    ? `${productos.length} producto(s) · el QR usará el mismo enlace MEGA`
    : `${producto?.producto ?? ""} · COD: ${producto?.codigo ?? ""}`;

  return (
    <Overlay onClick={onClose} role="presentation">
      <Dialog
        role="dialog"
        aria-modal="true"
        aria-labelledby="datos-moto-titulo"
        onClick={(event) => event.stopPropagation()}
        $esLote={esLote}
      >
        <DialogHeader>
          <div>
            <Titulo id="datos-moto-titulo">{titulo}</Titulo>
            <Subtitulo>{subtitulo}</Subtitulo>
          </div>
          <BtnCerrar type="button" onClick={onClose} aria-label="Cerrar">
            ×
          </BtnCerrar>
        </DialogHeader>

        <Form onSubmit={validarYConfirmar}>
          <CamposComunes>
            <Campo $anchoCompleto>
              <label htmlFor="link-mega">Enlace MEGA (QR de acceso)</label>
              <FilaEnlace>
                <input
                  id="link-mega"
                  type="url"
                  value={linkMega}
                  onChange={(event) => setLinkMega(event.target.value)}
                  placeholder={LINK_MEGA_EJEMPLO}
                  autoFocus
                />
                <BtnAbrirMega
                  type="button"
                  onClick={handleAbrirMega}
                  title="Abrir MEGA para copiar el enlace de tu carpeta"
                >
                  Abrir MEGA
                </BtnAbrirMega>
              </FilaEnlace>
              <Ayuda>
                Pulsa <strong>Abrir MEGA</strong>, entra a tu carpeta, copia el enlace y pégalo
                aquí. Ese enlace se usará en el QR de la etiqueta.
              </Ayuda>
            </Campo>
          </CamposComunes>

          {esLote ? (
            <TablaScroll>
              <Tabla>
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Producto</th>
                    <th># Chasis</th>
                    <th># Motor</th>
                    <th>CAM / CPM / RAMW</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map((fila) => (
                    <tr key={fila.codigo}>
                      <td>{fila.codigo}</td>
                      <td>{fila.producto}</td>
                      <td>
                        <input
                          type="text"
                          value={fila.chasis}
                          onChange={(event) =>
                            actualizarFila(fila.codigo, "chasis", event.target.value)
                          }
                          placeholder="CHASIS"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={fila.motor}
                          onChange={(event) =>
                            actualizarFila(fila.codigo, "motor", event.target.value)
                          }
                          placeholder="MOTOR"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={fila.camCpmRamw}
                          onChange={(event) =>
                            actualizarFila(fila.codigo, "camCpmRamw", event.target.value)
                          }
                          placeholder="CAM/CPM/RAMW"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Tabla>
            </TablaScroll>
          ) : (
            <GridCampos>
              <Campo>
                <label htmlFor="chasis-moto"># Chasis</label>
                <input
                  id="chasis-moto"
                  type="text"
                  value={chasis}
                  onChange={(event) => setChasis(event.target.value)}
                  placeholder="LZSPCKLN7V1000621"
                />
              </Campo>

              <Campo>
                <label htmlFor="motor-moto"># Motor</label>
                <input
                  id="motor-moto"
                  type="text"
                  value={motor}
                  onChange={(event) => setMotor(event.target.value)}
                  placeholder="ZS162FMJ5V103558"
                />
              </Campo>

              <Campo $anchoCompleto>
                <label htmlFor="cam-moto">CAM / CPM / RAMW</label>
                <input
                  id="cam-moto"
                  type="text"
                  value={camCpmRamw}
                  onChange={(event) => setCamCpmRamw(event.target.value)}
                  placeholder="BT3ZA4252"
                />
              </Campo>
            </GridCampos>
          )}

          <DialogFooter>
            <BtnSecundario type="button" onClick={onClose}>
              Cancelar
            </BtnSecundario>
            <BtnPrimario type="submit">Ver etiqueta e imprimir</BtnPrimario>
          </DialogFooter>
        </Form>
      </Dialog>
    </Overlay>
  );
}

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
`;

const Dialog = styled.div`
  width: 100%;
  max-width: ${({ $esLote }) => ($esLote ? "920px" : "520px")};
  max-height: min(90vh, ${({ $esLote }) => ($esLote ? "820px" : "640px")});
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.22);
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const DialogHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px 14px;
  border-bottom: 1px solid #eee;
`;

const Titulo = styled.h3`
  margin: 0 0 4px;
  font-size: 1.1rem;
  color: #222;
`;

const Subtitulo = styled.p`
  margin: 0;
  font-size: 0.82rem;
  color: #666;
  line-height: 1.4;
`;

const BtnCerrar = styled.button`
  border: none;
  background: #f3f3f3;
  color: #555;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  font-size: 1.4rem;
  line-height: 1;
  cursor: pointer;
  flex-shrink: 0;

  &:hover {
    background: #e8e8e8;
    color: #222;
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
`;

const CamposComunes = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 20px 0;
`;

const GridCampos = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding: 16px 20px 0;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

const Campo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  grid-column: ${({ $anchoCompleto }) => ($anchoCompleto ? "1 / -1" : "auto")};

  label {
    font-size: 0.78rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #666;
  }

  input {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #ccc;
    border-radius: 8px;
    font-size: 0.95rem;
    color: #222;

    &:focus {
      outline: none;
      border-color: #e53935;
      box-shadow: 0 0 0 2px rgba(229, 57, 53, 0.15);
    }
  }
`;

const Ayuda = styled.span`
  font-size: 0.75rem;
  color: #888;
  line-height: 1.35;
`;

const FilaEnlace = styled.div`
  display: flex;
  gap: 8px;
  align-items: stretch;

  input {
    flex: 1;
    min-width: 0;
  }

  @media (max-width: 560px) {
    flex-direction: column;
  }
`;

const BtnAbrirMega = styled.button`
  border: 1px solid #d32f2f;
  background: #fff;
  color: #d32f2f;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  flex-shrink: 0;

  &:hover {
    background: #ffebee;
  }
`;

const TablaScroll = styled.div`
  flex: 1;
  min-height: 0;
  overflow: auto;
  margin: 16px 20px 0;
  border: 1px solid #e5e5e5;
  border-radius: 10px;
`;

const Tabla = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 760px;
  background: #fff;

  th,
  td {
    padding: 10px 12px;
    border-bottom: 1px solid #eee;
    text-align: left;
    vertical-align: middle;
  }

  th {
    position: sticky;
    top: 0;
    background: #222;
    color: #fff;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    z-index: 1;
  }

  td:first-child {
    font-weight: 700;
    white-space: nowrap;
  }

  td:nth-child(2) {
    max-width: 180px;
    font-size: 0.85rem;
    color: #444;
  }

  td input {
    width: 100%;
    min-width: 120px;
    padding: 8px 10px;
    border: 1px solid #ccc;
    border-radius: 6px;
    font-size: 0.85rem;

    &:focus {
      outline: none;
      border-color: #e53935;
    }
  }

  tbody tr:last-child td {
    border-bottom: none;
  }
`;

const DialogFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid #eee;
  background: #fafafa;
  margin-top: auto;
`;

const BtnBase = styled.button`
  padding: 10px 18px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
`;

const BtnSecundario = styled(BtnBase)`
  border: 1px solid #ccc;
  background: #fff;
  color: #444;

  &:hover {
    background: #f3f3f3;
  }
`;

const BtnPrimario = styled(BtnBase)`
  border: 1px solid #e53935;
  background: #e53935;
  color: #fff;

  &:hover {
    background: #c62828;
    border-color: #c62828;
  }
`;
