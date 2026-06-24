import styled from "styled-components";
import { useState } from "react";
import { Sidebar } from "../components/organismos/sidebar/Sidebar";
import { MenuHambur } from "../components/organismos/MenuHambur";
import { Device } from "../styles/breackpoints";

export function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <Container className={sidebarOpen ? "active" : ""}>
      <div className="ContentSidebar">
        <Sidebar
          state={sidebarOpen}
          setState={() => setSidebarOpen(!sidebarOpen)}
        />
      </div>
      <div className="ContentMenuambur">
        <MenuHambur />
      </div>
      <Containerbody>{children}</Containerbody>
    </Container>
  );
}

const Container = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  background: ${({ theme }) => theme.bgtotal};
  min-height: 100vh;

  .ContentSidebar {
    display: none;
  }

  .ContentMenuambur {
    display: block;
    position: absolute;
    left: 20px;
    top: 20px;
    z-index: 10;
  }

  @media ${Device.tablet} {
    grid-template-columns: 65px 1fr;

    &.active {
      grid-template-columns: 220px 1fr;
    }

    .ContentSidebar {
      display: initial;
    }

    .ContentMenuambur {
      display: none;
    }
  }
`;

const Containerbody = styled.main`
  grid-column: 1;
  width: 100%;
  padding: 20px;

  @media ${Device.tablet} {
    grid-column: 2;
  }
`;
