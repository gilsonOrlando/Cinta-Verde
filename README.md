# Cinta Verde

Sistema web para gestión de inventarios, carga de transferencias, impresión de etiquetas y toma física.

## Funcionalidades

- **Inicio:** carga de transferencias (PDF/Excel) e impresión de etiquetas
- **Toma física:** carga de Excel, creación de proyectos con código de acceso, consulta y descarga en PDF
- **App móvil CintaVerde:** escaneo de códigos para contabilizar cantidades físicas (APK en `src/app/`)

## Requisitos

- Node.js 18+
- Proyecto en [Supabase](https://supabase.com)

## Instalación

```bash
npm install
```

Copia `.env.example` a `.env.local` y configura las variables de Supabase:

```bash
cp .env.example .env.local
```

Crear tablas en Supabase:

```bash
npm run setup:supabase
```

## Desarrollo

```bash
npm run dev
```

## Scripts útiles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run setup:supabase` | Crear/actualizar tablas en Supabase |
| `npm run test:supabase` | Verificar conexión con Supabase |

## Desarrollador

**Ing. Gilson Quezada** — Bodega de Catamayo
