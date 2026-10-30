// Generates the app icon in every size: the iPhone home-screen icon, the browser tab
// icon, and the install icons (including Android's "maskable" one, padded so circle and
// squircle crops keep the whole design).
//   node scripts/generate-icons.mjs
// Edit the design in icon() below, then re-run and commit the PNGs.
import fs from "node:fs";
import { Resvg } from "@resvg/resvg-js";
import satori from "satori";

const fonts = [{ name: "Geist", data: fs.readFileSync("node_modules/geist/dist/fonts/geist-sans/Geist-Black.ttf"), weight: 900 }];
const h = (type, style, ...children) => ({ type, props: { style: { display: "flex", ...style }, children: children.length === 1 ? children[0] : children } });
const YELLOW = "#FCD116", BLUE = "#003893", RED = "#CE1126";
const glow = (x, y, size, color, opacity) => h("div", { position: "absolute", left: x - size / 2, top: y - size / 2, width: size, height: size, borderRadius: size,
  backgroundImage: `radial-gradient(circle, ${color} 0%, rgba(0,0,0,0) 70%)`, opacity });

// "á": a big white a whose accent is a glowing flag-yellow stroke, on Colombian navy,
// with the flag as a stripe underneath. Full-bleed: iOS rounds the corners itself.
function icon({ padding = 0, bare = false } = {}) {
  const s = 1 - padding * 2; // scale content in for maskable icons (Android crops to a circle)
  const X = (v) => 512 + (v - 512) * s;
  return h("div", { width: 1024, height: 1024, position: "relative", overflow: "hidden", alignItems: "center", justifyContent: "center",
      ...(bare ? {} : { backgroundImage: "radial-gradient(circle at 50% 34%, #163a8f 0%, #0b1d52 34%, #050b22 80%)" }) },
    glow(X(512), X(560), 900 * s, "#1b4bb8", 0.35),
    glow(X(590), X(238), 480 * s, YELLOW, 0.55),
    glow(X(590), X(238), 230 * s, "#fff3a8", 0.55),
    h("div", { position: "absolute", left: X(590) - 42 * s, top: X(238) - 106 * s, width: 84 * s, height: 212 * s, borderRadius: 42 * s,
      backgroundImage: `linear-gradient(180deg, #fff7c7 0%, ${YELLOW} 38%, #f2b400 100%)`, transform: "rotate(36deg)" }),
    h("div", { position: "absolute", left: 0, right: 0, top: X(150), justifyContent: "center",
        fontFamily: "Geist", fontWeight: 900, fontSize: 760 * s, lineHeight: 1, letterSpacing: -22,
        backgroundImage: "linear-gradient(180deg, #ffffff 0%, #eef2ff 55%, #c3cff2 100%)", backgroundClip: "text", color: "transparent" }, "a"),
    h("div", { position: "absolute", top: X(866), left: X(352), width: 320 * s, height: 24 * s, borderRadius: 13 * s, overflow: "hidden" },
      h("div", { width: "50%", height: "100%", backgroundColor: YELLOW }), h("div", { width: "25%", height: "100%", backgroundColor: BLUE }), h("div", { width: "25%", height: "100%", backgroundColor: RED })),
  );
}

async function render(size, opts) {
  const svg = await satori(icon(opts), { width: 1024, height: 1024, fonts });
  return new Resvg(svg, { fitTo: { mode: "width", value: size } }).render().asPng();
}

// iPhone launch screens: the icon's "á" centered on the app's navy, one per screen size,
// so opening from the home screen never flashes white. [css width, css height, pixel ratio]
// Keep in step with SPLASH_SCREENS in src/app/layout.tsx, which links them.
const SPLASH_SCREENS = [
  [440, 956, 3], [402, 874, 3], [430, 932, 3], [393, 852, 3], [428, 926, 3], [390, 844, 3], [375, 812, 3], [414, 896, 2],
];
async function renderSplash(w, h) {
  const k = (0.5 * w) / 1024;
  const el = { type: "div", props: { style: { display: "flex", width: w, height: h, alignItems: "center", justifyContent: "center",
    backgroundImage: "radial-gradient(circle at 50% 42%, #12307a 0%, #0a1a47 30%, #070e26 70%)" },
    children: { type: "div", props: { style: { display: "flex", width: 1024, height: 1024, flexShrink: 0, transform: `scale(${k})` }, children: icon({ bare: true }) } } } };
  const svg = await satori(el, { width: w, height: h, fonts });
  return new Resvg(svg, { fitTo: { mode: "width", value: w } }).render().asPng();
}

const outputs = [
  ["src/app/apple-icon.png", 180, {}], // iPhone home screen
  ["src/app/icon.png", 192, {}], // browser tab
  ["public/icons/icon-192.png", 192, {}],
  ["public/icons/icon-512.png", 512, {}],
  ["public/icons/maskable-512.png", 512, { padding: 0.1 }],
];
fs.mkdirSync("public/icons", { recursive: true });
for (const [file, size, opts] of outputs) {
  fs.writeFileSync(file, await render(size, opts));
  console.log(`${file} (${size}×${size})`);
}
fs.mkdirSync("public/splash", { recursive: true });
for (const [cw, ch, dpr] of SPLASH_SCREENS) {
  const file = `public/splash/${cw * dpr}x${ch * dpr}.png`;
  fs.writeFileSync(file, await renderSplash(cw * dpr, ch * dpr));
  console.log(file);
}
