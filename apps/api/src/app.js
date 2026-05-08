import express from "express";
import cors from "cors";

import { corsOptions } from "./config/cors.js";
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

app.use(cors(corsOptions));

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/users", requireAuth, usersRoutes);
app.use("/auth", authRoutes);
app.use("/intelligence", requireAuth, intelligenceRoutes);
app.use("/checklists", requireAuth, checklistsRoutes);
app.use("/vehicles", requireAuth, vehiclesRoutes);
app.use("/patrols", requireAuth, patrolsRoutes);
app.use("/patrol-events", requireAuth, patrolEventsRoutes);
app.use("/incidents", requireAuth, incidentsRoutes);
app.use("/organisations", requireAuth, organisationsRoutes);
app.use("/admin", requireAuth, adminRoutes);
app.use("/members", requireAuth, membersRoutes);
app.use("/services", requireAuth, servicesRoutes);

export default app;
