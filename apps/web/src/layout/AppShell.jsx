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

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="logo">CivitasWatch</div>
        <div className="subtitle">{isPatrol ? "Patrol Console" : "Admin Dashboard"}</div>

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
            <h1>{active}</h1>
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
