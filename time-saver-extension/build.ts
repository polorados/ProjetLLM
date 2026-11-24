import { build } from "esbuild";
import ttsc from "@ttsc/unplugin/esbuild";
// import { generateFunction_Tools } from "./orchestration/tools.ts"

async function main() {
  // await generateFunction_Tools();
  await build({
    entryPoints: ["main.js"],
    bundle: true,
    outfile: "dist/main.js",
    format: "esm",
    platform: "browser",
    target: "chrome120",
    // plugins: [ttsc()],
    // external: ["@ttsc/linux-x64"],
  });
}
main().catch(console.error);