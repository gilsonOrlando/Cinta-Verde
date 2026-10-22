import { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
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
  esDuenioDeRuta,
  esRutaTransitoria,
  listarRutas,
} from "../../supabase/crudRuta";
import {
  actualizarTransferencia,
  crearTransferencia,
  descargarGuiasDeMatriz,
  devolverTransferenciaATransitorio,
  eliminarTransferencia,
  guiasSubidasPorMatriz,
  completarNombresTransferencias,
  listarTransferencias,
  moverTransferenciasARuta,
  nombreDeGuia,
  nombreDeTransferencia,
  puedeEliminarItemTransferencia,
  puedeGestionarItemTransferencia,
  urlArchivoTransferencia,
} from "../../supabase/crudTransferencia";
import { interpretarErrorSupabase } from "../../utils/interpretarErrorSupabase";
import {
  borrarSesionTransferencia,
  esUsuarioMatriz,
  leerSesionTransferencia,
  puedeCrudTransferencias,
  puedeGestionarRutas,
} from "../../supabase/crudUsuariosTransferencias";
import { SUCURSALES_SEMILLA, ubicarSucursales } from "../../utils/sucursalesSemilla";
import { CrearRutaModal } from "../modals/CrearRutaModal";
import { CargarTransferenciaModal } from "../modals/CargarTransferenciaModal";
import { AsignarTransferenciasModal } from "../modals/AsignarTransferenciasModal";
import { BajarGuiasModal } from "../modals/BajarGuiasModal";
import { LoginTransferencias } from "./LoginTransferencias";
import {
  ICONO_VERIFICAR_TRANSFERENCIAS,
  VisorTransferenciasPanel,
} from "./VisorTransferenciasPanel";

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

function trazoCamino(desde, hasta) {
  const mx = (desde.x + hasta.x) / 2;
  const my = (desde.y + hasta.y) / 2;
  const dx = hasta.x - desde.x;
  const dy = hasta.y - desde.y;
  return `M ${desde.x} ${desde.y} Q ${mx - dy * 0.12} ${my + dx * 0.12} ${hasta.x} ${hasta.y}`;
}

function CaminoRuta({ d, color, activo }) {
  return (
    <g>
      <path
        d={d}
        fill="none"
        stroke="#fffaf2"
        strokeWidth={activo ? 1.18 : 0.96}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={d}
        fill="none"
        stroke="rgba(78, 52, 46, 0.2)"
        strokeWidth={activo ? 0.7 : 0.56}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={activo ? 0.34 : 0.24}
        strokeLinecap="round"
        strokeDasharray={activo ? "1.7 0.5" : "1.25 0.7"}
        strokeOpacity={activo ? 1 : 0.88}
      />
    </g>
  );
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

const TAMANO_NODO = {
  ruta: { w: 21, h: 16 },
  matriz: { w: 16, h: 13 },
  agencia: { w: 11, h: 8 },
};

function cajaDeNodo(item, clase) {
  const tamano =
    clase === "ruta"
      ? TAMANO_NODO.ruta
      : esMatriz(item?.tipo)
        ? TAMANO_NODO.matriz
        : TAMANO_NODO.agencia;
  return { x: Number(item.x), y: Number(item.y), ...tamano };
}

function nodosSeSolapan(a, b, holgura = 2.4) {
  return (
    Math.abs(a.x - b.x) < (a.w + b.w) / 2 + holgura &&
    Math.abs(a.y - b.y) < (a.h + b.h) / 2 + holgura
  );
}

function posicionLibreRuta({ sucursales = [], rutas = [], origenId } = {}) {
  const ocupados = [
    ...sucursales
      .filter((item) => Number.isFinite(item.x) && Number.isFinite(item.y))
      .map((item) => cajaDeNodo(item, "sucursal")),
    ...rutas
      .filter(
        (item) =>
          !esRutaTransitoria(item) &&
          Number.isFinite(item.x) &&
          Number.isFinite(item.y)
      )
      .map((item) => cajaDeNodo(item, "ruta")),
  ];

  const origen = sucursales.find((item) => String(item.id) === String(origenId));
  const preferida = {
    x: Math.min(78, Math.max(38, (origen?.x ?? 56) - 16)),
    y: Math.min(80, Math.max(28, (origen?.y ?? 18) + 24)),
  };

  let mejor = preferida;
  let mejorPuntaje = Number.POSITIVE_INFINITY;

  for (let y = 24; y <= 88; y += 4) {
    for (let x = 34; x <= 88; x += 4) {
      const caja = { x, y, ...TAMANO_NODO.ruta };
      const choca = ocupados.some((otro) => nodosSeSolapan(caja, otro));
      const dx = x - preferida.x;
      const dy = y - preferida.y;
      const puntaje = dx * dx + dy * dy + (choca ? 12000 : 0);
      if (puntaje < mejorPuntaje) {
        mejorPuntaje = puntaje;
        mejor = { x, y };
      }
    }
  }

  return mejor;
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
  const [editarTransferenciaId, setEditarTransferenciaId] = useState(null);
  const [guardandoCarga, setGuardandoCarga] = useState(false);
  const [sesion, setSesion] = useState(() => leerSesionTransferencia());
  const [mostrarCredencial, setMostrarCredencial] = useState(false);
  const [mostrarAsignar, setMostrarAsignar] = useState(false);
  const [matrizAsignar, setMatrizAsignar] = useState(null);
  const [guardandoAsignar, setGuardandoAsignar] = useState(false);
  const [mostrarVisor, setMostrarVisor] = useState(false);
  const [visorTransferenciaId, setVisorTransferenciaId] = useState(null);
  const [mostrarBajarGuias, setMostrarBajarGuias] = useState(false);
  const [rutaBajarId, setRutaBajarId] = useState(null);
  const [descargandoGuias, setDescargandoGuias] = useState(false);
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
          const rutasConPosicion = [];
          for (const ruta of rutasDb) {
            if (esRutaTransitoria(ruta)) {
              rutasConPosicion.push(ruta);
              continue;
            }
            rutasConPosicion.push({
              ...ruta,
              ...posicionLibreRuta({
                sucursales: ubicadas,
                rutas: rutasConPosicion,
                origenId: ruta.origen_id,
              }),
            });
          }
          setRutas(rutasConPosicion);
          try {
            const cargadas = await listarTransferencias();
            if (activo) setTransferencias(cargadas);
            const conNombres = await completarNombresTransferencias(cargadas);
            if (activo) setTransferencias(conNombres);
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
            ...posicionLibreRuta({
              sucursales: bodegas,
              rutas: prev,
              origenId: ruta.origen_id,
            }),
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
    if (!esDuenioDeRuta(sesion, ruta)) {
      toast.error("Solo puedes editar las rutas que creó tu matriz.");
      return;
    }
    setRutaEdicion(ruta);
    setMostrarRutaModal(true);
  };

  const handleEliminarRuta = async (ruta, event) => {
    event.stopPropagation();
    event.preventDefault();
    if (!esDuenioDeRuta(sesion, ruta)) {
      toast.error("Solo puedes eliminar las rutas que creó tu matriz.");
      return;
    }
    const guiasPropias = guiasSubidasPorMatriz(transferencias, {
      rutaId: ruta.id,
      matrizId: sesion?.sucursal_id,
    });
    const resultado = await Swal.fire({
      title: "Descarga las guías antes de eliminar",
      html: `La ruta de <strong>${ruta.chofer}</strong> se eliminará y las transferencias pasarán a la ruta transitorio.<br/><br/>Antes debes descargar las <strong>guías</strong> de las transferencias que subió tu matriz; sirven como evidencia.${
        guiasPropias.length
          ? `<br/><br/>Hay <strong>${guiasPropias.length}</strong> guía(s) de tu matriz en esta ruta.`
          : "<br/><br/>En esta ruta no hay guías subidas por tu matriz."
      }`,
      icon: "warning",
      showCancelButton: true,
      showDenyButton: guiasPropias.length > 0,
      confirmButtonText: "Ya descargué, eliminar",
      denyButtonText: "Bajar guías",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#c62828",
      denyButtonColor: "#2e7d32",
    });

    if (resultado.isDenied) {
      setRutaBajarId(ruta.id);
      setMostrarBajarGuias(true);
      return;
    }
    if (!resultado.isConfirmed) return;

    try {
      const transitoria = await eliminarRuta(ruta.id, {
        sucursalId: sesion?.sucursal_id,
      });
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
      toast.success("Transferencias pasadas a la ruta.");
    } catch (error) {
      console.error(error);
      toast.error(interpretarErrorSupabase(error));
    } finally {
      setGuardandoAsignar(false);
    }
  };

  const grupoGuiasDeRuta = (ruta) => {
    const items = guiasSubidasPorMatriz(transferencias, {
      rutaId: ruta.id,
      matrizId: sesion?.sucursal_id,
    }).map((item) => ({
      ...item,
      etiqueta: `${nombreDeGuia(item) || "guia"}-${nombreDeTransferencia(item)}-${
        bodegas.find((bodega) => String(bodega.id) === String(item.origen_id))?.nombre ??
        "origen"
      }-${
        bodegas.find((bodega) => String(bodega.id) === String(item.sucursal_id))?.nombre ??
        "destino"
      }`,
    }));
    return {
      ...ruta,
      destinos: nombresAgencias(ruta),
      guias: items,
      items,
      nombre: `${ruta.chofer} ${String(ruta.fecha ?? "").slice(0, 10)}`,
    };
  };

  const handleDescargarGuiasRuta = async (ruta) => {
    setDescargandoGuias(true);
    try {
      const grupo = grupoGuiasDeRuta(ruta);
      await descargarGuiasDeMatriz({
        grupos: [grupo],
        nombreZip: `guias-${grupo.nombre}`,
      });
      toast.success("Guías descargadas.");
    } catch (error) {
      console.error(error);
      toast.error(interpretarErrorSupabase(error));
    } finally {
      setDescargandoGuias(false);
    }
  };

  const handleDescargarTodasGuias = async (rutasLista) => {
    setDescargandoGuias(true);
    try {
      await descargarGuiasDeMatriz({
        grupos: rutasLista.map((ruta) => grupoGuiasDeRuta(ruta)),
        nombreZip: `guias-${sesion?.sucursal_nombre ?? "matriz"}`,
      });
      toast.success("Guías descargadas.");
    } catch (error) {
      console.error(error);
      toast.error(interpretarErrorSupabase(error));
    } finally {
      setDescargandoGuias(false);
    }
  };

  const handleAbrirCarga = (ruta, event) => {
    event.stopPropagation();
    event.preventDefault();
    setSeleccion(ruta.id);
    setRutaCarga(ruta);
    setEditarTransferenciaId(null);
    setMostrarCargaModal(true);
  };

  const handleAbrirEdicion = (ruta, item) => {
    if (!ruta?.id || !item?.id) return;
    setRutaCarga(ruta);
    setEditarTransferenciaId(item.id);
    setMostrarCargaModal(true);
  };

  const handleAbrirVisor = (item = null) => {
    setVisorTransferenciaId(item?.id ?? null);
    setMostrarVisor(true);
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
      setEditarTransferenciaId(null);
    } catch (error) {
      console.error(error);
      toast.error(interpretarErrorSupabase(error));
    } finally {
      setGuardandoCarga(false);
    }
  };

  const handleEliminarTransferencia = async (item) => {
    const origen = bodegas.find((s) => mismoId(s.id, item.origen_id))?.nombre ?? "origen";
    const destino = bodegas.find((s) => mismoId(s.id, item.sucursal_id))?.nombre ?? "destino";
    const resultado = await Swal.fire({
      title: "¿Eliminar esta transferencia?",
      html: `Se borrarán el PDF de <strong>${nombreDeTransferencia(item)}</strong> (${origen} → ${destino}) y su guía.<br/><br/>Esta acción no se puede deshacer.`,
      icon: "warning",
      showCancelButton: true,
      focusCancel: true,
      reverseButtons: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#c62828",
      cancelButtonColor: "#757575",
    });
    if (!resultado.isConfirmed) return;
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
    const origen = bodegas.find((s) => mismoId(s.id, item.origen_id))?.nombre ?? "origen";
    const destino = bodegas.find((s) => mismoId(s.id, item.sucursal_id))?.nombre ?? "destino";
    const resultado = await Swal.fire({
      title: "¿Enviar a transitorio?",
      html: `La transferencia <strong>${nombreDeTransferencia(item)}</strong> (${origen} → ${destino}) saldrá de esta ruta y quedará pendiente en la ruta transitorio de la matriz.`,
      icon: "question",
      showCancelButton: true,
      focusCancel: true,
      reverseButtons: true,
      confirmButtonText: "Enviar a transitorio",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#2e7d32",
      cancelButtonColor: "#757575",
    });
    if (!resultado.isConfirmed) return;
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
  const rutasDeMatriz = (matrizId) =>
    rutasVisibles.filter((ruta) => mismoId(ruta.origen_id, matrizId));
  const transitoriaDe = (matrizId) =>
    rutas.find(
      (item) => esRutaTransitoria(item) && mismoId(item.origen_id, matrizId)
    );

  return (
    <Layout>
      <Cabecera>
        <div>
          <Kicker>Mapa de rutas</Kicker>
          <Titulo>Transferencias entre bodegas</Titulo>
          <Subtitulo>
            {cargando
              ? "Cargando sucursales…"
              : "Las líneas son el recorrido del camión. Cada matriz tiene un color propio y las agencias usan crema."}
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
                  <>
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
                    <MenuItem
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuGestionAbierto(false);
                        setRutaBajarId(null);
                        setMostrarBajarGuias(true);
                      }}
                    >
                      Bajar guías
                    </MenuItem>
                  </>
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
                const matricesDestino = (ruta.destinoIds ?? [])
                  .map((id) => mapa[id])
                  .filter(
                    (item) => item && esMatriz(item.tipo) && String(item.id) !== String(origen.id)
                  );

                return (
                  <g key={ruta.id}>
                    <CaminoRuta
                      d={trazoCamino(origen, ruta)}
                      color={color}
                      activo={activo}
                    />
                    {matricesDestino.map((destino) => (
                      <CaminoRuta
                        key={`${ruta.id}-${destino.id}`}
                        d={trazoCamino(destino, ruta)}
                        color={color}
                        activo={activo}
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
                {puedeGestionar && esDuenioDeRuta(sesion, ruta) && (
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
              <BtnVerificar
                type="button"
                title="Verificar transferencias"
                aria-label="Verificar transferencias"
                onClick={() => handleAbrirVisor()}
              >
                <img src={ICONO_VERIFICAR_TRANSFERENCIAS} alt="" />
                {transferenciasDeRuta(rutaActiva.id).length > 0 && (
                  <BadgeVerificar>{transferenciasDeRuta(rutaActiva.id).length}</BadgeVerificar>
                )}
              </BtnVerificar>
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
                          <strong>{nombreDeTransferencia(item)}</strong>
                          {nombreDeGuia(item) && <small>{nombreDeGuia(item)}</small>}
                          <em>
                            {bodegas.find((bodega) => mismoId(bodega.id, item.origen_id))
                              ?.nombre ?? "—"}{" "}
                            →{" "}
                            {bodegas.find((bodega) => mismoId(bodega.id, item.sucursal_id))
                              ?.nombre ?? "—"}
                          </em>
                          <a
                            href={urlArchivoTransferencia(item.transferencia)}
                            onClick={(event) => {
                              event.preventDefault();
                              handleAbrirVisor(item);
                            }}
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
                              <BtnLista
                                type="button"
                                onClick={() => handleDevolverTransferencia(item)}
                              >
                                A transitorio
                              </BtnLista>
                            )}
                          {puedeEliminarItemTransferencia(sesion, item, rutaActiva) && (
                            <BtnLista
                              type="button"
                              $peligro
                              onClick={() => handleEliminarTransferencia(item)}
                            >
                              Eliminar
                            </BtnLista>
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
                <BtnVerificar
                  type="button"
                  title="Verificar transferencias pendientes"
                  aria-label="Verificar transferencias pendientes"
                  onClick={() => handleAbrirVisor()}
                >
                  <img src={ICONO_VERIFICAR_TRANSFERENCIAS} alt="" />
                  {transferenciasDeMatriz.length > 0 && (
                    <BadgeVerificar>{transferenciasDeMatriz.length}</BadgeVerificar>
                  )}
                </BtnVerificar>
              )}
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
                            <strong>{nombreDeTransferencia(item)}</strong>
                            {nombreDeGuia(item) && <small>{nombreDeGuia(item)}</small>}
                            <em>
                              {bodegas.find((bodega) => mismoId(bodega.id, item.origen_id))
                                ?.nombre ?? "—"}{" "}
                              →{" "}
                              {bodegas.find((bodega) =>
                                mismoId(bodega.id, item.sucursal_id)
                              )?.nombre ?? "—"}
                            </em>
                            <a
                              href={urlArchivoTransferencia(item.transferencia)}
                              onClick={(event) => {
                                event.preventDefault();
                                handleAbrirVisor(item);
                              }}
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
                            {(esUsuarioMatriz(sesion) &&
                              mismoId(sesion?.sucursal_id, bodegaActiva.id)) ||
                            puedeEliminarItemTransferencia(
                              sesion,
                              item,
                              rutaTransitoriaActiva
                            ) ? (
                              <BtnLista
                                type="button"
                                $peligro
                                onClick={() => handleEliminarTransferencia(item)}
                              >
                                Eliminar
                              </BtnLista>
                            ) : null}
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
          rutasDestino={rutasDeMatriz(matrizAsignar.id)}
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

      {mostrarVisor && (rutaActiva || (bodegaActiva && esMatriz(bodegaActiva.tipo))) && (
        <VisorTransferenciasPanel
          titulo={
            rutaActiva ? "Verificar transferencias" : "Ruta transitorio · pendientes"
          }
          transferencias={
            rutaActiva ? transferenciasDeRuta(rutaActiva.id) : transferenciasDeMatriz
          }
          transferenciaInicialId={visorTransferenciaId}
          ruta={rutaActiva ?? rutaTransitoriaActiva}
          sucursales={bodegas}
          sesion={sesion}
          puedeEditar={puedeEditarTransferencias}
          onEditar={(item) =>
            handleAbrirEdicion(rutaActiva ?? rutaTransitoriaActiva, item)
          }
          onEliminar={handleEliminarTransferencia}
          onDevolver={handleDevolverTransferencia}
          onClose={() => {
            setMostrarVisor(false);
            setVisorTransferenciaId(null);
          }}
        />
      )}

      {mostrarBajarGuias && puedeGestionar && (
        <BajarGuiasModal
          matrizNombre={sesion?.sucursal_nombre}
          rutas={rutasDeMatriz(sesion?.sucursal_id).map((ruta) => grupoGuiasDeRuta(ruta))}
          rutaResaltadaId={rutaBajarId}
          descargando={descargandoGuias}
          onDescargarRuta={handleDescargarGuiasRuta}
          onDescargarTodas={() =>
            handleDescargarTodasGuias(rutasDeMatriz(sesion?.sucursal_id))
          }
          onClose={() => {
            if (!descargandoGuias) {
              setMostrarBajarGuias(false);
              setRutaBajarId(null);
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
          transferenciaEdicionId={editarTransferenciaId}
          puedeEditar={puedeEditarTransferencias}
          guardando={guardandoCarga}
          onConfirmar={handleGuardarTransferencia}
          onEliminar={handleEliminarTransferencia}
          onDevolver={handleDevolverTransferencia}
          onClose={() => {
            if (!guardandoCarga) {
              setMostrarCargaModal(false);
              setRutaCarga(null);
              setEditarTransferenciaId(null);
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
  border: 10px solid #c9b08a;
  border-radius: 16px;
  box-shadow:
    inset 0 0 0 4px #efe3c8,
    0 16px 36px rgba(62, 39, 35, 0.12);
  overflow: hidden;
  min-height: 640px;
`;

const Tablero = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 640px;
  background:
    radial-gradient(ellipse at 18% 14%, rgba(232, 245, 233, 0.85), transparent 42%),
    radial-gradient(ellipse at 82% 78%, rgba(255, 236, 204, 0.55), transparent 40%),
    repeating-linear-gradient(
      90deg,
      transparent,
      transparent 46px,
      rgba(121, 85, 72, 0.05) 47px
    ),
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 46px,
      rgba(121, 85, 72, 0.045) 47px
    ),
    #e7eadc;
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
    $enfoque ? `2px solid ${$colorEnfoque}` : "1px solid rgba(255, 255, 255, 0.55)"};
  border-radius: ${({ $matriz }) => ($matriz ? "18px" : "14px")};
  padding: ${({ $matriz }) => ($matriz ? "26px 10px 12px" : "7px 4px 6px")};
  background: ${({ $colorNodo, $enfoque, $colorEnfoque }) =>
    $enfoque
      ? $colorEnfoque
      : `color-mix(in srgb, ${$colorNodo} 82%, #fffaf3)`};
  box-shadow: ${({ $activo, $enfoque, $colorEnfoque, $colorNodo }) =>
    $enfoque
      ? `0 0 0 4px ${$colorEnfoque}66, 0 10px 20px rgba(62, 39, 35, 0.16)`
      : $activo
        ? `0 0 0 3px ${$colorNodo}, 0 10px 20px rgba(62, 39, 35, 0.16)`
        : "0 8px 16px rgba(62, 39, 35, 0.12)"};
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
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 20px;
  padding: 26px 12px 10px;
  background: ${({ $color }) => `color-mix(in srgb, ${$color} 74%, #fffaf3)`};
  box-shadow: ${({ $activo, $color }) =>
    $activo
      ? `0 0 0 3px ${$color}, 0 10px 20px rgba(62, 39, 35, 0.14)`
      : "0 8px 16px rgba(62, 39, 35, 0.1)"};
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
  min-height: 0;
  overflow-y: auto;
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

const BtnVerificar = styled.button`
  position: relative;
  align-self: center;
  margin-top: 8px;
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;

  img {
    display: block;
    width: 88px;
    height: 88px;
    object-fit: contain;
  }

  &:hover img {
    transform: scale(1.04);
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
    color: #1565c0;
    font-size: 0.72rem;
    font-weight: 700;
  }

  em {
    width: 100%;
    font-style: normal;
    color: #6d5c50;
    font-size: 0.72rem;
  }

  a {
    color: #2e7d32;
    font-weight: 600;
  }
`;

const BtnLista = styled.button`
  border: none;
  background: transparent;
  padding: 0;
  color: ${({ $peligro }) => ($peligro ? "#c62828" : "#1565c0")};
  font-weight: 700;
  font-size: 0.76rem;
  cursor: pointer;
`;

const BadgeVerificar = styled.span`
  position: absolute;
  top: 0;
  right: 0;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  border-radius: 999px;
  background: #1b5e20;
  color: #fff;
  font-size: 0.7rem;
  font-weight: 700;
  line-height: 20px;
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
