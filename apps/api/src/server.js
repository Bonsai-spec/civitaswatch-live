import app from "./app.js";

const PORT = process.env.PORT || 4000;
const HOST = "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.log("=================================");
  console.log("🚀 CIVITASWATCH API RUNNING");
  console.log(`Local:   http://localhost:${PORT}`);
  console.log(`Network: http://192.168.0.143:${PORT}`);
  console.log("=================================");
});