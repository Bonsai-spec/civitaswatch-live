import { defineConfig, loadEnv } from "vite";

const API_PROXY_ROUTES = [
  "/admin",
  "/auth",
  "/checklists",
  "/health",
  "/incidents",
  "/intelligence",
  "/members",
  "/organisations",
  "/patrol-events",
  "/patrols",
  "/services",
  "/users",
  "/vehicles",
];

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiTarget = env.VITE_API_PROXY_TARGET || "http://localhost:4000";
  const proxyRoute = {
    target: apiTarget,
    changeOrigin: true,
    secure: false,
  };

  return {
    server: {
      proxy: Object.fromEntries(API_PROXY_ROUTES.map((route) => [route, proxyRoute])),
    },
  };
});
