import SystemSetting from "../models/SystemSetting.js";

export const getSetting = async (key, defaultValue) => {
  try {
    const setting = await SystemSetting.findOne({ key });
    return setting ? setting.value : defaultValue;
  } catch (error) {
    console.error(`Failed to get setting ${key}:`, error.message);
    return defaultValue;
  }
};

export const setSetting = async (key, value) => {
  try {
    return await SystemSetting.findOneAndUpdate(
      { key },
      { value },
      { upsert: true, new: true }
    );
  } catch (error) {
    console.error(`Failed to set setting ${key}:`, error.message);
    throw error;
  }
};
