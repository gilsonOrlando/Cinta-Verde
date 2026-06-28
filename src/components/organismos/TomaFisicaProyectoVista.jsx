import { useState } from "react";
import styled from "styled-components";
import toast from "react-hot-toast";
import { ClipLoader } from "react-spinners";
import { PreviewTomaFisicaModal } from "../modals/PreviewTomaFisicaModal";
import { descargarPdfTomaFisica } from "../../utils/generarPdfTomaFisica";
import { interpretarErrorSupabase } from "../../utils/interpretarErrorSupabase";
import { formatearDiferencia, formatearFechaProyecto } from "../../utils/tomaFisicaReporte";
import { calcularDiferenciaCantidades } from "../../utils/cantidadTexto";

export function TomaFisicaProyectoVista({ proyecto, productos, onNuevaConsulta }) {
  const [mostrarPreview, setMostrarPreview] = useState(false);

  const handleDescargar = async () => {
    if (!Array.isArray(productos) || productos.length === 0) {
      toast.error("No hay productos para incluir en el PDF.");
      return;
    }

    try {
      await descargarPdfTomaFisica({ proyecto, productos });
      toast.success("PDF descargado correctamente.");
    } catch (error) {
      console.error(error);
      if (error.message === "SIN_PRODUCTOS") {
        toast.error("No hay productos para incluir en el PDF.");
        return;
      }
      toast.error("No se pudo generar el PDF.");
    }
  };

  return (
    <Wrapper>
      <Encabezado>
        <Info>
          <h2>{proyecto.nombre}</h2>
          <Meta>
            <span>
              Código: <strong>{proyecto.codigo_acceso}</strong>
            </span>
            <span>
              Fecha: <strong>{formatearFechaProyecto(proyecto.created_at)}</strong>
            </span>
            {proyecto.nombre_archivo && (
              <span>
                Archivo: <strong>{proyecto.nombre_archivo}</strong>
              </span>
            )}
            <span>
              {productos.length === 1
                ? "1 producto"
                : `${productos.length} productos`}
            </span>
          </Meta>
        </Info>

        <Acciones>
          <BtnSecundario type="button" onClick={() => setMostrarPreview(true)}>
            Vista previa
          </BtnSecundario>
          <BtnPrimario type="button" onClick={handleDescargar}>
            Descargar PDF
          </BtnPrimario>
          {onNuevaConsulta && (
            <BtnSecundario type="button" onClick={onNuevaConsulta}>
              Nueva consulta
            </BtnSecundario>
          )}
        </Acciones>
      </Encabezado>

      {productos.length === 0 ? (
        <Empty>Este proyecto no tiene productos registrados.</Empty>
      ) : (
        <TablaWrapper>
          <Tabla>
            <thead>
              <tr>
                <th>#</th>
                <th>Código</th>
                <th>Producto</th>
                <th>Cantidad sistema</th>
                <th>Cantidad toma física</th>
                <th>Diferencia</th>
              </tr>
            </thead>
            <tbody>
              {productos.map((item, index) => {
                const diferenciaNumero = calcularDiferenciaCantidades(
                  item.cantidad_sistema,
                  item.cantidad_toma_fisica
                );

                return (
                  <tr key={item.id ?? `${item.codigo}-${index}`}>
                    <td>{index + 1}</td>
                    <td>{item.codigo}</td>
                    <td>{item.producto}</td>
                    <td>{item.cantidad_sistema}</td>
                    <td>{item.cantidad_toma_fisica}</td>
                    <DiferenciaCelda $valor={diferenciaNumero}>
                      {formatearDiferencia(item.cantidad_sistema, item.cantidad_toma_fisica)}
                    </DiferenciaCelda>
                  </tr>
                );
              })}
            </tbody>
          </Tabla>
        </TablaWrapper>
      )}

      {mostrarPreview && (
        <PreviewTomaFisicaModal
          proyecto={proyecto}
          productos={productos}
          onClose={() => setMostrarPreview(false)}
        />
      )}
    </Wrapper>
  );
}

export function TomaFisicaConsultaSection({ onConsultaExitosa }) {
  const [codigoAcceso, setCodigoAcceso] = useState("");
  const [consultando, setConsultando] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const codigo = codigoAcceso.trim();

    if (!codigo) {
      toast.error("Ingresa el código del proyecto.");
      return;
    }

    setConsultando(true);

    try {
      await onConsultaExitosa(codigo);
    } catch (error) {
      console.error(error);
      toast.error(interpretarErrorSupabase(error));
    } finally {
      setConsultando(false);
    }
  };

  return (
    <Section>
      <SectionHeader>
        <h2>Consultar toma física</h2>
        <p>Ingresa el código del proyecto para visualizar y descargar el reporte en PDF.</p>
      </SectionHeader>

      <Form onSubmit={handleSubmit}>
        <input
          type="text"
          value={codigoAcceso}
          onChange={(event) => setCodigoAcceso(event.target.value.toUpperCase())}
          placeholder="Código del proyecto"
          disabled={consultando}
          maxLength={12}
          autoComplete="off"
          spellCheck={false}
        />
        <BtnConsultar type="submit" disabled={consultando || !codigoAcceso.trim()}>
          {consultando ? (
            <>
              <ClipLoader size={16} color="#fff" />
              Consultando...
            </>
          ) : (
            "Consultar"
          )}
        </BtnConsultar>
      </Form>
    </Section>
  );
}

const Wrapper = styled.div`
  width: 100%;
  max-width: 1100px;
  text-align: left;
`;

const Encabezado = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
`;

const Info = styled.div`
  h2 {
    margin: 0 0 8px;
    font-size: 1.25rem;
    color: #222;
  }
`;

const Meta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px 18px;
  color: #666;
  font-size: 0.9rem;

  strong {
    color: #222;
  }
`;

const Acciones = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`;

const BtnBase = styled.button`
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
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

const BtnSecundario = styled(BtnBase)`
  border: 1px solid #ddd;
  background: #fff;
  color: #444;

  &:hover {
    border-color: #e53935;
    color: #e53935;
  }
`;

const TablaWrapper = styled.div`
  overflow-x: auto;
  border: 1px solid #ddd;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
`;

const Tabla = styled.table`
  width: 100%;
  border-collapse: collapse;
  background: #fff;
  min-width: 980px;

  th,
  td {
    padding: 14px 16px;
    text-align: left;
    border-bottom: 1px solid #eee;
    vertical-align: top;
  }

  th {
    background: #222;
    color: #fff;
    font-size: 0.82rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    white-space: nowrap;
  }

  td:first-child,
  th:first-child {
    width: 48px;
    text-align: center;
    color: #888;
    font-weight: 600;
  }

  td:nth-child(2) {
    font-weight: 700;
    color: #222;
    white-space: nowrap;
  }

  td:nth-child(4),
  td:nth-child(5),
  td:nth-child(6),
  th:nth-child(4),
  th:nth-child(5),
  th:nth-child(6) {
    text-align: center;
    white-space: nowrap;
    width: 130px;
  }

  tbody tr:nth-child(even) {
    background: #fafafa;
  }

  tbody tr:hover {
    background: #fff4f3;
  }

  tbody tr:last-child td {
    border-bottom: none;
  }
`;

const DiferenciaCelda = styled.td`
  font-weight: 700;
  color: ${({ $valor }) =>
    $valor > 0 ? "#2e7d32" : $valor < 0 ? "#c62828" : "#444"};
`;

const Empty = styled.p`
  text-align: center;
  color: #888;
  padding: 24px;
  border: 1px dashed #ddd;
  border-radius: 10px;
`;

const Section = styled.section`
  width: 100%;
  max-width: 1100px;
  margin-bottom: 28px;
  padding: 20px;
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  background: #fafafa;
`;

const SectionHeader = styled.div`
  margin-bottom: 14px;

  h2 {
    margin: 0 0 6px;
    font-size: 1.1rem;
    color: #222;
  }

  p {
    margin: 0;
    color: #666;
    font-size: 0.92rem;
    line-height: 1.45;
  }
`;

const Form = styled.form`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;

  input {
    flex: 1;
    min-width: 220px;
    padding: 11px 12px;
    border: 1px solid #ccc;
    border-radius: 8px;
    font-size: 0.95rem;
    font-family: "Consolas", "Courier New", monospace;
    letter-spacing: 0.06em;
    font-weight: 700;
    color: #222;

    &:focus {
      outline: none;
      border-color: #e53935;
      box-shadow: 0 0 0 2px rgba(229, 57, 53, 0.15);
    }

    &:disabled {
      background: #f5f5f5;
      cursor: not-allowed;
    }
  }
`;

const BtnConsultar = styled.button`
  border: 1px solid #222;
  background: #222;
  color: #fff;
  padding: 11px 18px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;

  &:hover:not(:disabled) {
    background: #111;
    border-color: #111;
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;
