window.CC = window.CC || {};

(function () {
  // Minimal inline-SVG sparkline. No chart library — just a polyline
  // scaled to fit, with an optional target line.
  function renderSparkline(values, opts) {
    opts = opts || {};
    const width = opts.width || 320;
    const height = opts.height || 80;
    const pad = 8;
    if (!values || values.length === 0) {
      return `<svg class="sparkline" width="${width}" height="${height}"></svg>`;
    }
    const min = Math.min(...values, opts.target ?? values[0]);
    const max = Math.max(...values, opts.target ?? values[0]);
    const range = max - min || 1;
    const stepX = (width - pad * 2) / Math.max(1, values.length - 1);

    const toY = (v) => height - pad - ((v - min) / range) * (height - pad * 2);
    const points = values.map((v, i) => `${pad + i * stepX},${toY(v).toFixed(1)}`).join(" ");

    let targetLine = "";
    if (opts.target !== undefined) {
      const y = toY(opts.target).toFixed(1);
      targetLine = `<line x1="${pad}" y1="${y}" x2="${width - pad}" y2="${y}" stroke="var(--color-danger)" stroke-width="1" stroke-dasharray="4 3" />`;
    }

    const lastX = pad + (values.length - 1) * stepX;
    const lastY = toY(values[values.length - 1]).toFixed(1);

    return `
      <svg class="sparkline" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        ${targetLine}
        <polyline points="${points}" fill="none" stroke="var(--color-accent)" stroke-width="2" />
        <circle cx="${lastX}" cy="${lastY}" r="3" fill="var(--color-accent)" />
      </svg>`;
  }

  window.CC.renderSparkline = renderSparkline;
})();
