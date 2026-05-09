import { useEffect, useState } from "react";
import { AUTH_ENDPOINTS } from "../core/endpoints";
import { getAuthHeaders as buildAuthHeaders } from "../core/http.utils";

export function useAuth() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function logout() {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  }

  async function login(e) {
    e.preventDefault();

    try {
      const res = await fetch(AUTH_ENDPOINTS.login, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const json = await res.json();

      if (!res.ok) {
        alert(json.error || "Login failed");
        return;
      }

      localStorage.setItem("token", json.token);
      setToken(json.token);
      setUser(json.user);
    } catch (err) {
      console.error(err);
      alert("Login failed");
    }
  }

  async function loadUser() {
    try {
      const res = await fetch(AUTH_ENDPOINTS.me, {
        headers: buildAuthHeaders(token),
      });

      const json = await res.json();

      if (!res.ok) {
        logout();
        return;
      }

      setUser(json);
    } catch (err) {
      console.error(err);
      logout();
    }
  }

  useEffect(() => {
    if (token) {
      loadUser();
    }
  }, [token]);

  return {
    token,
    user,
    email,
    password,
    setEmail,
    setPassword,
    login,
    logout,
    loadUser,
    setUser,
    setToken,
  };
}
