import { describe, it, expect } from "vitest";
import { sanitizeSvg, svgToDataUri } from "../lib/assistant/svg";

describe("sanitizeSvg", () => {
  it("accepts plain shapes, paths, gradients and patterns", () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"><defs><linearGradient id="g"><stop offset="0" stop-color="#E8622C"/></linearGradient></defs><path d="M0 0 L10 10" fill="url(#g)"/></svg>';
    const out = sanitizeSvg(svg);
    expect(out.ok).toBe(true);
  });

  it("rejects scripts, event handlers and external references", () => {
    const bad = [
      "<svg><script>alert(1)</script></svg>",
      '<svg onload="alert(1)"></svg>',
      '<svg><a href="https://evil.example">x</a></svg>',
      '<svg><image xlink:href="https://evil.example/x.png"/></svg>',
      '<svg><foreignObject><body/></foreignObject></svg>',
      '<svg><use href="#x"/></svg>',
      "not an svg at all",
    ];
    for (const svg of bad) {
      expect(sanitizeSvg(svg).ok, svg).toBe(false);
    }
  });

  it("rejects oversized documents", () => {
    const svg = `<svg>${"<path d='M0 0'/>".repeat(5000)}</svg>`;
    expect(sanitizeSvg(svg).ok).toBe(false);
  });

  it("encodes to a base64 data URI", () => {
    expect(svgToDataUri("<svg></svg>")).toMatch(/^data:image\/svg\+xml;base64,/);
  });
});
