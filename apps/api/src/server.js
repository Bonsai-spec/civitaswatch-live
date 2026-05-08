import "./config/env.js";
import app from "./app.js";

const PORT = process.env.PORT || 4000;
const HOST = "0.0.0.0";

function logProcessError(event, error) {
  console.error({
    event,
    error: {
      name: error?.name,
      message: error?.message,
      stack: error?.stack,
    },
  });
}

process.on("unhandledRejection", (reason) => {
  logProcessError("unhandledRejection", reason);
});

process.on("uncaughtException", (error) => {
  logProcessError("uncaughtException", error);
});

app.listen(PORT, HOST, () => {
  console.log("=================================");
  console.log("🚀 CIVITASWATCH API RUNNING");
  console.log(`Local:   http://localhost:${PORT}`);
  console.log(`Network: http://192.168.0.143:${PORT}`);
  console.log("=================================");
});
