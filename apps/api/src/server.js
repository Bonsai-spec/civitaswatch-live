import app from "./app.js";

const PORT = process.env.PORT || 4000;

import incidentsRoutes from "./routes/incidents.routes.js";

// other app.use(...) routes...

app.use("/incidents", incidentsRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});