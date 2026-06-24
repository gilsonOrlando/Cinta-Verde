import styled from "styled-components";
import { NavLink } from "react-router-dom";
import { NavLinksPublicos } from "../../utils/dataEstatica";

export function PublicHeader() {
  return (
    <HeaderBar>
      <Inner>
        <Logo to="/">
          <LogoMark>
            <span>Cinta</span>
            <span>Verde</span>
          </LogoMark>
        </Logo>

        <Nav>
          {NavLinksPublicos.map(({ label, to }) => (
            <NavItem key={to} to={to}>
              {label}
            </NavItem>
          ))}
        </Nav>
      </Inner>
    </HeaderBar>
  );
}

const HeaderBar = styled.header`
  width: 100%;
  background-color: #ececec;
  background-image: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 3px,
    rgba(0, 0, 0, 0.04) 3px,
    rgba(0, 0, 0, 0.04) 4px
  );
  border-bottom: 1px solid #d8d8d8;
`;

const Inner = styled.div`
  max-width: 1100px;
  margin: 0 auto;
  padding: 18px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
`;

const Logo = styled(NavLink)`
  text-decoration: none;
  flex-shrink: 0;
`;

const LogoMark = styled.div`
  min-width: 72px;
  height: 72px;
  padding: 0 14px;
  border-radius: 50%;
  background: #2e7d32;
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  line-height: 1.15;
  text-transform: uppercase;
  box-shadow: 0 2px 8px rgba(46, 125, 50, 0.25);
`;

const Nav = styled.nav`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 28px;
`;

const NavItem = styled(NavLink)`
  text-decoration: none;
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #222;
  transition: color 0.2s ease;

  &:hover {
    color: #e53935;
  }

  &.active {
    color: #e53935;
  }
`;
