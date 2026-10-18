import { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { supabaseConfigurado } from "../../supabase/supabase.config";
import { esMatriz, listarSucursales } from "../../supabase/crudSucursal";
import { SUCURSALES_SEMILLA, ubicarSucursales } from "../../utils/sucursalesSemilla";

function conPosicion(sucursales) {
  return ubicarSucursales(
    sucursales.map((item) => ({
      id: item.id ?? item.nombre,
      nombre: item.nombre,
      tipo: item.tipo,
    }))
  );
}

export function PizarraTransferencias() {
  const tableroRef = useRef(null);
  const arrastreRef = useRef(null);
  const originalesRef = useRef(conPosicion(SUCURSALES_SEMILLA));
  const [bodegas, setBodegas] = useState(originalesRef.current);
  const [seleccion, setSeleccion] = useState(originalesRef.current[0]?.id ?? null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;

    async function cargar() {
      if (!supabaseConfigurado) {
        setCargando(false);
        return;
      }

      try {
        const sucursales = await listarSucursales();
        if (!activo || sucursales.length === 0) return;

        const ubicadas = conPosicion(sucursales);
        originalesRef.current = ubicadas;
        setBodegas(ubicadas);
        setSeleccion(ubicadas[0]?.id ?? null);
      } catch (error) {
        console.error(error);
      } finally {
        if (activo) setCargando(false);
      }
    }

    cargar();
    return () => {
      activo = false;
    };
  }, []);

  const mapa = useMemo(
    () => Object.fromEntries(bodegas.map((item) => [item.id, item])),
    [bodegas]
  );

  const bodegaActiva = mapa[seleccion];

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
    setBodegas(originalesRef.current);
    setSeleccion(originalesRef.current[0]?.id ?? null);
  };

  return (
    <Layout>
      <Cabecera>
        <div>
          <Kicker>Actores de transferencia</Kicker>
          <Titulo>Transferencias entre bodegas</Titulo>
          <Subtitulo>
            {cargando
              ? "Cargando sucursales…"
              : "Arrastra las sucursales en la pizarra. Las matrices usan el color ámbar y las agencias el color crema."}
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
            {bodegas.map((bodega) => {
              const matriz = esMatriz(bodega.tipo);
              return (
                <Nodo
                  key={bodega.id}
                  $x={bodega.x}
                  $y={bodega.y}
                  $matriz={matriz}
                  $activo={seleccion === bodega.id}
                  onPointerDown={(event) => iniciarArrastre(event, bodega.id)}
                >
                  <Pin aria-hidden="true" />
                  <NodoTipo>{matriz ? "Matriz" : "Agencia"}</NodoTipo>
                  <NodoNombre>{bodega.nombre}</NodoNombre>
                </Nodo>
              );
            })}
          </Tablero>
        </Marco>

        <Panel>
          <PanelTitulo>{bodegaActiva?.nombre ?? "Sucursal"}</PanelTitulo>
          <PanelDato>
            {esMatriz(bodegaActiva?.tipo) ? "Matriz" : "Agencia"}
          </PanelDato>
          <Leyenda>
            <span>
              <Muestra $matriz /> Matriz
            </span>
            <span>
              <Muestra /> Agencia
            </span>
          </Leyenda>
          <Nota>
            {bodegas.length} sucursales registradas. Los flujos de transferencia se
            conectarán en el siguiente paso.
          </Nota>
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
  grid-template-columns: minmax(0, 1fr) 260px;
  gap: 16px;
  min-height: 680px;

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
  min-height: 640px;
`;

const Tablero = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 640px;
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
`;

const Nodo = styled.button`
  position: absolute;
  left: ${({ $x }) => `${$x}%`};
  top: ${({ $y }) => `${$y}%`};
  transform: translate(-50%, -50%);
  width: ${({ $matriz }) => ($matriz ? "150px" : "118px")};
  border: none;
  border-radius: 8px;
  padding: ${({ $matriz }) => ($matriz ? "14px 10px 12px" : "10px 6px 8px")};
  background: ${({ $matriz, $activo }) =>
    $activo ? "#fff8e1" : $matriz ? "#ffe082" : "#fffde7"};
  box-shadow: ${({ $activo }) =>
    $activo
      ? "0 0 0 3px #ffec8a, 0 8px 18px rgba(0, 0, 0, 0.28)"
      : "0 6px 14px rgba(0, 0, 0, 0.22)"};
  cursor: grab;
  text-align: center;
  z-index: ${({ $matriz }) => ($matriz ? 2 : 1)};

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
  font-size: 0.58rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #8d6e63;
  font-weight: 700;
`;

const NodoNombre = styled.strong`
  display: block;
  margin-top: 2px;
  color: #3e2723;
  font-size: 0.74rem;
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
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

const Leyenda = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 0.82rem;
  color: #555;

  span {
    display: flex;
    align-items: center;
    gap: 8px;
  }
`;

const Muestra = styled.i`
  width: 16px;
  height: 16px;
  border-radius: 4px;
  background: ${({ $matriz }) => ($matriz ? "#ffe082" : "#fffde7")};
  border: 1px solid #d7ccc8;
`;

const Nota = styled.p`
  margin: auto 0 0;
  font-size: 0.78rem;
  color: #888;
  line-height: 1.4;
`;
