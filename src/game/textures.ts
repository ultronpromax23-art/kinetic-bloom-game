import * as THREE from "three";

function canvas(size = 512) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  return c;
}

function grain(g: CanvasRenderingContext2D, size: number, amount: number, alpha: number) {
  for (let i = 0; i < amount; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = Math.random() * 3 + 0.5;
    g.fillStyle = `rgba(0,0,0,${Math.random() * alpha})`;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
}

export function concreteTexture(repeat = 16) {
  const size = 512;
  const c = canvas(size);
  const g = c.getContext("2d")!;
  g.fillStyle = "#6f6a60";
  g.fillRect(0, 0, size, size);
  // stained patches
  for (let i = 0; i < 60; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 20 + Math.random() * 90;
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    const tint = Math.random() > 0.5 ? "120,108,92" : "88,84,78";
    grd.addColorStop(0, `rgba(${tint},0.22)`);
    grd.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grd;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // slab seams
  g.strokeStyle = "rgba(40,36,32,0.5)";
  g.lineWidth = 3;
  for (let i = 0; i <= 4; i++) {
    const p = (i / 4) * size;
    g.beginPath();
    g.moveTo(p, 0);
    g.lineTo(p, size);
    g.moveTo(0, p);
    g.lineTo(size, p);
    g.stroke();
  }
  grain(g, size, 2600, 0.18);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = 8;
  return tex;
}

export function panelTexture(base = "#7a6d5c", accent = "#93683f", repeat = 2) {
  const size = 512;
  const c = canvas(size);
  const g = c.getContext("2d")!;
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);
  g.strokeStyle = "rgba(30,26,22,0.55)";
  g.lineWidth = 6;
  g.strokeRect(12, 12, size - 24, size - 24);
  g.fillStyle = accent;
  g.globalAlpha = 0.5;
  g.fillRect(0, size * 0.62, size, size * 0.06);
  g.globalAlpha = 1;
  // rivets
  g.fillStyle = "rgba(35,30,26,0.7)";
  for (let x = 40; x < size; x += 96) {
    for (const y of [40, size - 40]) {
      g.beginPath();
      g.arc(x, y, 6, 0, Math.PI * 2);
      g.fill();
    }
  }
  // rust streaks
  for (let i = 0; i < 26; i++) {
    const x = Math.random() * size;
    const w = 4 + Math.random() * 16;
    const h = 60 + Math.random() * 220;
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, "rgba(120,66,32,0.35)");
    grd.addColorStop(1, "rgba(120,66,32,0)");
    g.fillStyle = grd;
    g.fillRect(x, Math.random() * size * 0.6, w, h);
  }
  grain(g, size, 1400, 0.2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = 8;
  return tex;
}

export function asphaltTexture(repeat = 8) {
  const size = 512;
  const c = canvas(size);
  const g = c.getContext("2d")!;
  g.fillStyle = "#33342f";
  g.fillRect(0, 0, size, size);
  for (let i = 0; i < 90; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 15 + Math.random() * 70;
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, Math.random() > 0.5 ? "rgba(70,72,66,0.25)" : "rgba(18,18,16,0.3)");
    grd.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grd;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // cracks
  g.strokeStyle = "rgba(12,12,10,0.55)";
  g.lineWidth = 2;
  for (let i = 0; i < 14; i++) {
    g.beginPath();
    let x = Math.random() * size;
    let y = Math.random() * size;
    g.moveTo(x, y);
    for (let s = 0; s < 6; s++) {
      x += (Math.random() - 0.5) * 90;
      y += (Math.random() - 0.5) * 90;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  grain(g, size, 3200, 0.22);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = 8;
  return tex;
}

export function groundTexture(repeat = 14) {
  const size = 512;
  const c = canvas(size);
  const g = c.getContext("2d")!;
  g.fillStyle = "#2f3a28";
  g.fillRect(0, 0, size, size);
  for (let i = 0; i < 400; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    g.strokeStyle = `rgba(${60 + Math.random() * 50},${80 + Math.random() * 60},${45},0.45)`;
    g.lineWidth = 1 + Math.random();
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + (Math.random() - 0.5) * 10, y - 6 - Math.random() * 10);
    g.stroke();
  }
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 10 + Math.random() * 50;
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, "rgba(52,44,30,0.35)");
    grd.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grd;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  grain(g, size, 2200, 0.25);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = 8;
  return tex;
}

export function facadeTexture(base = "#6a6157", seedLit = 0.22) {
  const size = 512;
  const c = canvas(size);
  const g = c.getContext("2d")!;
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);
  // masonry banding
  g.fillStyle = "rgba(0,0,0,0.12)";
  for (let y = 0; y < size; y += 128) g.fillRect(0, y, size, 6);
  const cols = 4;
  const rows = 4;
  const w = 58;
  const h = 76;
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const x = 40 + col * ((size - 80) / (cols - 1)) - w / 2;
      const y = 34 + r * ((size - 80) / (rows - 1)) - h / 2;
      const lit = Math.random() < seedLit;
      g.fillStyle = lit ? "#e8bb72" : "#1b1f24";
      g.fillRect(x, y, w, h);
      g.fillStyle = "rgba(0,0,0,0.35)";
      g.fillRect(x - 4, y - 4, w + 8, 5);
      g.strokeStyle = "rgba(210,205,195,0.35)";
      g.lineWidth = 3;
      g.strokeRect(x, y, w, h);
      g.beginPath();
      g.moveTo(x + w / 2, y);
      g.lineTo(x + w / 2, y + h);
      g.stroke();
    }
  }
  // grime streaks
  for (let i = 0; i < 30; i++) {
    const x = Math.random() * size;
    const hh = 80 + Math.random() * 260;
    const grd = g.createLinearGradient(0, 0, 0, hh);
    grd.addColorStop(0, "rgba(20,18,16,0.35)");
    grd.addColorStop(1, "rgba(20,18,16,0)");
    g.fillStyle = grd;
    g.fillRect(x, Math.random() * size * 0.6, 3 + Math.random() * 12, hh);
  }
  grain(g, size, 1800, 0.2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

export function barkTexture() {
  const size = 256;
  const c = canvas(size);
  const g = c.getContext("2d")!;
  g.fillStyle = "#4a3a2c";
  g.fillRect(0, 0, size, size);
  for (let i = 0; i < 120; i++) {
    g.strokeStyle = `rgba(${20 + Math.random() * 40},${16 + Math.random() * 30},12,0.5)`;
    g.lineWidth = 1 + Math.random() * 3;
    const x = Math.random() * size;
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x + (Math.random() - 0.5) * 20, size);
    g.stroke();
  }
  grain(g, size, 900, 0.25);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}
