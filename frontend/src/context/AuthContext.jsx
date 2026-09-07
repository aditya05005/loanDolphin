// AuthContext.jsx
import { createContext, useContext, useState, useEffect } from "react";
import { apiRequest } from "../services/api";

const AuthContext = createContext(null);

const SESSION_STORAGE_KEY = "loanDolphinSession";

function getCurrentSessionUser() {
  try {
    const user = JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY));
    return user || null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(getCurrentSessionUser);

  useEffect(() => {
    try {
      if (currentUser) {
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(currentUser));
      } else {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
      }
    } catch {
      // Ignore sessionStorage errors
    }
  }, [currentUser]);

  async function login(userid, password) {
    const user = await apiRequest('/users/login', {
      method: 'POST',
      body: JSON.stringify({
        userid,
        password
      })
    });

    const sessionUser = { userid: user.userid, type: user.type };
    setCurrentUser(sessionUser);
    return sessionUser;
  }

  async function register(userid, password, type) {
    const user = await apiRequest('/users/register', {
      method: 'POST',
      body: JSON.stringify({
        userid,
        password,
        type
      })
    });

    const sessionUser = { userid: user.userid, type: user.type };
    setCurrentUser(sessionUser);
    return sessionUser;
  }

  function logout() {
    setCurrentUser(null);
    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // Ignore sessionStorage errors
    }
  }

  return (
    <AuthContext.Provider value={{ currentUser, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
