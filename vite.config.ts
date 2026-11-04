import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { viteSingleFile } from "vite-plugin-singlefile"

// `vite build` → dist/ for any static host.
// `vite build --mode artifact` → one self-contained HTML file in dist-artifact/
// (JS, CSS and fonts inlined), post-processed by scripts/build-artifact.mjs.
export default defineConfig(({ mode }) => {
  const artifact = mode === "artifact"
  return {
    base: artifact ? "./" : "/",
    plugins: [react(), tailwindcss(), ...(artifact ? [viteSingleFile({ removeViteModuleLoader: true })] : [])],
    resolve: {
      alias: { "@": path.resolve(__dirname, "./src") },
    },
    build: artifact
      ? { outDir: "dist-artifact", emptyOutDir: true, copyPublicDir: false }
      : { outDir: "dist", chunkSizeWarningLimit: 700 },
  }
})
