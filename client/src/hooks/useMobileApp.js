import { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";
import { checkForAppUpdate } from "../services/updateService";

export function useMobileApp() {
  const navigate = useNavigate();
  const location = useLocation();
  const [updateInfo, setUpdateInfo] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  // Manual update check trigger
  const checkUpdate = useCallback(async (manual = false) => {
    setIsCheckingUpdate(true);
    try {
      const res = await checkForAppUpdate();
      if (res && res.hasUpdate) {
        setUpdateInfo(res);
        setShowUpdateModal(true);
      } else if (manual) {
        alert("You are on the latest version of RentED (v" + (res?.currentVersion || "1.0.0") + ")!");
      }
    } catch (err) {
      console.warn("Update check failed:", err);
      if (manual) alert("Could not reach update server. Please check your connection.");
    } finally {
      setIsCheckingUpdate(false);
    }
  }, []);

  // Initialize native Capacitor settings
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      // In web browser, check updates silently after 3s
      const timer = setTimeout(() => checkUpdate(false), 3000);
      return () => clearTimeout(timer);
    }

    // Configure Status Bar
    const setupStatusBar = async () => {
      try {
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: "#0f172a" });
      } catch (err) {
        console.debug("StatusBar error:", err);
      }
    };
    setupStatusBar();

    // Hide Splash Screen after React mounts
    const hideSplash = async () => {
      try {
        await SplashScreen.hide();
      } catch (err) {
        console.debug("SplashScreen error:", err);
      }
    };
    hideSplash();

    // Hardware Back Button listener on Android
    const backListener = CapApp.addListener("backButton", ({ canGoBack }) => {
      if (location.pathname !== "/" && canGoBack) {
        navigate(-1);
      } else {
        CapApp.exitApp();
      }
    });

    // Check for updates on startup
    const timer = setTimeout(() => checkUpdate(false), 2500);

    return () => {
      clearTimeout(timer);
      backListener.then((sub) => sub.remove()).catch(() => {});
    };
  }, [checkUpdate, location.pathname, navigate]);

  return {
    isNative: Capacitor.isNativePlatform(),
    updateInfo,
    showUpdateModal,
    setShowUpdateModal,
    checkUpdate,
    isCheckingUpdate,
  };
}

