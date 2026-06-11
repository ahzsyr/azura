import { createCanvas } from "../kernel/canvas-host";
import type { BackgroundEffectDefinition } from "../types";

export const circuitEffect: BackgroundEffectDefinition = {
  id: "circuit",
  tier: "heavy",
  mount(ctx) {
    const isSection = ctx.scope.kind === "section";
    const attr = isSection ? "data-section-bg-effect" : "data-bg-effect";
    const canvas = createCanvas("circuit", ctx.scope, attr);
    ctx.applyLayerOpacity(canvas);
    const context = canvas.getContext("2d")!;
    const GRID = isSection ? 32 : 40;
    const speedMul = Math.max(ctx.config.speed, 0.25);

    interface Node {
      x: number;
      y: number;
      connections: number[];
    }

    const nodes: Node[] = [];
    const cols2 = Math.floor(canvas.width / GRID) + 1;
    const rows = Math.floor(canvas.height / GRID) + 1;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols2; c++) {
        if (Math.random() > 0.65) {
          nodes.push({ x: c * GRID, y: r * GRID, connections: [] });
        }
      }
    }
    nodes.forEach((n, i) => {
      nodes.forEach((m, j) => {
        if (
          i !== j &&
          Math.abs(n.x - m.x) <= GRID &&
          Math.abs(n.y - m.y) <= GRID &&
          Math.random() > 0.5
        ) {
          n.connections.push(j);
        }
      });
    });

    const pulses: Array<{ nodeIdx: number; progress: number; connIdx: number }> = [];
    if (nodes.length > 0) {
      const pulseCount = isSection ? 5 : 8;
      for (let i = 0; i < pulseCount; i++) {
        const ni = Math.floor(Math.random() * nodes.length);
        if (nodes[ni].connections.length > 0) {
          pulses.push({ nodeIdx: ni, progress: Math.random(), connIdx: 0 });
        }
      }
    }

    const draw = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      nodes.forEach((n) => {
        n.connections.forEach((ci) => {
          const m = nodes[ci];
          if (!m) return;
          context.beginPath();
          if (Math.random() > 0.5) {
            context.moveTo(n.x, n.y);
            context.lineTo(m.x, n.y);
            context.lineTo(m.x, m.y);
          } else {
            context.moveTo(n.x, n.y);
            context.lineTo(n.x, m.y);
            context.lineTo(m.x, m.y);
          }
          context.strokeStyle = ctx.getColor(0.094);
          context.lineWidth = 1;
          context.stroke();
        });
      });
      nodes.forEach((n) => {
        context.beginPath();
        context.arc(n.x, n.y, 2, 0, Math.PI * 2);
        context.fillStyle = ctx.getColor(0.25);
        context.fill();
      });
      pulses.forEach((p) => {
        const n = nodes[p.nodeIdx];
        if (!n || n.connections[p.connIdx] === undefined) return;
        const m = nodes[n.connections[p.connIdx]];
        if (!m) return;
        p.progress = (p.progress + 0.012 * speedMul) % 1;
        const px = n.x + (m.x - n.x) * p.progress;
        const py = n.y + (m.y - n.y) * p.progress;
        context.beginPath();
        context.arc(px, py, 3, 0, Math.PI * 2);
        context.fillStyle = ctx.getColor(0.8);
        context.fill();
        context.beginPath();
        context.arc(px, py, 7, 0, Math.PI * 2);
        context.fillStyle = ctx.getColor(0.133);
        context.fill();
        if (p.progress > 0.95) p.connIdx = (p.connIdx + 1) % n.connections.length;
      });
    };

    const stop = ctx.startLoop(draw, { visibilityRoot: ctx.scope.host });
    return () => {
      stop();
      canvas.remove();
    };
  },
};
