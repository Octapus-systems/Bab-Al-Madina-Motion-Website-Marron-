import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

// On Vercel, Nitro emits .vercel/output (Build Output API). Locally / for the
// Lambda bundle we keep the plain dist/ output.
const onVercel = !!process.env.VERCEL;

export default defineConfig({
  plugins: [
    tsConfigPaths(),
    tailwindcss(),
    tanstackStart({
      server: { entry: "server" },
    }),
    ...(onVercel ? [nitro({ preset: "vercel" })] : []),
    viteReact(),
  ],
});
