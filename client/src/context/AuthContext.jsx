import { createContext, useContext, useEffect, useState } from "react";

import { authApi, getErrorMessage } from "../api/client";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      localStorage.removeItem("rented_token");
    };

    window.addEventListener("unauthorized", handleUnauthorized);

    authApi
      .me()
      .then((response) => {
        setUser(response.user);
        if (response.accessToken) {
          localStorage.setItem("rented_token", response.accessToken);
        }
      })
      .catch(() => {
        setUser(null);
        localStorage.removeItem("rented_token");
      })
      .finally(() => {
        setLoading(false);
      });

    return () => {
      window.removeEventListener("unauthorized", handleUnauthorized);
    };
  }, []);

  const login = async (payload) => {
    const response = await authApi.login(payload).catch((error) => {
      if (error?.response?.data?.needsVerification) {
        throw error.response.data;
      }
      throw new Error(getErrorMessage(error));
    });

    setUser(response.user);
    if (response.accessToken) {
      localStorage.setItem("rented_token", response.accessToken);
    }
    return response.user;
  };

  const signup = async (payload) => {
    const response = await authApi.signup(payload).catch((error) => {
      throw new Error(getErrorMessage(error));
    });
    if (response?.user) {
      setUser(response.user);
      if (response.accessToken) {
        localStorage.setItem("rented_token", response.accessToken);
      }
    }
    return response;
  };

  const verifyEmail = async (payload) => {
    const response = await authApi.verifyEmail(payload).catch((error) => {
      throw new Error(getErrorMessage(error));
    });
    setUser(response.user);
    if (response.accessToken) {
      localStorage.setItem("rented_token", response.accessToken);
    }
    return response.user;
  };

  const googleLogin = async (payload) => {
    const response = await authApi.googleLogin(payload).catch((error) => {
      throw new Error(getErrorMessage(error));
    });

    setUser(response.user);
    if (response.accessToken) {
      localStorage.setItem("rented_token", response.accessToken);
    }
    return response.user;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.error("Failed calling logout endpoint:", err);
    }
    localStorage.removeItem("rented_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, verifyEmail, googleLogin, logout, setUser }}>
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

