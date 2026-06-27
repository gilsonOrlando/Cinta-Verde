import { useRef, useState } from "react";
import styled from "styled-components";
import toast from "react-hot-toast";
import { CargandoTransferencia } from "../moleculas/CargandoTransferencia";
import { TransferenciaResultado } from "../organismos/TransferenciaResultado";
import { procesarTransferenciaPdf } from "../../utils/parseTransferenciaPdf";
import { procesarTransferenciaExcel } from "../../utils/parseTransferenciaExcel";

const ACCEPTED =
  ".pdf,.xls,.xlsx,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const TRANSFERENCIA_VACIA = {
  numero: null,
  bodegaOrigen: null,
  bodegaDestino: null,
  productos: [],
};

export function CargarTemplate() {
  const inputRef = useRef(null);
  const [estado, setEstado] = useState("idle");
  const [archivo, setArchivo] = useState(null);
  const [transferencia, setTransferencia] = useState(null);

  const handleFile = async (file) => {
    if (!file) return;

    const nombre = file.name.toLowerCase();
    const esPdf = nombre.endsWith(".pdf");
    const esExcel = nombre.endsWith(".xls") || nombre.endsWith(".xlsx");

    if (!esPdf && !esExcel) {
      toast.error("Solo se permiten archivos PDF o Excel");
      return;
    }

    setArchivo(file);
    setTransferencia(null);

    setEstado("cargando");

    try {
      let data;

      if (esPdf) {
        const { extractTextFromPdf } = await import("../../utils/extractPdfText");
        data = await procesarTransferenciaPdf(file, extractTextFromPdf);
      } else {
        data = await procesarTransferenciaExcel(file);
      }

      setTransferencia(data);

      if (data.productos.length === 0) {
        setEstado("listo");
        toast.error("No se detectaron productos. Revisa el formato del archivo.");
      } else {
        setEstado("listo");
        toast.success(`Transferencia procesada: ${data.productos.length} producto(s)`);
      }
    } catch (error) {
      console.error(error);
      setEstado("error");
      toast.error("No se pudo leer el archivo. Verifica el formato.");
    }
  };

  const mostrarDropZone = estado === "idle" || estado === "error";

  const iniciarModoSoloCodigo = () => {
    setArchivo(null);
    setTransferencia(TRANSFERENCIA_VACIA);
    setEstado("listo");
  };

  return (
    <Page>
      {mostrarDropZone && (
        <UploadSection>
          <h1>Cargar archivo</h1>
          <p>Selecciona un archivo PDF o Excel de transferencia bodega.</p>

          <DropZone
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFile(e.dataTransfer.files?.[0]);
            }}
          >
            <strong>Arrastra aquí tu archivo PDF o Excel</strong>
            <span>o haz clic para seleccionar</span>
            <small>Formato: PDF, XLS, XLSX</small>
          </DropZone>

          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED}
            hidden
            onChange={(e) => handleFile(e.target.files?.[0])}
          />

          <SoloCodigo type="button" onClick={iniciarModoSoloCodigo}>
            Buscar producto guardado e imprimir
          </SoloCodigo>
        </UploadSection>
      )}

      {estado === "cargando" && <CargandoTransferencia />}

      {estado === "listo" && transferencia && (
        <>
          <TransferenciaResultado
            data={transferencia}
            nombreArchivo={archivo?.name}
          />
          <AccionesInferiores>
            <CambiarArchivo type="button" onClick={() => inputRef.current?.click()}>
              Cargar otro archivo
            </CambiarArchivo>
            {!archivo && (
              <CambiarArchivo type="button" onClick={() => setEstado("idle")}>
                Volver al inicio
              </CambiarArchivo>
            )}
          </AccionesInferiores>
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
  max-width: 900px;
  display: flex;
  flex-direction: column;
  align-items: center;
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
  }

  p {
    color: #666;
    margin-bottom: 24px;
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

const AccionesInferiores = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  margin-top: 20px;
`;

const SoloCodigo = styled.button`
  margin-top: 16px;
  border: none;
  background: transparent;
  color: #e53935;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 3px;

  &:hover {
    color: #c62828;
  }
`;
