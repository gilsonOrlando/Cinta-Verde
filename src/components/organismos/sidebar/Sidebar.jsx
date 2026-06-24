import styled from "styled-components";
import { NavLink } from "react-router-dom";
import { LinksArray, SecondarylinksArray } from "../../../utils/dataEstatica";
import { Device } from "../../../styles/breackpoints";

export function Sidebar({ state, setState }) {
  return (
    <Container $state={state}>
      <button type="button" className="toggle" onClick={setState}>
        {state ? "<<" : ">>"}
      </button>
      <nav>
        {LinksArray.map(({ label, icon, to }) => (
          <NavLink key={to} to={to} className={({ isActive }) => (isActive ? "active" : "")}>
            <span className="icon">{icon}</span>
            <span className="label">{label}</span>
          </NavLink>
        ))}
      </nav>
      <footer>
        {SecondarylinksArray.map(({ label, icon, to }) => (
          <NavLink key={to} to={to}>
            <span className="icon">{icon}</span>
            <span className="label">{label}</span>
          </NavLink>
        ))}
      </footer>
    </Container>
  );
}

const Container = styled.aside`
  background: ${({ theme }) => theme.bgcards};
  border-right: 1px solid ${({ theme }) => theme.bg4};
  min-height: 100vh;
  padding: 20px 12px;
  display: flex;
  flex-direction: column;
  gap: 20px;

  .toggle {
    border: none;
    background: ${({ theme }) => theme.primary};
    color: white;
    border-radius: 6px;
    padding: 6px;
    cursor: pointer;
  }

  nav,
  footer {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  a {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px;
    border-radius: 8px;
    color: ${({ theme }) => theme.text};
    text-decoration: none;

    &.active,
    &:hover {
      background: ${({ theme }) => theme.bg2};
    }
  }

  .label {
    display: ${({ $state }) => ($state ? "inline" : "none")};
  }

  @media ${Device.tablet} {
    .label {
      display: none;
    }
  }
`;
