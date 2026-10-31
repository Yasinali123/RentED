import { useState } from "react";
import { Download, Sparkles, X, ExternalLink, CheckCircle } from "lucide-react";
import { openUpdateDownload } from "../../services/updateService";

export default function UpdateModal({ updateInfo, onClose }) {
  const [downloading, setDownloading] = useState(false);

  if (!updateInfo || !updateInfo.hasUpdate) return null;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const targetUrl = updateInfo.apkDownloadUrl || updateInfo.downloadUrl;
      await openUpdateDownload(targetUrl);
    } catch (err) {
      console.error("Failed to open update URL:", err);
    } finally {
      setTimeout(() => setDownloading(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="p-2 rounded-xl bg-white/20 backdrop-blur-md">
                <Sparkles className="w-5 h-5 text-white" />
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full">
                OTA Update Ready
              </span>
            </div>
            {!updateInfo.forceUpdate && (
              <button
                onClick={onClose}
                className="p-1 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          <h3 className="mt-3 text-xl font-bold">
            {updateInfo.releaseTitle || "New Version Available"}
          </h3>
          <p className="mt-1 text-xs text-white/90">
            Version {updateInfo.latestVersion} is now available (Current: v{updateInfo.currentVersion})
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-4 border border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              What's New in this update:
            </h4>
            <div className="text-sm text-slate-700 dark:text-slate-300 max-h-48 overflow-y-auto space-y-1.5 whitespace-pre-line leading-relaxed font-sans">
              {updateInfo.releaseNotes || "Performance enhancements, bug fixes, and reliability improvements."}
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Fast direct APK download built automatically via GitHub Actions</span>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex-1 flex items-center justify-center space-x-2 px-5 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-medium shadow-lg shadow-orange-500/25 transition active:scale-95 disabled:opacity-75"
            >
              <Download className="w-4 h-4" />
              <span>{downloading ? "Opening Download..." : "Update Now"}</span>
            </button>

            {updateInfo.downloadUrl && (
              <button
                type="button"
                onClick={() => openUpdateDownload(updateInfo.downloadUrl)}
                className="px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium transition flex items-center justify-center space-x-1"
                title="View Release on GitHub"
              >
                <ExternalLink className="w-4 h-4" />
                <span className="sm:hidden">GitHub</span>
              </button>
            )}

            {!updateInfo.forceUpdate && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-3 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium transition"
              >
                Later
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

