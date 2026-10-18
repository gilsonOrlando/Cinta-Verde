import styled from "styled-components";
import { PublicHeader } from "../components/organismos/PublicHeader";
import { SiteFooter } from "../components/organismos/SiteFooter";

export function PublicLayout({ children, wide = false }) {
  return (
    <Wrapper>
      <PublicHeader />
      <Main $wide={wide}>{children}</Main>
      <SiteFooter />
    </Wrapper>
  );
}

const Wrapper = styled.div`
  min-height: 100vh;
  background: #fff;
  display: flex;
  flex-direction: column;
`;

const Main = styled.main`
  flex: 1;
  max-width: ${({ $wide }) => ($wide ? "1400px" : "1100px")};
  width: 100%;
  margin: 0 auto;
  padding: ${({ $wide }) => ($wide ? "20px 20px 36px" : "40px 24px 48px")};
  display: flex;
  align-items: ${({ $wide }) => ($wide ? "stretch" : "center")};
  justify-content: center;
`;
