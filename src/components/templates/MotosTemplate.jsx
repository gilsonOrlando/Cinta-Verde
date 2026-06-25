import { useRef, useState } from "react";
import styled from "styled-components";
import toast from "react-hot-toast";
import { CargandoTransferencia } from "../moleculas/CargandoTransferencia";
import { TransferenciaResultado } from "../organismos/TransferenciaResultado";
import { procesarTransferenciaPdf } from "../../utils/parseTransferenciaPdf";
import { filtrarProductosMotos } from "../../utils/filtrarProductosMotos";

const ACCEPTED = ".pdf,application/pdf";

export function MotosTemplate() {
  const inputRef = useRef(null);
  const [estado, setEstado] = useState("idle");
  const [archivo, setArchivo] = useState(null);
  const [datos, setDatos] = useState(null);

  const handleFile = async (file) => {
    if (!file) return;

    const nombre = file.name.toLowerCase();
    if (!nombre.endsWith(".pdf")) {
      toast.error("Solo se permiten archivos PDF");
      return;
    }

    setArchivo(file);
    setDatos(null);
    setEstado("cargando");

    try {
      const { extractTextFromPdf } = await import("../../utils/extractPdfText");
      const data = await procesarTransferenciaPdf(file, extractTextFromPdf);
      const productosMotos = filtrarProductosMotos(data.productos);
      const datosFiltrados = { ...data, productos: productosMotos };

      setDatos(datosFiltrados);

      const omitidos = data.productos.length - productosMotos.length;

      if (productosMotos.length === 0) {
        setEstado("listo");
        toast.error(
          omitidos > 0
            ? "No hay motos en el PDF. Solo se incluyen productos cuya primera palabra menciona MOTO."
            : "No se detectaron productos. Revisa el formato del PDF."
        );
      } else {
        setEstado("listo");
        toast.success(`${productosMotos.length} moto(s) encontrada(s)`);
        if (omitidos > 0) {
          toast(`${omitidos} producto(s) omitido(s) por no mencionar MOTO en la primera palabra.`, {
            icon: "ℹ️",
          });
        }
      }
    } catch (error) {
      console.error(error);
      setEstado("error");
      toast.error("No se pudo leer el PDF. Verifica el formato.");
    }
  };

  const mostrarDropZone = estado === "idle" || estado === "error";

  return (
    <Page>
      {mostrarDropZone && (
        <UploadSection>
          <h1>Motos</h1>
          <p>
            Carga un PDF para generar etiquetas medianas. Solo se listan productos cuya
            primera palabra mencione <strong>MOTO</strong> (ej. MOTO, MOTOS, MOTOCICLETA).
          </p>

          <DropZone
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFile(e.dataTransfer.files?.[0]);
            }}
          >
            <strong>Arrastra aquí tu archivo PDF</strong>
            <span>o haz clic para seleccionar</span>
            <small>Formato: PDF</small>
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

      {estado === "listo" && datos && (
        <>
          <TransferenciaResultado
            data={datos}
            nombreArchivo={archivo?.name}
            soloEtiquetaMediana
            soloProductosMoto
            tituloTabla="Motos"
          />
          <CambiarArchivo type="button" onClick={() => inputRef.current?.click()}>
            Cargar otro PDF
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
