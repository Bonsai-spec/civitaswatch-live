import express from "express";
import cors from "cors";
import usersRoutes from "./routes/users.routes.js";
import authRoutes from "./routes/auth.routes.js";
import intelligenceRoutes from "./routes/intelligence.routes.js";
import checklistsRoutes from "./routes/checklists.routes.js";
import vehiclesRoutes from "./routes/vehicles.routes.js";
import patrolsRoutes from "./routes/patrols.routes.js";
import patrolEventsRoutes from "./routes/patrol-events.routes.js";

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: false,
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

export default app;