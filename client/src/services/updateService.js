import { appUpdateApi } from "../api/client";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";

export const CURRENT_APP_VERSION = import.meta.env.VITE_APP_VERSION || "1.0.0";
export const GITHUB_REPO = import.meta.env.VITE_GITHUB_REPO || "Yasinali123/RentED";

/**
 * Compare two semantic version strings (e.g. "1.1.0" > "1.0.0")
 * Returns 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
export const compareVersions = (v1, v2) => {
  const parse = (v) =>
    (v || "0.0.0")
      .toString()
      .replace(/^[vV]/, "")
      .split(".")
      .map((n) => parseInt(n, 10) || 0);

  const parts1 = parse(v1);
  const parts2 = parse(v2);
  const len = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < len; i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
};

/**
 * Check if a newer version of RentED is available.
 * Checks the backend /api/app-update/check first, and falls back to GitHub Releases API.
 */
export const checkForAppUpdate = async (currentVersion = CURRENT_APP_VERSION) => {
  // Strategy 1: Try backend app-update endpoint
  try {
    const backendData = await appUpdateApi.checkUpdate({
      version: currentVersion,
      platform: "android",
    });
    if (backendData && backendData.latestVersion) {
      const hasUpdate =
        backendData.hasUpdate !== undefined
          ? backendData.hasUpdate
          : compareVersions(backendData.latestVersion, currentVersion) > 0;

      return {
        hasUpdate,
        currentVersion,
        latestVersion: backendData.latestVersion,
        releaseTitle: backendData.releaseTitle || `RentED v${backendData.latestVersion}`,
        releaseNotes: backendData.releaseNotes || "Performance enhancements and bug fixes.",
        apkDownloadUrl: backendData.apkDownloadUrl || backendData.downloadUrl,
        downloadUrl: backendData.downloadUrl,
        forceUpdate: Boolean(backendData.forceUpdate),
        publishedAt: backendData.publishedAt,
      };
    }
  } catch (backendError) {
    console.log("[UpdateChecker] Backend check skipped, querying GitHub Releases:", backendError.message);
  }

  // Strategy 2: Directly query public GitHub Releases API
  try {
    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: { Accept: "application/vnd.github.v3+json" },
    });

    if (response.ok) {
      const release = await response.json();
      const latestTag = release.tag_name ? release.tag_name.replace(/^[vV]/, "") : currentVersion;
      const apkAsset = release.assets?.find((a) => a.name.endsWith(".apk"));

      const hasUpdate = compareVersions(latestTag, currentVersion) > 0;

      return {
        hasUpdate,
        currentVersion,
        latestVersion: latestTag,
        releaseTitle: release.name || `RentED v${latestTag}`,
        releaseNotes: release.body || "Latest update with performance and bug improvements.",
        apkDownloadUrl: apkAsset ? apkAsset.browser_download_url : release.html_url,
        downloadUrl: release.html_url,
        forceUpdate: false,
        publishedAt: release.published_at,
      };
    }
  } catch (ghError) {
    console.warn("[UpdateChecker] GitHub API check error:", ghError.message);
  }

  // No update found or offline
  return {
    hasUpdate: false,
    currentVersion,
    latestVersion: currentVersion,
    releaseNotes: "",
    apkDownloadUrl: "",
    forceUpdate: false,
  };
};

/**
 * Trigger download and installation of the updated APK
 */
export const openUpdateDownload = async (url) => {
  if (!url) return;

  if (Capacitor.isNativePlatform()) {
    try {
      await Browser.open({ url });
    } catch {
      window.open(url, "_system");
    }
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
};

