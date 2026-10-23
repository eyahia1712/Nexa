// Draws open-chevron arrows between elements after layout.
// spec: [fromId, fromSide, toId, toSide, label, opts]  side: l r t b, optional "@0.3" fraction along the edge
if (new URLSearchParams(location.search).get("theme") === "dark") document.body.classList.add("dark");
function pt(el, side) {
  const r = el.getBoundingClientRect();
  const [s, f] = side.split("@");
  const k = f === undefined ? 0.5 : Number(f);
  const x = window.scrollX, y = window.scrollY;
  if (s === "l") return [r.left + x, r.top + y + r.height * k];
  if (s === "r") return [r.right + x, r.top + y + r.height * k];
  if (s === "t") return [r.left + x + r.width * k, r.top + y];
  return [r.left + x + r.width * k, r.bottom + y];
}
window.drawArrows = (specs) => {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "arrows");
  svg.setAttribute("width", document.body.scrollWidth);
  svg.setAttribute("height", document.body.scrollHeight);
  let out = "";
  for (const [a, as, b, bs, label, o = {}] of specs) {
    const [x1, y1] = pt(document.getElementById(a), as);
    const [x2, y2] = pt(document.getElementById(b), bs);
    const gap = 8;
    const ang = Math.atan2(y2 - y1, x2 - x1);
    const ex = x2 - Math.cos(ang) * gap, ey = y2 - Math.sin(ang) * gap;
    const sx = x1 + Math.cos(ang) * gap, sy = y1 + Math.sin(ang) * gap;
    const dash = o.dash ? 'stroke-dasharray="10 8"' : "";
    out += `<line x1="${sx}" y1="${sy}" x2="${ex}" y2="${ey}" ${dash}/>`;
    const h = 16;
    for (const d of [0.45, -0.45]) out += `<line x1="${ex}" y1="${ey}" x2="${ex - Math.cos(ang + d) * h}" y2="${ey - Math.sin(ang + d) * h}"/>`;
    if (o.both) for (const d of [0.45, -0.45]) out += `<line x1="${sx}" y1="${sy}" x2="${sx + Math.cos(ang + d) * h}" y2="${sy + Math.sin(ang + d) * h}"/>`;
    if (label) {
      const mx = (sx + ex) / 2 + (o.dx || 0), my = (sy + ey) / 2 + (o.dy ?? -10);
      out += `<text class="lbl" x="${mx}" y="${my}" text-anchor="middle">${label}</text>`;
    }
  }
  svg.innerHTML = out;
  document.body.appendChild(svg);
};
