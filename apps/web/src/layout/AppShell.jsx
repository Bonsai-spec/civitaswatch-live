import React from "react";
import { getDisplayName } from "../modules/vehicles/vehicle.utils";

export default function AppShell({
  user,
  active,
  navSections,
  onNavigate,
  onLogout,
  children,
}) {
  const isPatrol = user?.role === "PATROL" || user?.role === "PATROLLER";
  const isControlRoom = user?.role === "CONTROL_ROOM";
  const isControlRoomTab = isControlRoom && active !== "Intelligence";
  const subtitle = active === "Intelligence"
    ? "Intelligence Workspace"
    : isPatrol
      ? "Patrol Console"
      : isControlRoom
        ? "Control Room Operations"
        : "Admin Dashboard";

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="logo">CivitasWatch</div>
        <div className="subtitle">{subtitle}</div>

        <nav className="nav">
          {navSections.map((section) => (
            <div className="nav-section" key={section.label}>
              <div className="nav-section-label">{section.label}</div>
              {section.items.map((item) => (
                <button
                  key={item.label}
                  onClick={() => onNavigate(item.label)}
                  className={active === item.label ? "active" : ""}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <div className="content">
        <div className="header header-row">
          <div>
            <h1>{isControlRoomTab ? "Control Room" : active}</h1>
            <p>
              {user
                ? `Logged in as ${getDisplayName(user)} (${user.role})`
                : "Live CivitasWatch data"}
            </p>
          </div>

          <button className="secondary-btn" onClick={onLogout}>
            Logout
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}
