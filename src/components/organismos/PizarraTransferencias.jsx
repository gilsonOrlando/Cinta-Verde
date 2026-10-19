import { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import toast from "react-hot-toast";
import {
  RiBuildingFill,
  RiCalendarFill,
  RiCloseLine,
  RiFilePdfFill,
  RiKey2Fill,
  RiMapPinFill,
  RiMenuLine,
  RiSteeringFill,
  RiStore2Fill,
  RiTruckFill,
} from "react-icons/ri";
import { supabaseConfigurado } from "../../supabase/supabase.config";
import { esMatriz, listarSucursales } from "../../supabase/crudSucursal";
import {
  actualizarRuta,
  asegurarRutaTransitoria,
  crearRuta,
  eliminarRuta,
  esRutaTransitoria,
  listarRutas,
} from "../../supabase/crudRuta";
import {
  actualizarTransferencia,
  crearTransferencia,
  devolverTransferenciaATransitorio,
  eliminarTransferencia,
  listarTransferencias,
  moverTransferenciasARuta,
  puedeGestionarItemTransferencia,
  urlArchivoTransferencia,
} from "../../supabase/crudTransferencia";
import { interpretarErrorSupabase } from "../../utils/interpretarErrorSupabase";
import {
  borrarSesionTransferencia,
  leerSesionTransferencia,
  puedeCrudTransferencias,
  puedeGestionarRutas,
} from "../../supabase/crudUsuariosTransferencias";
import { SUCURSALES_SEMILLA, ubicarSucursales } from "../../utils/sucursalesSemilla";
import { CrearRutaModal } from "../modals/CrearRutaModal";
import { CargarTransferenciaModal } from "../modals/CargarTransferenciaModal";
import { AsignarTransferenciasModal } from "../modals/AsignarTransferenciasModal";
import { LoginTransferencias } from "./LoginTransferencias";

const COLORES_MATRIZ = [
  ["#ffb74d", "#ffcc80", "#ff8a65", "#ffe082"],
  ["#4fc3f7", "#81d4fa", "#26c6da", "#80deea"],
  ["#f48fb1", "#f8bbd0", "#ce93d8", "#e1bee7"],
  ["#b39ddb", "#c5cae9", "#9fa8da", "#d1c4e9"],
  ["#ffd54f", "#fff176", "#ffca28", "#ffecb3"],
  ["#a1887f", "#bcaaa4", "#8d6e63", "#d7ccc8"],
];

function indiceMatriz(item, sucursales = []) {
  const matrices = sucursales
    .filter((sucursal) => esMatriz(sucursal.tipo))
    .slice()
    .sort((a, b) => String(a.nombre ?? "").localeCompare(String(b.nombre ?? ""), "es"));
  let index = matrices.findIndex((sucursal) => sucursal.id === item?.id);
  if (index < 0) {
    index = matrices.findIndex((sucursal) => sucursal.nombre === item?.nombre);
  }
  return index < 0 ? 0 : index;
}

function colorDeMatriz(item, sucursales = []) {
  if (!esMatriz(item?.tipo)) return "#fffde7";
  const familia = COLORES_MATRIZ[indiceMatriz(item, sucursales) % COLORES_MATRIZ.length];
  return familia[0];
}

function colorDeRuta(ruta, sucursales = [], rutas = []) {
  const origen = sucursales.find((item) => item.id === ruta?.origen_id);
  const familia = COLORES_MATRIZ[indiceMatriz(origen, sucursales) % COLORES_MATRIZ.length];
  const hermanas = rutas
    .filter((item) => item.origen_id === ruta?.origen_id && !item.transitorio)
    .slice()
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const index = Math.max(
    0,
    hermanas.findIndex((item) => item.id === ruta?.id)
  );
  return familia[(index + 1) % familia.length];
}

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
  return { x: 78, y: 42 + index * 16 };
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
  const [rutaEdicion, setRutaEdicion] = useState(null);
  const [guardandoRuta, setGuardandoRuta] = useState(false);
  const [rutaFoco, setRutaFoco] = useState(null);
  const [transferencias, setTransferencias] = useState([]);
  const [mostrarCargaModal, setMostrarCargaModal] = useState(false);
  const [rutaCarga, setRutaCarga] = useState(null);
  const [guardandoCarga, setGuardandoCarga] = useState(false);
  const [sesion, setSesion] = useState(() => leerSesionTransferencia());
  const [mostrarCredencial, setMostrarCredencial] = useState(false);
  const [mostrarAsignar, setMostrarAsignar] = useState(false);
  const [matrizAsignar, setMatrizAsignar] = useState(null);
  const [guardandoAsignar, setGuardandoAsignar] = useState(false);
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
          let rutasDb = await listarRutas();
          if (!activo) return;
          const matrices = sucursales.filter((item) => esMatriz(item.tipo));
          for (const matriz of matrices) {
            await asegurarRutaTransitoria(matriz.id);
          }
          rutasDb = await listarRutas();
          if (!activo) return;
          let indiceVisible = 0;
          const rutasConPosicion = rutasDb.map((ruta) => {
            if (esRutaTransitoria(ruta)) return ruta;
            const conPosicion = { ...ruta, ...posicionNodoRuta(indiceVisible) };
            indiceVisible += 1;
            return conPosicion;
          });
          setRutas(rutasConPosicion);
          try {
            const cargadas = await listarTransferencias();
            if (activo) setTransferencias(cargadas);
          } catch (errorTransferencias) {
            console.error(errorTransferencias);
          }
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
  const rutaEnfoque =
    rutas.find((item) => item.id === rutaFoco) ??
    (rutaActiva?.id === seleccion ? rutaActiva : null);
  const idsEnfoque = new Set(
    rutaEnfoque ? [rutaEnfoque.origen_id, ...(rutaEnfoque.destinoIds ?? [])] : []
  );
  const colorEnfoque = rutaEnfoque ? colorDeRuta(rutaEnfoque, bodegas, rutas) : "";

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

  const nombresAgencias = (ruta) =>
    (ruta.destinoIds ?? [])
      .map((id) => mapa[id]?.nombre)
      .filter(Boolean)
      .join(" · ");

  const handleGuardarRuta = async ({ origenId, fecha, chofer, destinoIds }) => {
    setGuardandoRuta(true);
    try {
      if (rutaEdicion?.id) {
        const ruta = await actualizarRuta({
          id: rutaEdicion.id,
          origenId,
          fecha,
          chofer,
          destinoIds,
          sucursales: bodegas,
        });
        setRutas((prev) =>
          prev.map((item) => (item.id === ruta.id ? { ...item, ...ruta } : item))
        );
        setSeleccion(ruta.id);
        toast.success("Ruta actualizada.");
      } else {
        const ruta = await crearRuta({
          origenId,
          fecha,
          chofer,
          destinoIds,
          sucursales: bodegas,
        });
        setRutas((prev) => [
          ...prev,
          {
            ...ruta,
            ...posicionNodoRuta(prev.filter((item) => !esRutaTransitoria(item)).length),
          },
        ]);
        setSeleccion(ruta.id);
        toast.success("Ruta creada.");
      }
      setMostrarRutaModal(false);
      setRutaEdicion(null);
    } catch (error) {
      console.error(error);
      toast.error(interpretarErrorSupabase(error));
    } finally {
      setGuardandoRuta(false);
    }
  };

  const handleEditarRuta = (ruta, event) => {
    event.stopPropagation();
    event.preventDefault();
    setRutaEdicion(ruta);
    setMostrarRutaModal(true);
  };

  const handleEliminarRuta = async (ruta, event) => {
    event.stopPropagation();
    event.preventDefault();
    const ok = window.confirm(`¿Eliminar la ruta de ${ruta.chofer}?`);
    if (!ok) return;

    try {
      const transitoria = await eliminarRuta(ruta.id);
      setRutas((prev) => {
        const resto = prev.filter((item) => item.id !== ruta.id);
        if (transitoria && !resto.some((item) => item.id === transitoria.id)) {
          return [...resto, transitoria];
        }
        return resto;
      });
      setTransferencias((prev) =>
        prev.map((item) =>
          mismoId(item.ruta_id, ruta.id) ? { ...item, ruta_id: transitoria.id } : item
        )
      );
      if (seleccion === ruta.id) setSeleccion(ruta.origen_id);
      toast.success("Ruta eliminada. Las transferencias pasaron a la ruta transitoria.");
    } catch (error) {
      console.error(error);
      toast.error(interpretarErrorSupabase(error));
    }
  };

  const handleAbrirAsignar = (bodega, event) => {
    event.stopPropagation();
    event.preventDefault();
    if (!puedeGestionarRutas(sesion) || !mismoId(sesion?.sucursal_id, bodega.id)) return;
    setSeleccion(bodega.id);
    setMatrizAsignar(bodega);
    setMostrarAsignar(true);
  };

  const handleMoverPendientes = async ({ ids, rutaId }) => {
    if (!puedeGestionarRutas(sesion) || !mismoId(sesion?.sucursal_id, matrizAsignar?.id)) {
      toast.error("Solo un usuario matriz puede pasar estas transferencias.");
      return;
    }
    setGuardandoAsignar(true);
    try {
      await moverTransferenciasARuta({ ids, rutaId });
      setTransferencias((prev) =>
        prev.map((item) =>
          ids.some((id) => String(id) === String(item.id))
            ? { ...item, ruta_id: rutaId }
            : item
        )
      );
      setMostrarAsignar(false);
      setMatrizAsignar(null);
      toast.success("Transferencias pasadas a la ruta entre matrices.");
    } catch (error) {
      console.error(error);
      toast.error(interpretarErrorSupabase(error));
    } finally {
      setGuardandoAsignar(false);
    }
  };

  const handleAbrirCarga = (ruta, event) => {
    event.stopPropagation();
    event.preventDefault();
    setSeleccion(ruta.id);
    setRutaCarga(ruta);
    setMostrarCargaModal(true);
  };

  const handleGuardarTransferencia = async ({
    id,
    origenId,
    sucursalId,
    archivoTransferencia,
    archivoGuia,
  }) => {
    if (!rutaCarga?.id) return;
    if (id) {
      const existente = transferencias.find((item) => String(item.id) === String(id));
      if (!puedeGestionarItemTransferencia(sesion, existente, rutaCarga)) {
        toast.error("Solo la agencia origen o la matriz de la ruta pueden editar esta transferencia.");
        return;
      }
    }
    setGuardandoCarga(true);
    try {
      if (id) {
        const actualizada = await actualizarTransferencia({
          id,
          rutaId: rutaCarga.id,
          sucursalSesionId: sesion?.sucursal_id,
          tipoSesion: sesion?.tipo,
          sucursalId,
          archivoTransferencia,
          archivoGuia,
        });
        setTransferencias((prev) =>
          prev.map((item) => (item.id === actualizada.id ? actualizada : item))
        );
        toast.success("Transferencia actualizada.");
      } else {
        const creada = await crearTransferencia({
          rutaId: rutaCarga.id,
          origenId: sesion?.sucursal_id,
          sucursalId,
          archivoTransferencia,
          archivoGuia,
        });
        setTransferencias((prev) => [...prev, creada]);
        toast.success("Transferencia y guía guardadas.");
      }
      setMostrarCargaModal(false);
      setRutaCarga(null);
    } catch (error) {
      console.error(error);
      toast.error(interpretarErrorSupabase(error));
    } finally {
      setGuardandoCarga(false);
    }
  };

  const handleEliminarTransferencia = async (item) => {
    const ok = window.confirm("¿Eliminar esta transferencia y su guía?");
    if (!ok) return;
    try {
      await eliminarTransferencia(item, {
        sucursalId: sesion?.sucursal_id,
        tipoSesion: sesion?.tipo,
      });
      setTransferencias((prev) => prev.filter((actual) => actual.id !== item.id));
      toast.success("Transferencia eliminada.");
    } catch (error) {
      console.error(error);
      toast.error(interpretarErrorSupabase(error));
    }
  };

  const handleDevolverTransferencia = async (item) => {
    const ok = window.confirm(
      "¿Regresar esta transferencia a la ruta transitorio de la matriz?"
    );
    if (!ok) return;
    try {
      const resultado = await devolverTransferenciaATransitorio(item, {
        sucursalSesionId: sesion?.sucursal_id,
        tipoSesion: sesion?.tipo,
      });
      setTransferencias((prev) =>
        prev.map((actual) =>
          String(actual.id) === String(resultado.transferencia.id)
            ? resultado.transferencia
            : actual
        )
      );
      if (resultado.transitoria) {
        setRutas((prev) =>
          prev.some((ruta) => String(ruta.id) === String(resultado.transitoria.id))
            ? prev
            : [...prev, resultado.transitoria]
        );
      }
      toast.success("Transferencia regresada a la ruta transitorio.");
    } catch (error) {
      console.error(error);
      toast.error(interpretarErrorSupabase(error));
    }
  };

  const mismoId = (a, b) => String(a ?? "") === String(b ?? "");
  const transferenciasDeRuta = (rutaId) =>
    transferencias.filter((item) => mismoId(item.ruta_id, rutaId));
  const rutasVisibles = rutas.filter((item) => !esRutaTransitoria(item));
  const rutaTransitoriaActiva = bodegaActiva
    ? rutas.find(
        (item) =>
          esRutaTransitoria(item) && mismoId(item.origen_id, bodegaActiva.id)
      )
    : null;
  const transferenciasDeMatriz = rutaTransitoriaActiva
    ? transferenciasDeRuta(rutaTransitoriaActiva.id)
    : [];
  const puedeGestionar = puedeGestionarRutas(sesion);
  const puedeEditarTransferencias = puedeCrudTransferencias(sesion);
  const rutasEntreMatricesDe = (matrizId) =>
    rutasVisibles.filter(
      (ruta) =>
        mismoId(ruta.origen_id, matrizId) &&
        (ruta.destinoIds ?? []).some((id) => {
          const destino = mapa[id] ?? bodegas.find((item) => mismoId(item.id, id));
          return esMatriz(destino?.tipo);
        })
    );
  const transitoriaDe = (matrizId) =>
    rutas.find(
      (item) => esRutaTransitoria(item) && mismoId(item.origen_id, matrizId)
    );

  return (
    <Layout>
      <Cabecera>
        <div>
          <Kicker>Actores de transferencia</Kicker>
          <Titulo>Transferencias entre bodegas</Titulo>
          <Subtitulo>
            {cargando
              ? "Cargando sucursales…"
              : "Arrastra las sucursales en la pizarra. Cada matriz tiene un color propio y las agencias usan crema."}
          </Subtitulo>
        </div>
        <Acciones>
          <BtnCredencial
            type="button"
            aria-label="Credencial"
            title={sesion ? `${sesion.sucursal_nombre} · ${sesion.tipo}` : "Credencial"}
            $activo={Boolean(sesion)}
            onClick={() => setMostrarCredencial(true)}
          >
            <RiKey2Fill />
          </BtnCredencial>
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
                {puedeGestionar ? (
                  <MenuItem
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuGestionAbierto(false);
                      setRutaEdicion(null);
                      setMostrarRutaModal(true);
                    }}
                  >
                    Ruta
                  </MenuItem>
                ) : (
                  <MenuItem type="button" role="menuitem" disabled>
                    Inicia sesión como matriz para crear rutas
                  </MenuItem>
                )}
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
              {rutasVisibles.map((ruta) => {
                const origen = mapa[ruta.origen_id];
                if (!origen) return null;
                const activo = seleccion === ruta.id || rutaFoco === ruta.id;
                const color = colorDeRuta(ruta, bodegas, rutas);
                const trazo = {
                  fill: "none",
                  stroke: color,
                  strokeWidth: activo ? 0.38 : 0.24,
                  strokeOpacity: activo ? 0.95 : 0.8,
                };
                const matricesDestino = (ruta.destinoIds ?? [])
                  .map((id) => mapa[id])
                  .filter(
                    (item) => item && esMatriz(item.tipo) && String(item.id) !== String(origen.id)
                  );

                return (
                  <g key={ruta.id}>
                    <path
                      d={`M ${origen.x} ${origen.y} L ${ruta.x} ${ruta.y}`}
                      {...trazo}
                    />
                    {matricesDestino.map((destino) => (
                      <path
                        key={`${ruta.id}-${destino.id}`}
                        d={`M ${destino.x} ${destino.y} L ${ruta.x} ${ruta.y}`}
                        {...trazo}
                      />
                    ))}
                  </g>
                );
              })}
            </svg>

            {rutasVisibles.map((ruta) => (
              <NodoRuta
                key={ruta.id}
                $x={ruta.x}
                $y={ruta.y}
                $color={colorDeRuta(ruta, bodegas, rutas)}
                $activo={seleccion === ruta.id || rutaFoco === ruta.id}
                onPointerDown={(event) => iniciarArrastre(event, ruta.id, "ruta")}
                onPointerEnter={() => setRutaFoco(ruta.id)}
                onPointerLeave={() => setRutaFoco(null)}
              >
                <BtnCamion
                  type="button"
                  aria-label={
                    puedeEditarTransferencias
                      ? "Gestionar transferencia y guía"
                      : "Ver transferencias"
                  }
                  title={
                    puedeEditarTransferencias
                      ? "Gestionar transferencia y guía"
                      : "Ver transferencias"
                  }
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => handleAbrirCarga(ruta, event)}
                >
                  <RiTruckFill />
                  {transferenciasDeRuta(ruta.id).length > 0 && (
                    <BadgeCamion>{transferenciasDeRuta(ruta.id).length}</BadgeCamion>
                  )}
                </BtnCamion>
                {puedeGestionar && (
                <AccionesNodo>
                  <BtnNodo
                    type="button"
                    aria-label="Editar ruta"
                    title="Editar ruta"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => handleEditarRuta(ruta, event)}
                  >
                    ✎
                  </BtnNodo>
                  <BtnNodo
                    type="button"
                    $peligro
                    aria-label="Eliminar ruta"
                    title="Eliminar ruta"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => handleEliminarRuta(ruta, event)}
                  >
                    ×
                  </BtnNodo>
                </AccionesNodo>
                )}
                <NodoTipo>Ruta</NodoTipo>
                <DestinosRuta>{nombresAgencias(ruta) || "Sin agencias"}</DestinosRuta>
                <NodoChofer>Chofer: {ruta.chofer}</NodoChofer>
                <NodoTipo>{formatearFecha(ruta.fecha)}</NodoTipo>
              </NodoRuta>
            ))}

            {bodegas.map((bodega) => {
              const matriz = esMatriz(bodega.tipo);
              const pendientes = matriz
                ? transferenciasDeRuta(transitoriaDe(bodega.id)?.id)
                : [];
              return (
                <Nodo
                  key={bodega.id}
                  $x={bodega.x}
                  $y={bodega.y}
                  $matriz={matriz}
                  $colorNodo={colorDeMatriz(bodega, bodegas)}
                  $activo={seleccion === bodega.id}
                  $enfoque={idsEnfoque.has(bodega.id)}
                  $colorEnfoque={colorEnfoque}
                  onPointerDown={(event) => iniciarArrastre(event, bodega.id)}
                >
                  {matriz &&
                    puedeGestionar &&
                    mismoId(sesion?.sucursal_id, bodega.id) && (
                    <BtnCamion
                      type="button"
                      aria-label="Pasar transferencias pendientes a una ruta"
                      title="Pasar transferencias pendientes a una ruta"
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={(event) => handleAbrirAsignar(bodega, event)}
                    >
                      <RiTruckFill />
                      {pendientes.length > 0 && <BadgeCamion>{pendientes.length}</BadgeCamion>}
                    </BtnCamion>
                  )}
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
              <PanelDato>Ruta</PanelDato>
              <Atributo>
                <RiSteeringFill />
                <span>Chofer: {rutaActiva.chofer}</span>
              </Atributo>
              <Atributo>
                <RiCalendarFill />
                <span>Fecha: {formatearFecha(rutaActiva.fecha)}</span>
              </Atributo>
              <Atributo>
                <RiBuildingFill />
                <span>Origen: {mapa[rutaActiva.origen_id]?.nombre ?? "—"}</span>
              </Atributo>
              <Atributo>
                <RiMapPinFill />
                <span>
                  Destinos:{" "}
                  {rutaActiva.destinoIds
                    .map((id) => mapa[id]?.nombre)
                    .filter(Boolean)
                    .join(", ") || "—"}
                </span>
              </Atributo>
              <ListaPanel>
                <span>Transferencias</span>
                <ListaScroll>
                  {transferenciasDeRuta(rutaActiva.id).length === 0 ? (
                    <em>Sin transferencias en esta ruta</em>
                  ) : (
                    transferenciasDeRuta(rutaActiva.id).map((item) => (
                      <FilaPanel key={item.id}>
                        <RiFilePdfFill />
                        <div>
                          <strong>
                            {bodegas.find((bodega) => mismoId(bodega.id, item.origen_id))
                              ?.nombre ?? "—"}{" "}
                            →{" "}
                            {bodegas.find((bodega) => mismoId(bodega.id, item.sucursal_id))
                              ?.nombre ?? "—"}
                          </strong>
                          <a
                            href={urlArchivoTransferencia(item.transferencia)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Transferencia
                          </a>
                          <a
                            href={urlArchivoTransferencia(item.guia)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Guía
                          </a>
                          {puedeGestionarItemTransferencia(sesion, item, rutaActiva) &&
                            !esRutaTransitoria(rutaActiva) && (
                              <BtnEliminar
                                type="button"
                                $neutro
                                onClick={() => handleDevolverTransferencia(item)}
                              >
                                A transitorio
                              </BtnEliminar>
                            )}
                          {puedeGestionarItemTransferencia(sesion, item, rutaActiva) && (
                            <BtnEliminar
                              type="button"
                              onClick={() => handleEliminarTransferencia(item)}
                            >
                              Eliminar
                            </BtnEliminar>
                          )}
                        </div>
                      </FilaPanel>
                    ))
                  )}
                </ListaScroll>
              </ListaPanel>
            </>
          ) : bodegaActiva ? (
            <>
              <PanelDato>
                {esMatriz(bodegaActiva.tipo) ? "Matriz" : "Agencia"}
              </PanelDato>
              <NombreSucursal>
                {esMatriz(bodegaActiva.tipo) ? <RiBuildingFill /> : <RiStore2Fill />}
                <span>{bodegaActiva.nombre}</span>
              </NombreSucursal>
              {esMatriz(bodegaActiva.tipo) && (
                <ListaPanel>
                  <span>Ruta transitorio · pendientes</span>
                  <ListaScroll>
                    {transferenciasDeMatriz.length === 0 ? (
                      <em>Sin transferencias</em>
                    ) : (
                      transferenciasDeMatriz.map((item) => (
                        <FilaPanel key={item.id}>
                          <RiFilePdfFill />
                          <div>
                            <strong>
                              {bodegas.find((bodega) => mismoId(bodega.id, item.origen_id))
                                ?.nombre ?? "—"}{" "}
                              →{" "}
                              {bodegas.find((bodega) =>
                                mismoId(bodega.id, item.sucursal_id)
                              )?.nombre ?? "—"}
                            </strong>
                            <a
                              href={urlArchivoTransferencia(item.transferencia)}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Transferencia
                            </a>
                            <a
                              href={urlArchivoTransferencia(item.guia)}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Guía
                            </a>
                            {puedeGestionarItemTransferencia(
                              sesion,
                              item,
                              rutaTransitoriaActiva
                            ) && (
                              <BtnEliminar
                                type="button"
                                onClick={() => handleEliminarTransferencia(item)}
                              >
                                Eliminar
                              </BtnEliminar>
                            )}
                          </div>
                        </FilaPanel>
                      ))
                    )}
                  </ListaScroll>
                </ListaPanel>
              )}
            </>
          ) : (
            <PanelTitulo>Sucursal</PanelTitulo>
          )}
          <Nota>
            {bodegas.length} sucursales · {rutas.length} ruta(s) · {transferencias.length}{" "}
            transferencia(s). Usa Credencial para ingresar como matriz o agencia.
          </Nota>
        </Panel>
      </Cuerpo>

      {mostrarCredencial && (
        <LoginTransferencias
          sesion={sesion}
          onSesion={(siguiente) => {
            setSesion(siguiente);
            setMostrarCredencial(false);
            toast.success(`Sesión de ${siguiente.sucursal_nombre}.`);
          }}
          onSalir={() => {
            borrarSesionTransferencia();
            setSesion(null);
            setMostrarCredencial(false);
            toast.success("Sesión cerrada.");
          }}
          onClose={() => setMostrarCredencial(false)}
        />
      )}

      {mostrarAsignar &&
        matrizAsignar &&
        puedeGestionar &&
        mismoId(sesion?.sucursal_id, matrizAsignar.id) && (
        <AsignarTransferenciasModal
          matriz={matrizAsignar}
          pendientes={transferenciasDeRuta(transitoriaDe(matrizAsignar.id)?.id)}
          rutasEntreMatrices={rutasEntreMatricesDe(matrizAsignar.id)}
          nombresSucursal={Object.fromEntries(
            bodegas.map((item) => [item.id, item.nombre])
          )}
          puedeMover={puedeGestionar && mismoId(sesion?.sucursal_id, matrizAsignar.id)}
          guardando={guardandoAsignar}
          onConfirmar={handleMoverPendientes}
          onEliminar={handleEliminarTransferencia}
          onClose={() => {
            if (!guardandoAsignar) {
              setMostrarAsignar(false);
              setMatrizAsignar(null);
            }
          }}
        />
      )}

      {mostrarCargaModal && rutaCarga && (
        <CargarTransferenciaModal
          ruta={rutaCarga}
          transferencias={transferenciasDeRuta(rutaCarga.id)}
          sucursales={bodegas}
          sesion={sesion}
          puedeEditar={puedeEditarTransferencias}
          guardando={guardandoCarga}
          onConfirmar={handleGuardarTransferencia}
          onEliminar={handleEliminarTransferencia}
          onDevolver={handleDevolverTransferencia}
          onClose={() => {
            if (!guardandoCarga) {
              setMostrarCargaModal(false);
              setRutaCarga(null);
            }
          }}
        />
      )}

      {mostrarRutaModal && (
        <CrearRutaModal
          sucursales={bodegas}
          sesion={sesion}
          rutaInicial={rutaEdicion}
          guardando={guardandoRuta}
          onConfirmar={handleGuardarRuta}
          onClose={() => {
            if (!guardandoRuta) {
              setMostrarRutaModal(false);
              setRutaEdicion(null);
            }
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

const BtnCredencial = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: 1px solid ${({ $activo }) => ($activo ? "#1b5e20" : "#2e7d32")};
  background: ${({ $activo }) => ($activo ? "#1b5e20" : "#fff")};
  color: ${({ $activo }) => ($activo ? "#fff" : "#2e7d32")};
  border-radius: 8px;
  cursor: pointer;

  svg {
    width: 26px;
    height: 26px;
  }

  &:hover {
    background: #2e7d32;
    color: #fff;
  }
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

  &:hover:not(:disabled) {
    background: #e8f5e9;
    color: #1b5e20;
  }

  &:disabled {
    color: #888;
    cursor: default;
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

const Nodo = styled.div`
  position: absolute;
  left: ${({ $x }) => `${$x}%`};
  top: ${({ $y }) => `${$y}%`};
  transform: translate(-50%, -50%);
  width: ${({ $matriz }) => ($matriz ? "150px" : "96px")};
  border: ${({ $enfoque, $colorEnfoque }) =>
    $enfoque ? `2px solid ${$colorEnfoque}` : "none"};
  border-radius: 8px;
  padding: ${({ $matriz }) => ($matriz ? "26px 10px 12px" : "7px 4px 6px")};
  background: ${({ $colorNodo, $enfoque, $colorEnfoque }) =>
    $enfoque ? $colorEnfoque : $colorNodo};
  box-shadow: ${({ $activo, $enfoque, $colorEnfoque, $colorNodo }) =>
    $enfoque
      ? `0 0 0 4px ${$colorEnfoque}88, 0 8px 18px rgba(0, 0, 0, 0.28)`
      : $activo
        ? `0 0 0 3px ${$colorNodo}, 0 8px 18px rgba(0, 0, 0, 0.28)`
        : "0 6px 14px rgba(0, 0, 0, 0.22)"};
  cursor: grab;
  text-align: center;
  user-select: none;
  z-index: ${({ $matriz, $enfoque }) => ($enfoque ? 5 : $matriz ? 3 : 2)};
  color: #3e2723;

  &:active {
    cursor: grabbing;
  }
`;

const NodoRuta = styled.div`
  position: absolute;
  left: ${({ $x }) => `${$x}%`};
  top: ${({ $y }) => `${$y}%`};
  transform: translate(-50%, -50%);
  width: 176px;
  border: none;
  border-radius: 12px;
  padding: 26px 12px 10px;
  background: ${({ $color }) => $color};
  box-shadow: ${({ $activo, $color }) =>
    $activo
      ? `0 0 0 3px ${$color}, 0 8px 18px rgba(0, 0, 0, 0.22)`
      : "0 6px 14px rgba(0, 0, 0, 0.18)"};
  color: #3e2723;
  cursor: grab;
  text-align: center;
  z-index: 4;

  &:active {
    cursor: grabbing;
  }
`;

const BtnCamion = styled.button`
  position: absolute;
  top: 2px;
  left: 4px;
  border: none;
  background: transparent;
  color: #1b5e20;
  cursor: pointer;
  padding: 0;
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 28px;
    height: 28px;
  }

  &:hover {
    color: #0d3d14;
  }
`;

const BadgeCamion = styled.span`
  position: absolute;
  top: 0;
  right: 0;
  min-width: 14px;
  height: 14px;
  padding: 0 3px;
  border-radius: 999px;
  background: #1b5e20;
  color: #fff;
  font-size: 0.58rem;
  font-weight: 700;
  line-height: 14px;
`;

const AccionesNodo = styled.div`
  position: absolute;
  top: 0;
  right: 4px;
  display: flex;
  align-items: center;
  gap: 2px;
`;

const BtnNodo = styled.button`
  border: none;
  background: transparent;
  color: ${({ $peligro }) => ($peligro ? "#b71c1c" : "#1b5e20")};
  cursor: pointer;
  padding: 0;
  font-size: ${({ $peligro }) => ($peligro ? "1.35rem" : "1.05rem")};
  font-weight: 700;
  line-height: 1;
  width: 20px;
  height: 22px;

  &:hover {
    color: ${({ $peligro }) => ($peligro ? "#7f0000" : "#0d3d14")};
  }
`;

const NodoChofer = styled.strong`
  display: block;
  margin-top: 2px;
  color: #1b5e20;
  font-size: 0.72rem;
  line-height: 1.2;
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
  color: inherit;
  opacity: 0.78;
  font-weight: 700;
`;

const DestinosRuta = styled.strong`
  display: block;
  margin-top: 2px;
  color: #1b5e20;
  font-size: 0.62rem;
  line-height: 1.25;
  word-break: break-word;
`;

const NodoNombre = styled.strong`
  display: block;
  margin-top: 2px;
  color: inherit;
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

const NombreSucursal = styled.h2`
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.05rem;
  color: #3e2723;

  svg {
    flex: 0 0 auto;
    width: 22px;
    height: 22px;
    color: #6d4c41;
  }
`;

const Atributo = styled.p`
  margin: 0;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  color: #4e342e;
  font-size: 0.86rem;
  line-height: 1.35;

  svg {
    flex: 0 0 auto;
    margin-top: 1px;
    width: 16px;
    height: 16px;
    color: #6d4c41;
  }
`;

const ListaPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;
  min-height: 0;

  span {
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #8d6e63;
  }

  em {
    font-size: 0.8rem;
    color: #888;
    font-style: normal;
  }
`;

const ListaScroll = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 220px;
  overflow-y: auto;
  padding-right: 4px;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: #cbbba8;
    border-radius: 999px;
  }
`;

const FilaPanel = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;

  svg {
    margin-top: 2px;
    width: 16px;
    height: 16px;
    color: #2e7d32;
  }

  div {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 10px;
    font-size: 0.8rem;
  }

  strong {
    width: 100%;
    color: #3e2723;
    font-size: 0.78rem;
  }

  small {
    width: 100%;
    color: #666;
    font-size: 0.72rem;
  }

  a {
    color: #2e7d32;
    font-weight: 600;
  }
`;

const BtnEliminar = styled.button`
  border: none;
  background: transparent;
  padding: 0;
  color: ${({ $neutro }) => ($neutro ? "#1565c0" : "#c62828")};
  font-weight: 700;
  font-size: 0.76rem;
  cursor: pointer;
`;

const PanelDato = styled.p`
  margin: 0;
  color: #6d4c41;
  font-size: 0.84rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

const Nota = styled.p`
  margin: auto 0 0;
  font-size: 0.78rem;
  color: #888;
  line-height: 1.4;
`;
