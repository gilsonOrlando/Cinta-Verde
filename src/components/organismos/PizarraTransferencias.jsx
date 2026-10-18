import { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import toast from "react-hot-toast";
import { RiCloseLine, RiMenuLine } from "react-icons/ri";
import { supabaseConfigurado } from "../../supabase/supabase.config";
import { esMatriz, listarSucursales } from "../../supabase/crudSucursal";
import { crearRuta, listarRutas } from "../../supabase/crudRuta";
import { interpretarErrorSupabase } from "../../utils/interpretarErrorSupabase";
import { SUCURSALES_SEMILLA, ubicarSucursales } from "../../utils/sucursalesSemilla";
import { CrearRutaModal } from "../modals/CrearRutaModal";

function conPosicion(sucursales) {
  return ubicarSucursales(
    sucursales.map((item) => ({
      id: item.id ?? item.nombre,
      nombre: item.nombre,
      tipo: item.tipo,
    }))
  );
}

function posicionNodoRuta(index) {
  return { x: 78, y: 42 + index * 14 };
}

function formatearFecha(fecha) {
  const texto = String(fecha ?? "").slice(0, 10);
  const [anio, mes, dia] = texto.split("-");
  if (!anio || !mes || !dia) return texto;
  return `${dia}/${mes}/${anio}`;
}

export function PizarraTransferencias() {
  const tableroRef = useRef(null);
  const arrastreRef = useRef(null);
  const originalesRef = useRef(conPosicion(SUCURSALES_SEMILLA));
  const [bodegas, setBodegas] = useState(originalesRef.current);
  const [rutas, setRutas] = useState([]);
  const [seleccion, setSeleccion] = useState(originalesRef.current[0]?.id ?? null);
  const [cargando, setCargando] = useState(true);
  const [menuGestionAbierto, setMenuGestionAbierto] = useState(false);
  const [mostrarRutaModal, setMostrarRutaModal] = useState(false);
  const [guardandoRuta, setGuardandoRuta] = useState(false);
  const menuGestionRef = useRef(null);

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

        try {
          const rutasDb = await listarRutas();
          if (!activo) return;
          setRutas(rutasDb.map((ruta, index) => ({ ...ruta, ...posicionNodoRuta(index) })));
        } catch (errorRutas) {
          console.error(errorRutas);
        }
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

  useEffect(() => {
    function handleClickFuera(event) {
      if (!menuGestionRef.current?.contains(event.target)) {
        setMenuGestionAbierto(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") setMenuGestionAbierto(false);
    }

    document.addEventListener("mousedown", handleClickFuera);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickFuera);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const mapa = useMemo(
    () => Object.fromEntries(bodegas.map((item) => [item.id, item])),
    [bodegas]
  );

  const bodegaActiva = mapa[seleccion];
  const rutaActiva = rutas.find((item) => item.id === seleccion);

  const iniciarArrastre = (event, id, tipo = "sucursal") => {
    event.preventDefault();
    event.stopPropagation();
    const rect = tableroRef.current?.getBoundingClientRect();
    if (!rect) return;

    const nodo =
      tipo === "ruta" ? rutas.find((item) => item.id === id) : mapa[id];
    if (!nodo) return;

    arrastreRef.current = {
      id,
      tipo,
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

    if (arrastre.tipo === "ruta") {
      setRutas((prev) =>
        prev.map((item) => (item.id === arrastre.id ? { ...item, x, y } : item))
      );
      return;
    }

    setBodegas((prev) =>
      prev.map((item) => (item.id === arrastre.id ? { ...item, x, y } : item))
    );
  };

  const terminarArrastre = () => {
    arrastreRef.current = null;
  };

  const handleCrearRuta = async ({ origenId, fecha, chofer, destinoIds }) => {
    setGuardandoRuta(true);
    try {
      const ruta = await crearRuta({
        origenId,
        fecha,
        chofer,
        destinoIds,
        sucursales: bodegas,
      });
      setRutas((prev) => [...prev, { ...ruta, ...posicionNodoRuta(prev.length) }]);
      setSeleccion(ruta.id);
      setMostrarRutaModal(false);
      toast.success("Ruta creada.");
    } catch (error) {
      console.error(error);
      toast.error(interpretarErrorSupabase(error));
    } finally {
      setGuardandoRuta(false);
    }
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
        <Acciones>
          <MenuGestion ref={menuGestionRef}>
            <BtnGestion
              type="button"
              aria-haspopup="menu"
              aria-expanded={menuGestionAbierto}
              onClick={() => setMenuGestionAbierto((abierto) => !abierto)}
            >
              {menuGestionAbierto ? <RiCloseLine /> : <RiMenuLine />}
              Gestión
            </BtnGestion>
            {menuGestionAbierto && (
              <MenuLista role="menu">
                <MenuItem
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuGestionAbierto(false);
                    setMostrarRutaModal(true);
                  }}
                >
                  Ruta
                </MenuItem>
              </MenuLista>
            )}
          </MenuGestion>
        </Acciones>
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
                  id="flecha-ruta"
                  markerWidth="3.2"
                  markerHeight="3.2"
                  refX="2.8"
                  refY="1.6"
                  orient="auto"
                >
                  <path d="M0,0 L3.2,1.6 L0,3.2 Z" fill="#ffffff" />
                </marker>
              </defs>
              {rutas.flatMap((ruta) => {
                const origen = mapa[ruta.origen_id];
                if (!origen) return [];
                const activo =
                  seleccion === ruta.id ||
                  seleccion === ruta.origen_id ||
                  ruta.destinoIds.includes(seleccion);
                const color = activo ? "#ffffff" : "rgba(255, 255, 255, 0.72)";
                const ancho = activo ? 0.28 : 0.16;
                const lineas = [
                  <path
                    key={`${ruta.id}-origen`}
                    d={`M ${origen.x} ${origen.y} L ${ruta.x} ${ruta.y}`}
                    fill="none"
                    stroke={color}
                    strokeWidth={ancho}
                  />,
                ];
                for (const destinoId of ruta.destinoIds) {
                  const destino = mapa[destinoId];
                  if (!destino) continue;
                  lineas.push(
                    <path
                      key={`${ruta.id}-${destinoId}`}
                      d={`M ${ruta.x} ${ruta.y} L ${destino.x} ${destino.y}`}
                      fill="none"
                      stroke={color}
                      strokeWidth={ancho}
                      markerEnd="url(#flecha-ruta)"
                    />
                  );
                }
                return lineas;
              })}
            </svg>

            {rutas.map((ruta) => (
              <NodoRuta
                key={ruta.id}
                $x={ruta.x}
                $y={ruta.y}
                $activo={seleccion === ruta.id}
                onPointerDown={(event) => iniciarArrastre(event, ruta.id, "ruta")}
              >
                <NodoTipo>Ruta</NodoTipo>
                <NodoNombre>{ruta.chofer}</NodoNombre>
                <NodoTipo>{formatearFecha(ruta.fecha)}</NodoTipo>
              </NodoRuta>
            ))}

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
                  <NodoTipo $compacto={!matriz}>{matriz ? "Matriz" : "Agencia"}</NodoTipo>
                  <NodoNombre $compacto={!matriz}>{bodega.nombre}</NodoNombre>
                </Nodo>
              );
            })}
          </Tablero>
        </Marco>

        <Panel>
          {rutaActiva ? (
            <>
              <PanelTitulo>{rutaActiva.chofer}</PanelTitulo>
              <PanelDato>Ruta · {formatearFecha(rutaActiva.fecha)}</PanelDato>
              <Nota>
                Origen: {mapa[rutaActiva.origen_id]?.nombre ?? "—"}
                <br />
                Destinos:{" "}
                {rutaActiva.destinoIds
                  .map((id) => mapa[id]?.nombre)
                  .filter(Boolean)
                  .join(", ") || "—"}
              </Nota>
            </>
          ) : (
            <>
              <PanelTitulo>{bodegaActiva?.nombre ?? "Sucursal"}</PanelTitulo>
              <PanelDato>
                {esMatriz(bodegaActiva?.tipo) ? "Matriz" : "Agencia"}
              </PanelDato>
            </>
          )}
          <Leyenda>
            <span>
              <Muestra $matriz /> Matriz
            </span>
            <span>
              <Muestra /> Agencia
            </span>
            <span>
              <Muestra $ruta /> Ruta
            </span>
          </Leyenda>
          <Nota>
            {bodegas.length} sucursales · {rutas.length} ruta(s). Usa Gestión → Ruta para
            crear un recorrido.
          </Nota>
        </Panel>
      </Cuerpo>

      {mostrarRutaModal && (
        <CrearRutaModal
          sucursales={bodegas}
          guardando={guardandoRuta}
          onConfirmar={handleCrearRuta}
          onClose={() => {
            if (!guardandoRuta) setMostrarRutaModal(false);
          }}
        />
      )}
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

const Acciones = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`;

const MenuGestion = styled.div`
  position: relative;
`;

const BtnGestion = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid #2e7d32;
  background: #2e7d32;
  color: #fff;
  padding: 10px 14px;
  border-radius: 8px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;

  svg {
    font-size: 1.2rem;
  }

  &:hover {
    background: #1b5e20;
    border-color: #1b5e20;
  }
`;

const MenuLista = styled.div`
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  min-width: 220px;
  background: #fff;
  border: 1px solid #d8e8d8;
  border-radius: 10px;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.14);
  padding: 6px;
  z-index: 20;
`;

const MenuItem = styled.button`
  width: 100%;
  border: none;
  background: transparent;
  text-align: left;
  padding: 10px 12px;
  border-radius: 8px;
  color: #333;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background: #e8f5e9;
    color: #1b5e20;
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

  svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 0;
  }
`;

const Nodo = styled.button`
  position: absolute;
  left: ${({ $x }) => `${$x}%`};
  top: ${({ $y }) => `${$y}%`};
  transform: translate(-50%, -50%);
  width: ${({ $matriz }) => ($matriz ? "150px" : "96px")};
  border: none;
  border-radius: 8px;
  padding: ${({ $matriz }) => ($matriz ? "14px 10px 12px" : "7px 4px 6px")};
  background: ${({ $matriz, $activo }) =>
    $activo ? "#fff8e1" : $matriz ? "#ffe082" : "#fffde7"};
  box-shadow: ${({ $activo }) =>
    $activo
      ? "0 0 0 3px #ffec8a, 0 8px 18px rgba(0, 0, 0, 0.28)"
      : "0 6px 14px rgba(0, 0, 0, 0.22)"};
  cursor: grab;
  text-align: center;
  z-index: ${({ $matriz }) => ($matriz ? 3 : 2)};

  &:active {
    cursor: grabbing;
  }
`;

const NodoRuta = styled.button`
  position: absolute;
  left: ${({ $x }) => `${$x}%`};
  top: ${({ $y }) => `${$y}%`};
  transform: translate(-50%, -50%);
  width: 132px;
  border: none;
  border-radius: 999px;
  padding: 10px 10px 8px;
  background: ${({ $activo }) => ($activo ? "#c8e6c9" : "#a5d6a7")};
  box-shadow: ${({ $activo }) =>
    $activo
      ? "0 0 0 3px #fff59d, 0 8px 18px rgba(0, 0, 0, 0.28)"
      : "0 6px 14px rgba(0, 0, 0, 0.22)"};
  cursor: grab;
  text-align: center;
  z-index: 4;

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
  margin-top: ${({ $compacto }) => ($compacto ? "4px" : "6px")};
  font-size: ${({ $compacto }) => ($compacto ? "0.5rem" : "0.58rem")};
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #8d6e63;
  font-weight: 700;
`;

const NodoNombre = styled.strong`
  display: block;
  margin-top: 2px;
  color: #3e2723;
  font-size: ${({ $compacto }) => ($compacto ? "0.62rem" : "0.74rem")};
  line-height: 1.15;
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
  background: ${({ $matriz, $ruta }) =>
    $ruta ? "#a5d6a7" : $matriz ? "#ffe082" : "#fffde7"};
  border: 1px solid #d7ccc8;
`;

const Nota = styled.p`
  margin: auto 0 0;
  font-size: 0.78rem;
  color: #888;
  line-height: 1.4;
`;
