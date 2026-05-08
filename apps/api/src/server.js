import "./config/env.js";
import { prisma } from "./config/db.js";
import app from "./app.js";

const PORT = process.env.PORT || 4000;
const HOST = "0.0.0.0";

function logProcessError(event, error) {
  const errorDetails =
    error instanceof Error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
      : {
          name: "NonError",
          message: String(error),
          stack: undefined,
        };

  console.error({
    event,
    error: errorDetails,
  });
}

process.on("unhandledRejection", (reason) => {
  logProcessError("unhandledRejection", reason);
});

process.on("uncaughtException", (error) => {
  logProcessError("uncaughtException", error);
});

const server = app.listen(PORT, HOST, () => {
  console.log("=================================");
  console.log("🚀 CIVITASWATCH API RUNNING");
  console.log(`Local:   http://localhost:${PORT}`);
  console.log("=================================");
});

let shutdownInProgress = false;

function shutdown(signal) {
  if (shutdownInProgress) {
    console.info({ event: "shutdown_already_in_progress", signal });
    return;
  }

  shutdownInProgress = true;
  console.info({ event: "shutdown_signal", signal });

  server.close(async () => {
    console.info({ event: "http_server_closed", signal });

    try {
      await prisma.$disconnect();
      console.info({ event: "prisma_disconnected", signal });
    } catch (error) {
      logProcessError("prisma_disconnect_failed", error);
    }
  });
}

process.on("SIGINT", () => {
  shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  shutdown("SIGTERM");
});
