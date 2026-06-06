import { defineConfig } from "vite";

export default defineConfig({
  preview: {
    host: "0.0.0.0",
    port: 3000,
    allowedHosts: [
      "vso5wfuc2zj7n2hqlhdu8qoh.154.66.199.118.sslip.io",
      "civitaswatch.com",
      "www.civitaswatch.com"
    ]
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: [
      "vso5wfuc2zj7n2hqlhdu8qoh.154.66.199.118.sslip.io",
      "civitaswatch.com",
      "www.civitaswatch.com"
    ]
  }
});
