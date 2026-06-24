import { useRef, useState } from "react";
import styled from "styled-components";
import toast from "react-hot-toast";
import { CargandoTransferencia } from "../moleculas/CargandoTransferencia";
import { TomaFisicaResultado } from "../organismos/TomaFisicaResultado";
import {
  TomaFisicaConsultaSection,
  TomaFisicaProyectoVista,
} from "../organismos/TomaFisicaProyectoVista";
import { ObtenerTomaFisicaPorCodigo } from "../../supabase/crudProyectos";
import { supabaseConfigurado } from "../../supabase/supabase.config";
import { interpretarErrorSupabase } from "../../utils/interpretarErrorSupabase";
import { procesarTomaFisicaExcel } from "../../utils/parseTomaFisicaExcel";

const ACCEPTED =
  ".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export function TomaFisicaTemplate() {
  const inputRef = useRef(null);
  const [estado, setEstado] = useState("idle");
  const [archivo, setArchivo] = useState(null);
  const [tomaFisica, setTomaFisica] = useState(null);
  const [proyectoConsultado, setProyectoConsultado] = useState(null);

  const handleConsulta = async (codigoAcceso) => {
    if (!supabaseConfigurado) {
      toast.error(interpretarErrorSupabase());
      return;
    }

    const resultado = await ObtenerTomaFisicaPorCodigo(codigoAcceso);

    if (!resultado) {
      toast.error("No se encontró un proyecto con ese código.");
      return;
    }

    setProyectoConsultado(resultado);
    toast.success(`Proyecto "${resultado.proyecto.nombre}" cargado.`);
  };

  const handleNuevaConsulta = () => {
    setProyectoConsultado(null);
  };

  const handleProyectoGuardado = () => {
    setEstado("idle");
    setArchivo(null);
    setTomaFisica(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleFile = async (file) => {
    if (!file) return;

    const nombre = file.name.toLowerCase();
    const esExcel = nombre.endsWith(".xls") || nombre.endsWith(".xlsx");

    if (!esExcel) {
      toast.error("Solo se permiten archivos Excel (.xls, .xlsx)");
      return;
    }

    setArchivo(file);
    setTomaFisica(null);
    setProyectoConsultado(null);
    setEstado("cargando");

    try {
      const data = await procesarTomaFisicaExcel(file);
      setTomaFisica(data);

      if (data.productos.length === 0) {
        setEstado("listo");
        toast.error(
          "No se detectaron productos. El Excel debe tener 4 columnas en este orden: Código, Producto, Cantidad Sistema, Cantidad Toma Física (fila 1 = encabezado)."
        );
      } else {
        setEstado("listo");
        toast.success(`Toma física cargada: ${data.productos.length} producto(s)`);
      }
    } catch (error) {
      console.error(error);
      setEstado("error");
      toast.error("No se pudo leer el archivo. Verifica el formato.");
    }
  };

  const mostrarDropZone = estado === "idle" || estado === "error";
  const mostrarCargaExcel = estado !== "cargando";

  return (
    <Page>
      {mostrarCargaExcel && (
        <TomaFisicaConsultaSection onConsultaExitosa={handleConsulta} />
      )}

      {proyectoConsultado && mostrarCargaExcel && (
        <ResultadoConsulta>
          <TomaFisicaProyectoVista
            proyecto={proyectoConsultado.proyecto}
            productos={proyectoConsultado.productos}
            onNuevaConsulta={handleNuevaConsulta}
          />
        </ResultadoConsulta>
      )}

      {mostrarCargaExcel && <Separador />}

      {mostrarDropZone && (
        <UploadSection>
          <h1>Cargar toma física</h1>
          

          <DropZone
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFile(e.dataTransfer.files?.[0]);
            }}
          >
            <strong>Arrastra aquí tu archivo Excel</strong>
            <span>o haz clic para seleccionar</span>
            <small>Formato: XLS, XLSX</small>
          </DropZone>

          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED}
            hidden
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </UploadSection>
      )}

      {estado === "cargando" && <CargandoTransferencia />}

      {estado === "listo" && tomaFisica && (
        <>
          <TomaFisicaResultado
            data={tomaFisica}
            nombreArchivo={archivo?.name}
            onProyectoGuardado={handleProyectoGuardado}
          />
          <CambiarArchivo type="button" onClick={() => inputRef.current?.click()}>
            Cargar otro archivo
          </CambiarArchivo>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED}
            hidden
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </>
      )}
    </Page>
  );
}

const Page = styled.section`
  color: #222;
  width: 100%;
  max-width: 1100px;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const ResultadoConsulta = styled.div`
  width: 100%;
  margin-bottom: 24px;
`;

const Separador = styled.hr`
  width: 100%;
  border: none;
  border-top: 1px solid #e8e8e8;
  margin: 0 0 28px;
`;

const UploadSection = styled.div`
  width: 100%;
  max-width: 520px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;

  h1 {
    margin-bottom: 8px;
    font-size: 1.35rem;
  }

  p {
    color: #666;
    margin-bottom: 24px;
    line-height: 1.5;
  }
`;

const DropZone = styled.button`
  width: 100%;
  padding: 48px 24px;
  border: 2px dashed #ccc;
  border-radius: 12px;
  background: #fafafa;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #444;

  strong {
    font-size: 1.1rem;
  }

  span,
  small {
    color: #888;
  }

  &:hover {
    border-color: #e53935;
    background: #fff;
  }
`;

const CambiarArchivo = styled.button`
  margin-top: 20px;
  border: 1px solid #ddd;
  background: #fff;
  color: #444;
  padding: 10px 18px;
  border-radius: 8px;
  cursor: pointer;

  &:hover {
    border-color: #e53935;
    color: #e53935;
  }
`;
