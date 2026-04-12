import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  root: ".",
  publicDir: false,
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        about: resolve(__dirname, "about.html"),
        programs: resolve(__dirname, "programs.html"),
        results: resolve(__dirname, "results.html"),
        notice: resolve(__dirname, "notice.html"),
        contact: resolve(__dirname, "contact.html"),
        notfound: resolve(__dirname, "404.html"),
        admin: resolve(__dirname, "admin/index.html"),
      },
    },
  },
});
