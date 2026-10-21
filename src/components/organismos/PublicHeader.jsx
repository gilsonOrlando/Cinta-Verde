import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { NavLink } from "react-router-dom";
import { RiCloseLine, RiMenuLine } from "react-icons/ri";
import { NavLinksPublicos } from "../../utils/dataEstatica";

export function PublicHeader() {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuAbierto) return undefined;

    function handlePointerDown(event) {
      if (!menuRef.current?.contains(event.target)) setMenuAbierto(false);
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") setMenuAbierto(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuAbierto]);

  return (
    <HeaderBar>
      <Inner>
        <Logo to="/" aria-label="SICOB, Sistema de Control de Bodega">
          <LogoMark>SICOB</LogoMark>
          <BrandText>
            <strong>SICOB</strong>
            <span>Sistema de Control de Bodega</span>
          </BrandText>
        </Logo>

        <NavEscritorio>
          {NavLinksPublicos.map(({ label, to }) => (
            <NavItem key={to} to={to}>
              {label}
            </NavItem>
          ))}
        </NavEscritorio>

        <MenuMovil ref={menuRef}>
          <BtnMenu
            type="button"
            aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuAbierto}
            aria-haspopup="true"
            onClick={() => setMenuAbierto((abierto) => !abierto)}
          >
            {menuAbierto ? <RiCloseLine /> : <RiMenuLine />}
          </BtnMenu>
          {menuAbierto && (
            <MenuLista role="menu">
              {NavLinksPublicos.map(({ label, to }) => (
                <NavItem
                  key={to}
                  to={to}
                  role="menuitem"
                  onClick={() => setMenuAbierto(false)}
                >
                  {label}
                </NavItem>
              ))}
            </MenuLista>
          )}
        </MenuMovil>
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
  max-width: 1400px;
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
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
`;

const LogoMark = styled.div`
  min-width: 72px;
  height: 72px;
  padding: 0 10px;
  border-radius: 50%;
  background: #2e7d32;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  line-height: 1;
  text-transform: uppercase;
  box-shadow: 0 2px 8px rgba(46, 125, 50, 0.25);

  @media (max-width: 900px) {
    min-width: 56px;
    height: 56px;
    font-size: 0.68rem;
  }
`;

const BrandText = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;

  strong {
    color: #1b5e20;
    font-size: 1.15rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    line-height: 1.1;
  }

  span {
    color: #555;
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.01em;
    line-height: 1.25;
  }

  @media (max-width: 640px) {
    span {
      display: none;
    }
  }
`;

const NavEscritorio = styled.nav`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 22px;

  @media (max-width: 900px) {
    display: none;
  }
`;

const MenuMovil = styled.div`
  display: none;
  position: relative;

  @media (max-width: 900px) {
    display: block;
  }
`;

const BtnMenu = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: 1px solid #2e7d32;
  background: #2e7d32;
  color: #fff;
  border-radius: 8px;
  cursor: pointer;

  svg {
    width: 24px;
    height: 24px;
  }
`;

const MenuLista = styled.nav`
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 40;
  min-width: 240px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px;
  background: #fff;
  border: 1px solid #d8e8d8;
  border-radius: 12px;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.16);
`;

const NavItem = styled(NavLink)`
  text-decoration: none;
  font-size: 0.88rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #222;
  transition: color 0.2s ease, background 0.2s ease;

  ${MenuLista} & {
    padding: 12px 14px;
    border-radius: 8px;
  }

  &:hover {
    color: #e53935;
  }

  ${MenuLista} &:hover {
    background: #f5f5f5;
  }

  &.active {
    color: #e53935;
  }
`;
