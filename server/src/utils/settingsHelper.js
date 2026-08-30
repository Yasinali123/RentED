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

export const getAllPaymentSettings = async () => {
  const platformCommissionRate = await getSetting("platform_commission_rate", await getSetting("commission_rate", 10));
  const pocCommissionRate = await getSetting("poc_commission_rate", 5);
  const minWithdrawalAmount = await getSetting("min_withdrawal_amount", 500);
  const codEnabled = await getSetting("cod_enabled", true);
  const escrowAutoReleaseHours = await getSetting("escrow_auto_release_hours", 24);

  const pRate = Number(platformCommissionRate);
  const pocRate = Number(pocCommissionRate);
  const sellerRate = Math.max(0, 100 - pRate - pocRate);

  return {
    platform_commission_rate: pRate,
    poc_commission_rate: pocRate,
    seller_commission_rate: sellerRate,
    delivery_fee: 0, // Campus delivery is FREE for buyer under new model
    poc_share_rate: await getSetting("poc_share_rate", 80),
    platform_delivery_share_rate: await getSetting("platform_delivery_share_rate", 20),
    min_withdrawal_amount: Number(minWithdrawalAmount),
    cod_enabled: Boolean(codEnabled),
    escrow_auto_release_hours: Number(escrowAutoReleaseHours),
  };
};

