import express from "express";

const router = express.Router();

// Fallback version metadata if GitHub API is unreachable
const APP_CONFIG = {
  latestVersion: process.env.APP_LATEST_VERSION || "1.0.0",
  minSupportedVersion: process.env.APP_MIN_VERSION || "1.0.0",
  forceUpdate: process.env.APP_FORCE_UPDATE === "true",
  downloadUrl: "https://github.com/Yasinali123/RentED/releases/latest",
  apkDownloadUrl: "https://github.com/Yasinali123/RentED/releases/latest/download/rented-app-debug.apk",
  releaseNotes:
    "Official RentED Android Release:\n• Full student marketplace for renting and buying\n• Real-time chat and order negotiation via Socket.io\n• Campus proximity search and interactive Leaflet maps\n• Secure Razorpay online payments and in-app escrow wallet\n• Instant QR code delivery & pickup verification\n• Over-The-Air app update notification support",
};

/**
 * Compare two semver version strings (e.g., '1.0.1' > '1.0.0')
 */
const compareVersions = (v1, v2) => {
  const clean1 = (v1 || "0.0.0").replace(/^v/, "").split(".").map((n) => parseInt(n, 10) || 0);
  const clean2 = (v2 || "0.0.0").replace(/^v/, "").split(".").map((n) => parseInt(n, 10) || 0);

  for (let i = 0; i < Math.max(clean1.length, clean2.length); i++) {
    const num1 = clean1[i] || 0;
    const num2 = clean2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
};

// @route   GET /api/app-update/check
// @desc    Check if an update is available for RentED Android App
// @access  Public
router.get("/check", async (req, res) => {
  const clientVersion = req.query.version || "1.0.0";
  const platform = req.query.platform || "android";

  try {
    // Attempt to query latest GitHub Release
    const githubResponse = await fetch("https://api.github.com/repos/Yasinali123/RentED/releases/latest", {
      headers: {
        "User-Agent": "RentED-App-Updater",
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (githubResponse.ok) {
      const releaseData = await githubResponse.json();
      const latestTag = releaseData.tag_name ? releaseData.tag_name.replace(/^v/, "") : APP_CONFIG.latestVersion;
      const apkAsset = releaseData.assets?.find((a) => a.name.endsWith(".apk"));

      const hasUpdate = compareVersions(latestTag, clientVersion) > 0;
      const forceUpdate =
        APP_CONFIG.forceUpdate ||
        compareVersions(APP_CONFIG.minSupportedVersion, clientVersion) > 0;

      return res.json({
        platform,
        currentVersion: clientVersion,
        latestVersion: latestTag,
        hasUpdate,
        forceUpdate,
        releaseTitle: releaseData.name || `Version ${latestTag}`,
        releaseNotes: releaseData.body || APP_CONFIG.releaseNotes,
        downloadUrl: releaseData.html_url || APP_CONFIG.downloadUrl,
        apkDownloadUrl: apkAsset?.browser_download_url || APP_CONFIG.apkDownloadUrl,
        publishedAt: releaseData.published_at || new Date().toISOString(),
      });
    }
  } catch (err) {
    console.warn("[AppUpdate] GitHub release check fallback:", err.message);
  }

  // Graceful fallback to static configuration
  const hasUpdate = compareVersions(APP_CONFIG.latestVersion, clientVersion) > 0;
  return res.json({
    platform,
    currentVersion: clientVersion,
    latestVersion: APP_CONFIG.latestVersion,
    hasUpdate,
    forceUpdate: APP_CONFIG.forceUpdate,
    releaseTitle: `Version ${APP_CONFIG.latestVersion}`,
    releaseNotes: APP_CONFIG.releaseNotes,
    downloadUrl: APP_CONFIG.downloadUrl,
    apkDownloadUrl: APP_CONFIG.apkDownloadUrl,
    publishedAt: new Date().toISOString(),
  });
});

export default router;

