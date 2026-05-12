import express from "express";
import cors from "cors";

import usersRoutes from "./routes/users.routes.js";
import authRoutes from "./routes/auth.routes.js";
import intelligenceRoutes from "./routes/intelligence.routes.js";
import checklistsRoutes from "./routes/checklists.routes.js";
import vehiclesRoutes from "./routes/vehicles.routes.js";
import patrolsRoutes from "./routes/patrols.routes.js";
import patrolEventsRoutes from "./routes/patrol-events.routes.js";
import incidentsRoutes from "./routes/incidents.routes.js";
import organisationsRoutes from "./routes/organisations.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import membersRoutes from "./routes/members.routes.js";
import servicesRoutes from "./routes/services.routes.js";

import { requireAuth } from "./middleware/auth.js";

const app = express();

/**
 * DEV CORS
 * Local development only.
 * Before public hosting, lock this down to your real domain.
 */
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "1mb" }));

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "civitaswatch-api",
  });
});

app.use("/auth", authRoutes);

app.use("/users", usersRoutes);
app.use("/checklists", checklistsRoutes);
app.use("/vehicles", vehiclesRoutes);
app.use("/patrols", patrolsRoutes);
app.use("/patrol-events", patrolEventsRoutes);
app.use("/incidents", incidentsRoutes);
app.use("/organisations", organisationsRoutes);
app.use("/members", membersRoutes);
app.use("/services", servicesRoutes);

app.use("/admin", requireAuth, adminRoutes);
app.use("/intelligence", requireAuth, intelligenceRoutes);

app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl,
  });
});

app.use((err, req, res, next) => {
  console.error("Unhandled API error:", err);
  res.status(500).json({
    error: "Internal server error",
  });
});

export default app;