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
  const commissionRate = await getSetting("platform_commission_rate", await getSetting("commission_rate", 10));
  const deliveryFee = await getSetting("delivery_fee", 50);
  const pocShareRate = await getSetting("poc_share_rate", 80);
  const platformDeliveryShareRate = await getSetting("platform_delivery_share_rate", 20);
  const minWithdrawalAmount = await getSetting("min_withdrawal_amount", 500);
  const codEnabled = await getSetting("cod_enabled", true);
  const escrowAutoReleaseHours = await getSetting("escrow_auto_release_hours", 24);

  return {
    platform_commission_rate: Number(commissionRate),
    delivery_fee: Number(deliveryFee),
    poc_share_rate: Number(pocShareRate),
    platform_delivery_share_rate: Number(platformDeliveryShareRate),
    min_withdrawal_amount: Number(minWithdrawalAmount),
    cod_enabled: Boolean(codEnabled),
    escrow_auto_release_hours: Number(escrowAutoReleaseHours),
  };
};

