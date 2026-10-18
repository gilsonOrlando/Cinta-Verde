import { useMemo, useRef, useState } from "react";
import styled from "styled-components";

const BODEGAS_INICIALES = [
  { id: "compras", nombre: "Bodega de compras", tipo: "hub", x: 48, y: 46 },
  { id: "catamayo", nombre: "Catamayo", tipo: "agencia", x: 78, y: 22 },
  { id: "loja", nombre: "Loja", tipo: "agencia", x: 18, y: 24 },
  { id: "machala", nombre: "Machala", tipo: "agencia", x: 16, y: 72 },
  { id: "cuenca", nombre: "Cuenca", tipo: "agencia", x: 80, y: 70 },
  { id: "zamora", nombre: "Zamora", tipo: "agencia", x: 50, y: 16 },
];

const FLUJOS = [
  { id: "f1", from: "compras", to: "catamayo", cantidad: 12 },
  { id: "f2", from: "compras", to: "loja", cantidad: 7 },
  { id: "f3", from: "compras", to: "machala", cantidad: 9 },
  { id: "f4", from: "compras", to: "cuenca", cantidad: 5 },
  { id: "f5", from: "compras", to: "zamora", cantidad: 4 },
  { id: "f6", from: "catamayo", to: "loja", cantidad: 2 },
];

export function PizarraTransferencias() {
  const tableroRef = useRef(null);
  const arrastreRef = useRef(null);
  const [bodegas, setBodegas] = useState(BODEGAS_INICIALES);
  const [seleccion, setSeleccion] = useState("compras");
  const [flujoActivo, setFlujoActivo] = useState(null);

  const mapa = useMemo(
    () => Object.fromEntries(bodegas.map((item) => [item.id, item])),
    [bodegas]
  );

  const bodegaActiva = mapa[seleccion];
  const flujosBodega = FLUJOS.filter(
    (flujo) => flujo.from === seleccion || flujo.to === seleccion
  );

  const iniciarArrastre = (event, id) => {
    event.preventDefault();
    event.stopPropagation();
    const rect = tableroRef.current?.getBoundingClientRect();
    if (!rect) return;

    const nodo = mapa[id];
    arrastreRef.current = {
      id,
      offsetX: ((event.clientX - rect.left) / rect.width) * 100 - nodo.x,
      offsetY: ((event.clientY - rect.top) / rect.height) * 100 - nodo.y,
    };
    setSeleccion(id);
    setFlujoActivo(null);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const moverArrastre = (event) => {
    const arrastre = arrastreRef.current;
    const rect = tableroRef.current?.getBoundingClientRect();
    if (!arrastre || !rect) return;

    const x = Math.min(
      90,
      Math.max(10, ((event.clientX - rect.left) / rect.width) * 100 - arrastre.offsetX)
    );
    const y = Math.min(
      88,
      Math.max(12, ((event.clientY - rect.top) / rect.height) * 100 - arrastre.offsetY)
    );

    setBodegas((prev) =>
      prev.map((item) => (item.id === arrastre.id ? { ...item, x, y } : item))
    );
  };

  const terminarArrastre = () => {
    arrastreRef.current = null;
  };

  const restablecer = () => {
    setBodegas(BODEGAS_INICIALES);
    setSeleccion("compras");
    setFlujoActivo(null);
  };

  return (
    <Layout>
      <Cabecera>
        <div>
          <Kicker>Diseño interactivo</Kicker>
          <Titulo>Transferencias entre bodegas</Titulo>
          <Subtitulo>
            Pizarra de flujo. Arrastra las bodegas, haz clic para resaltar conexiones y
            explora el mapa. Los datos aún son de demostración.
          </Subtitulo>
        </div>
        <BtnReset type="button" onClick={restablecer}>
          Restablecer pizarra
        </BtnReset>
      </Cabecera>

      <Cuerpo>
        <Marco>
          <Tablero
            ref={tableroRef}
            onPointerMove={moverArrastre}
            onPointerUp={terminarArrastre}
            onPointerLeave={terminarArrastre}
          >
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <marker
                  id="flecha-pizarra"
                  markerWidth="6"
                  markerHeight="6"
                  refX="5"
                  refY="3"
                  orient="auto"
                >
                  <path d="M0,0 L6,3 L0,6 Z" fill="#f3e5ab" />
                </marker>
              </defs>
              {FLUJOS.map((flujo) => {
                const origen = mapa[flujo.from];
                const destino = mapa[flujo.to];
                if (!origen || !destino) return null;

                const activo =
                  flujoActivo === flujo.id ||
                  seleccion === flujo.from ||
                  seleccion === flujo.to;
                const mx = (origen.x + destino.x) / 2;
                const my = (origen.y + destino.y) / 2 - 4;

                return (
                  <g key={flujo.id} onClick={() => setFlujoActivo(flujo.id)}>
                    <path
                      d={`M ${origen.x} ${origen.y} Q ${mx} ${my} ${destino.x} ${destino.y}`}
                      fill="none"
                      stroke={activo ? "#ffec8a" : "rgba(243, 229, 171, 0.35)"}
                      strokeWidth={activo ? 1.1 : 0.55}
                      markerEnd="url(#flecha-pizarra)"
                    />
                    <text
                      x={(origen.x + destino.x) / 2}
                      y={(origen.y + destino.y) / 2 - 1.6}
                      textAnchor="middle"
                      fill={activo ? "#fff8dc" : "rgba(255,248,220,0.55)"}
                      fontSize="2.4"
                    >
                      {flujo.cantidad}
                    </text>
                  </g>
                );
              })}
            </svg>

            {bodegas.map((bodega) => (
              <Nodo
                key={bodega.id}
                $x={bodega.x}
                $y={bodega.y}
                $hub={bodega.tipo === "hub"}
                $activo={seleccion === bodega.id}
                onPointerDown={(event) => iniciarArrastre(event, bodega.id)}
              >
                <Pin aria-hidden="true" />
                <NodoTipo>{bodega.tipo === "hub" ? "Origen" : "Agencia"}</NodoTipo>
                <NodoNombre>{bodega.nombre}</NodoNombre>
              </Nodo>
            ))}
          </Tablero>
        </Marco>

        <Panel>
          <PanelTitulo>{bodegaActiva?.nombre ?? "Bodega"}</PanelTitulo>
          <PanelDato>
            {bodegaActiva?.tipo === "hub"
              ? "Punto de despacho principal"
              : "Agencia receptora"}
          </PanelDato>
          <ListaFlujos>
            {flujosBodega.map((flujo) => {
              const origen = mapa[flujo.from];
              const destino = mapa[flujo.to];
              return (
                <FlujoItem
                  key={flujo.id}
                  $activo={flujoActivo === flujo.id}
                  type="button"
                  onClick={() => setFlujoActivo(flujo.id)}
                >
                  <span>
                    {origen?.nombre} → {destino?.nombre}
                  </span>
                  <strong>{flujo.cantidad} envíos</strong>
                </FlujoItem>
              );
            })}
          </ListaFlujos>
          <Nota>Próximo paso: conectar estas rutas con transferencias reales.</Nota>
        </Panel>
      </Cuerpo>
    </Layout>
  );
}

const Layout = styled.section`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const Cabecera = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  flex-wrap: wrap;
`;

const Kicker = styled.p`
  margin: 0 0 4px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #2e7d32;
`;

const Titulo = styled.h1`
  margin: 0 0 6px;
  font-size: 1.55rem;
  color: #1b5e20;
`;

const Subtitulo = styled.p`
  margin: 0;
  max-width: 640px;
  color: #555;
  font-size: 0.92rem;
  line-height: 1.45;
`;

const BtnReset = styled.button`
  border: 1px solid #2e7d32;
  background: #fff;
  color: #2e7d32;
  padding: 10px 14px;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    background: #e8f5e9;
  }
`;

const Cuerpo = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: 16px;
  min-height: 620px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const Marco = styled.div`
  border: 12px solid #6d4c41;
  border-radius: 10px;
  box-shadow:
    inset 0 0 0 5px #4e342e,
    0 18px 40px rgba(0, 0, 0, 0.18);
  overflow: hidden;
  min-height: 560px;
`;

const Tablero = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 560px;
  background:
    radial-gradient(circle at 18% 20%, rgba(255, 255, 255, 0.05), transparent 32%),
    radial-gradient(circle at 80% 70%, rgba(0, 0, 0, 0.18), transparent 36%),
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 27px,
      rgba(255, 255, 255, 0.03) 28px
    ),
    repeating-linear-gradient(
      90deg,
      transparent,
      transparent 27px,
      rgba(255, 255, 255, 0.03) 28px
    ),
    #1b4332;
  touch-action: none;
  user-select: none;

  svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  svg g {
    pointer-events: stroke;
    cursor: pointer;
  }

  svg text {
    font-family: Arial, Helvetica, sans-serif;
    font-weight: 700;
    pointer-events: none;
  }
`;

const Nodo = styled.button`
  position: absolute;
  left: ${({ $x }) => `${$x}%`};
  top: ${({ $y }) => `${$y}%`};
  transform: translate(-50%, -50%);
  width: 148px;
  border: none;
  border-radius: 8px;
  padding: 12px 10px 10px;
  background: ${({ $hub, $activo }) =>
    $activo ? "#fff8e1" : $hub ? "#ffe082" : "#fffde7"};
  box-shadow: ${({ $activo }) =>
    $activo
      ? "0 0 0 3px #ffec8a, 0 8px 18px rgba(0, 0, 0, 0.28)"
      : "0 6px 14px rgba(0, 0, 0, 0.22)"};
  cursor: grab;
  text-align: center;

  &:active {
    cursor: grabbing;
  }
`;

const Pin = styled.span`
  position: absolute;
  top: 5px;
  left: 50%;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #c62828;
  transform: translateX(-50%);
  box-shadow: 0 1px 0 #7f1010;
`;

const NodoTipo = styled.small`
  display: block;
  margin-top: 6px;
  font-size: 0.62rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #8d6e63;
  font-weight: 700;
`;

const NodoNombre = styled.strong`
  display: block;
  margin-top: 2px;
  color: #3e2723;
  font-size: 0.86rem;
  line-height: 1.2;
`;

const Panel = styled.aside`
  background: #faf7f0;
  border: 1px solid #e0d6c6;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const PanelTitulo = styled.h2`
  margin: 0;
  font-size: 1.05rem;
  color: #3e2723;
`;

const PanelDato = styled.p`
  margin: 0;
  color: #6d4c41;
  font-size: 0.84rem;
`;

const ListaFlujos = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const FlujoItem = styled.button`
  border: 1px solid ${({ $activo }) => ($activo ? "#2e7d32" : "#e8dfd0")};
  background: ${({ $activo }) => ($activo ? "#e8f5e9" : "#fff")};
  border-radius: 8px;
  padding: 10px;
  text-align: left;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 4px;

  span {
    color: #444;
    font-size: 0.82rem;
  }

  strong {
    color: #1b5e20;
    font-size: 0.84rem;
  }
`;

const Nota = styled.p`
  margin: auto 0 0;
  font-size: 0.78rem;
  color: #888;
  line-height: 1.4;
`;
