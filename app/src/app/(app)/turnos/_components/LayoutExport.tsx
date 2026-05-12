import type { ReactNode } from "react";

const ESTILO_EXPORT = `
  @media print {
    @page { margin: 1.2cm; size: A4 landscape; }
    body { background: white !important; }
    .no-print { display: none !important; }
  }
  .export-root {
    background: #ebe3d3;
    color: #1a1410;
    font-family: var(--font-plex), system-ui, sans-serif;
    padding: 24px;
    min-height: 100vh;
  }
  .export-card {
    background: #f5efe1;
    border: 1px solid #c6a878;
    padding: 28px 32px;
    border-radius: 4px;
  }
  .export-eyebrow {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 1.4px;
    color: #5e7040;
  }
  .export-title {
    font-family: var(--font-bricolage), serif;
    font-size: 28px;
    margin: 4px 0 0;
    letter-spacing: -0.01em;
  }
  .export-subtitle {
    font-size: 14px;
    color: #5b4a36;
    margin-top: 4px;
  }
  .export-table {
    border-collapse: collapse;
    width: 100%;
    margin-top: 16px;
    font-size: 12px;
  }
  .export-table th, .export-table td {
    border: 1px solid #b89968;
    padding: 6px 8px;
    text-align: left;
    vertical-align: top;
  }
  .export-table th {
    background: #c68a3a;
    color: #fdf8ec;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    font-size: 10.5px;
  }
  .export-table tbody tr:nth-child(odd) { background: #f0e8d4; }
  .export-table tbody tr:nth-child(even) { background: #f5efe1; }
  .export-vacante {
    background: #f3dada !important;
    color: #5c1a17;
    font-weight: 600;
    font-style: italic;
  }
  .export-mono { font-family: var(--font-mono), "JetBrains Mono", monospace; }
  .export-resumen {
    margin-top: 20px;
    padding: 12px 16px;
    background: #f5efe1;
    border-left: 3px solid #5c1a17;
    font-size: 12px;
  }
  .export-resumen.ok { border-left-color: #5e7040; }
  .export-footer {
    margin-top: 24px;
    font-size: 10px;
    color: #7a6750;
    display: flex;
    justify-content: space-between;
  }

  /* Vista global expandida: turnos por celda. */
  .global-td { min-width: 140px; }
  .global-td-vacio { color: #7a6750; text-align: center; padding-top: 16px; }
  .global-turno { padding: 4px 0; }
  .global-turno + .global-turno { border-top: 1px dashed #c6a878; margin-top: 4px; padding-top: 6px; }
  .global-turno-head {
    display: flex; align-items: center; gap: 6px;
    font-size: 11px; font-weight: 600;
  }
  .global-turno-dot {
    width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
  }
  .global-turno-dot.ok { background: #5e7040; }
  .global-turno-dot.warn { background: #c68a3a; }
  .global-turno-dot.none { background: #b8a78a; }
  .global-turno-hora { font-family: var(--font-mono), monospace; font-variant-numeric: tabular-nums; }
  .global-turno-badges {
    display: flex; flex-wrap: wrap; gap: 3px; margin-top: 3px;
  }
  .global-turno-badge {
    display: inline-flex; align-items: center; gap: 3px;
    padding: 1px 5px; border-radius: 3px;
    font-size: 10px; font-weight: 600;
    border: 1px solid;
  }
  .global-turno-badge .sin-cubrir { color: #5c1a17; font-weight: 700; }
  .global-turno-nombres {
    margin-top: 3px;
    font-size: 10.5px; line-height: 1.35;
    color: #5b4a36; font-style: normal; font-weight: 400;
  }
  .global-resumen-vacantes {
    display: inline-block; margin-top: 4px;
    padding: 1px 6px; border-radius: 2px;
    background: #5c1a17; color: #fdf8ec;
    font-size: 10px; font-weight: 600; font-style: normal;
  }

  @media print {
    .export-table tr { page-break-inside: avoid; }
    .glass, .backdrop-blur-md { background: white !important; box-shadow: none !important; backdrop-filter: none !important; }
  }

  /* Banda superior de KPIs en variante "papel" (impresión). */
  .banda-resumen-papel {
    margin: 14px 0 18px;
    padding: 12px 16px;
    background: #f0e8d4;
    border: 1px solid #c6a878;
    border-radius: 4px;
  }
  .banda-resumen-papel-row {
    display: flex; gap: 28px; flex-wrap: wrap;
  }
  .banda-resumen-papel-kpi {
    display: flex; flex-direction: column; line-height: 1.1;
  }
  .banda-resumen-papel-kpi.alerta .banda-resumen-papel-value { color: #5c1a17; }
  .banda-resumen-papel-kpi.ok .banda-resumen-papel-value { color: #5e7040; }
  .banda-resumen-papel-label {
    font-size: 9.5px; text-transform: uppercase; letter-spacing: 1.1px;
    color: #5b4a36;
  }
  .banda-resumen-papel-value {
    font-family: var(--font-bricolage), serif;
    font-size: 22px; font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
  .banda-resumen-papel-detalle {
    margin-top: 8px;
    font-size: 11px;
    color: #5b4a36;
  }

  /* Cabecera de día como fila completa que abarca toda la tabla. */
  .export-table tr.dia-header td {
    background: #c68a3a; color: #fdf8ec;
    font-weight: 600; padding: 6px 10px;
    border-color: #b89968;
  }
  .dia-header-row {
    display: flex; justify-content: space-between; align-items: baseline; gap: 12px;
  }
  .dia-header-resumen {
    font-size: 11px; font-weight: 500; opacity: 0.9;
    font-variant-numeric: tabular-nums;
  }

  /* Día sin turnos (placeholder compacto en exportar/semana). */
  .export-table tr.dia-sin-turnos td {
    background: #f5efe1; color: #7a6750; font-style: italic;
    text-align: center; font-size: 11px; padding: 4px 8px;
  }

  /* Caseta colapsada en /exportar/semana-global cuando no tiene turnos. */
  .export-table tr.caseta-vacia td {
    background: #f5efe1; color: #7a6750; font-style: italic;
    padding: 4px 12px; font-size: 11px;
  }

  /* Bloque de asignados agrupados por rol dentro de una celda. */
  .grupo-rol {
    margin: 0; padding: 0; line-height: 1.45;
  }
  .grupo-rol + .grupo-rol { margin-top: 4px; }
  .grupo-rol-titulo {
    font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.6px;
    color: #5b4a36; font-weight: 600;
  }
  .grupo-rol-nombres {
    font-size: 11.5px; color: #1a1410;
  }
  .grupo-rol-vol .grupo-rol-titulo { color: #5e7040; }

  /* Vacantes inline al final de la celda Asignados. */
  .vacantes-inline {
    display: inline-block; margin-top: 4px;
    padding: 1px 6px; border-radius: 2px;
    background: #f3dada; color: #5c1a17;
    font-size: 10.5px; font-weight: 600;
    border-left: 3px solid #5c1a17;
  }
  .vacantes-inline.cubierto {
    background: transparent; color: #5e7040;
    border-left-color: #5e7040; font-weight: 500;
  }

  /* Franja horaria izquierda en exportar/dia. */
  .franja-cell { position: relative; padding-left: 14px !important; }
  .franja-cell::before {
    content: ""; position: absolute; left: 0; top: 0; bottom: 0;
    width: 4px; background: #b8a78a;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .franja-cell.franja-manana::before { background: #c68a3a; }
  .franja-cell.franja-tarde::before { background: #5e7040; }
  .franja-cell.franja-noche::before { background: #5c1a17; }

  .leyenda-franjas {
    display: inline-flex; gap: 12px; align-items: center;
    font-size: 10px; color: #7a6750;
  }
  .leyenda-franja-chip {
    display: inline-flex; align-items: center; gap: 4px;
  }
  .leyenda-franja-chip::before {
    content: ""; display: inline-block; width: 10px; height: 10px; border-radius: 2px;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .leyenda-franja-chip.manana::before { background: #c68a3a; }
  .leyenda-franja-chip.tarde::before { background: #5e7040; }
  .leyenda-franja-chip.noche::before { background: #5c1a17; }
`;

export function LayoutExport({
  eyebrow,
  title,
  subtitle,
  exportId,
  children,
  toolbar,
  footer,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  exportId: string;
  children: ReactNode;
  toolbar?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="export-root">
      <style>{ESTILO_EXPORT}</style>
      {toolbar ? <div className="no-print mb-4 flex items-center gap-2">{toolbar}</div> : null}
      <div id={exportId} className="export-card">
        <header>
          <div className="export-eyebrow">{eyebrow}</div>
          <h1 className="export-title">{title}</h1>
          {subtitle ? <div className="export-subtitle">{subtitle}</div> : null}
        </header>
        {children}
        {footer ? <div className="export-footer">{footer}</div> : null}
      </div>
    </div>
  );
}
