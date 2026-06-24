import styled from "styled-components";
import { PublicHeader } from "../components/organismos/PublicHeader";
import { SiteFooter } from "../components/organismos/SiteFooter";

export function PublicLayout({ children }) {
  return (
    <Wrapper>
      <PublicHeader />
      <Main>{children}</Main>
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
  max-width: 1100px;
  width: 100%;
  margin: 0 auto;
  padding: 40px 24px 48px;
  display: flex;
  align-items: center;
  justify-content: center;
`;
