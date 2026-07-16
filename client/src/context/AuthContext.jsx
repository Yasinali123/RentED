import { createContext, useContext, useEffect, useState } from "react";

import { authApi, getErrorMessage } from "../api/client";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("rented_token");

    if (!token) {
      setLoading(false);
      return;
    }

    authApi
      .me()
      .then((response) => {
        setUser(response.user);
      })
      .catch(() => {
        localStorage.removeItem("rented_token");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const login = async (payload) => {
    const response = await authApi.login(payload).catch((error) => {
      throw new Error(getErrorMessage(error));
    });

    localStorage.setItem("rented_token", response.token);
    setUser(response.user);
    return response.user;
  };

  const signup = async (payload) => {
    const response = await authApi.signup(payload).catch((error) => {
      throw new Error(getErrorMessage(error));
    });

    localStorage.setItem("rented_token", response.token);
    setUser(response.user);
    return response.user;
  };

  const googleLogin = async (payload) => {
    const response = await authApi.googleLogin(payload).catch((error) => {
      throw new Error(getErrorMessage(error));
    });

    localStorage.setItem("rented_token", response.token);
    setUser(response.user);
    return response.user;
  };

  const logout = () => {
    localStorage.removeItem("rented_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, googleLogin, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
};

