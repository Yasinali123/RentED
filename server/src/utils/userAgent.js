/**
 * Parses user-agent strings to determine browser, OS, and device types.
 * Avoids heavy dependency parser packages.
 * 
 * @param {string} userAgentString 
 * @returns {object} { browser, os, device }
 */
export const parseUserAgent = (userAgentString) => {
  const ua = userAgentString || "";
  let browser = "Unknown Browser";
  let os = "Unknown OS";
  let device = "Desktop";

  // Parse Browser
  if (/chrome|crios/i.test(ua) && !/edge|edg/i.test(ua) && !/opr/i.test(ua)) {
    browser = "Chrome";
  } else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua) && !/edge|edg/i.test(ua)) {
    browser = "Safari";
  } else if (/firefox|fxios/i.test(ua)) {
    browser = "Firefox";
  } else if (/edge|edg/i.test(ua)) {
    browser = "Edge";
  } else if (/opr/i.test(ua)) {
    browser = "Opera";
  } else if (/msie|trident/i.test(ua)) {
    browser = "Internet Explorer";
  }

  // Parse OS & Device
  if (/windows/i.test(ua)) {
    os = "Windows";
    device = "Desktop";
  } else if (/macintosh|mac os x/i.test(ua) && !/iphone|ipad|ipod/i.test(ua)) {
    os = "macOS";
    device = "Desktop";
  } else if (/iphone|ipod/i.test(ua)) {
    os = "iOS";
    device = "Mobile";
  } else if (/ipad/i.test(ua)) {
    os = "iOS";
    device = "Tablet";
  } else if (/android/i.test(ua)) {
    os = "Android";
    device = /mobile/i.test(ua) ? "Mobile" : "Tablet";
  } else if (/linux/i.test(ua)) {
    os = "Linux";
    device = "Desktop";
  }

  return { browser, os, device };
};

export default parseUserAgent;
