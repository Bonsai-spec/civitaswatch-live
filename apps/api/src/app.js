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

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/users", usersRoutes);
app.use("/auth", authRoutes);
app.use("/intelligence", intelligenceRoutes);
app.use("/checklists", checklistsRoutes);
app.use("/vehicles", vehiclesRoutes);
app.use("/patrols", patrolsRoutes);
app.use("/patrol-events", patrolEventsRoutes);
app.use("/incidents", incidentsRoutes);
app.use("/organisations", organisationsRoutes);
app.use("/admin", requireAuth, adminRoutes);
app.use("/members", requireAuth, membersRoutes);
app.use("/services", servicesRoutes);

export default app;
