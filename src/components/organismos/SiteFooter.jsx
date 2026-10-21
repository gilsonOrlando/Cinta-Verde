import { useLocation } from "react-router-dom";
import styled from "styled-components";
import { RiDownloadLine, RiQrScan2Line, RiTruckFill } from "react-icons/ri";
import cintaVerdeApk from "../../app/appCintaVerde.apk?url";
import revisorApk from "../../app/Revisor de transferencias.apk?url";

export function SiteFooter() {
  const { pathname } = useLocation();
  const esTransferencias = pathname.startsWith("/transferencias-bodegas");

  return (
    <Footer>
      <Inner>
        {esTransferencias ? (
          <CintaVerdeCard>
            <CintaVerdeHeader>
              <IconWrap aria-hidden="true">
                <RiTruckFill />
              </IconWrap>
              <div>
                <CintaVerdeTitulo>Revisor de transferencias</CintaVerdeTitulo>
                <CintaVerdeSubtitulo>
                  App móvil para verificar transferencias entre bodegas
                </CintaVerdeSubtitulo>
              </div>
            </CintaVerdeHeader>

            <CintaVerdeTexto>
              Descarga e instala <strong>Revisor de transferencias</strong> en tu celular para
              consultar y verificar las transferencias de la pizarra.
            </CintaVerdeTexto>

            <BtnDescarga href={revisorApk} download="Revisor de transferencias.apk">
              <RiDownloadLine />
              Descargar Revisor de transferencias (APK)
            </BtnDescarga>
          </CintaVerdeCard>
        ) : (
          <CintaVerdeCard>
            <CintaVerdeHeader>
              <IconWrap aria-hidden="true">
                <RiQrScan2Line />
              </IconWrap>
              <div>
                <CintaVerdeTitulo>CintaVerde</CintaVerdeTitulo>
                <CintaVerdeSubtitulo>App móvil para escaneo de toma física</CintaVerdeSubtitulo>
              </div>
            </CintaVerdeHeader>

            <CintaVerdeTexto>
              Descarga e instala <strong>CintaVerde</strong> en tu celular para conectarte a un
              proyecto con su código de acceso, escanear códigos de producto y registrar la
              cantidad física comparándola con la cantidad del sistema.
            </CintaVerdeTexto>

            <BtnDescarga href={cintaVerdeApk} download="appCintaVerde.apk">
              <RiDownloadLine />
              Descargar CintaVerde (APK)
            </BtnDescarga>
          </CintaVerdeCard>
        )}

        <Creditos>
          <p>
            Desarrollado por <strong>Ing. Gilson Quezada</strong>, Bodega de Catamayo.
          </p>
          <p>
            Solución orientada al control de inventarios, toma física y trazabilidad de productos
            en operaciones de bodega.
          </p>
        </Creditos>
      </Inner>
    </Footer>
  );
}

const Footer = styled.footer`
  width: 100%;
  margin-top: auto;
  background: #f3f3f3;
  border-top: 1px solid #ddd;
`;

const Inner = styled.div`
  max-width: 1100px;
  margin: 0 auto;
  padding: 28px 24px 32px;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const CintaVerdeCard = styled.section`
  background: #fff;
  border: 1px solid #d8e8d8;
  border-left: 4px solid #2e7d32;
  border-radius: 12px;
  padding: 18px 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
`;

const CintaVerdeHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 12px;
`;

const IconWrap = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: #e8f5e9;
  color: #2e7d32;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.6rem;
  flex-shrink: 0;
`;

const CintaVerdeTitulo = styled.h3`
  margin: 0;
  font-size: 1.15rem;
  color: #1b5e20;
`;

const CintaVerdeSubtitulo = styled.p`
  margin: 2px 0 0;
  font-size: 0.86rem;
  color: #558b2f;
`;

const CintaVerdeTexto = styled.p`
  margin: 0 0 14px;
  color: #444;
  font-size: 0.92rem;
  line-height: 1.55;

  strong {
    color: #2e7d32;
  }
`;

const BtnDescarga = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 8px;
  border: 1px solid #2e7d32;
  background: #2e7d32;
  color: #fff;
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 600;
  transition: background 0.2s ease, border-color 0.2s ease;

  &:hover {
    background: #1b5e20;
    border-color: #1b5e20;
  }
`;

const Creditos = styled.div`
  text-align: center;
  color: #666;
  font-size: 0.86rem;
  line-height: 1.55;

  p {
    margin: 0;
  }

  p + p {
    margin-top: 6px;
  }

  strong {
    color: #222;
  }
`;
