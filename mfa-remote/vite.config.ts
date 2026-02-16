import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { federation } from "@module-federation/vite"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    federation({
      name: "mfa-remote",
      filename: "remoteEntry.js",
      dts: false,
      exposes: {
        "./Hero": "./src/sections/Hero.tsx",
        "./Features": "./src/sections/Features.tsx",
        "./Pricing": "./src/sections/Pricing.tsx",
        "./Testimonials": "./src/sections/Testimonials.tsx",
        "./CTA": "./src/sections/CTA.tsx",
        "./Footer": "./src/sections/Footer.tsx",
        "./sections": "./src/sections/index.ts",
      },
      shared: {
        "react": { singleton: true },
        "react-dom": { singleton: true },
        "react/": { singleton: true },
        "react-dom/": { singleton: true },
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5001,
    strictPort: true,
    origin: "http://localhost:5001",
  },
  build: {
    target: "chrome89",
  },
})
