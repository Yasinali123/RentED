import { roundCurrency } from "../services/paymentService.js";

/**
 * Validates commission rates.
 * @param {number} platformRate - Platform commission percentage
 * @param {number} pocRate - POC/Mediator commission percentage
 * @throws {Error} if invalid configuration
 */
export const validateCommissionRates = (platformRate, pocRate) => {
  const pRate = Number(platformRate);
  const pocR = Number(pocRate);

  if (isNaN(pRate) || pRate < 0) {
    throw new Error("Platform commission rate must be a non-negative number.");
  }
  if (isNaN(pocR) || pocR < 0) {
    throw new Error("POC commission rate must be a non-negative number.");
  }
  if (pRate + pocR >= 100) {
    throw new Error("Combined Platform and POC commission rates must be less than 100%.");
  }
};

/**
 * Calculates financial payouts for a transaction.
 * @param {object} params
 * @param {number} params.itemPrice - Listed item price
 * @param {number} [params.platformCommissionRate=10] - Platform commission percentage
 * @param {number} [params.pocCommissionRate=5] - POC commission percentage
 * @returns {object} Payout breakdown
 */
export const calculatePayouts = ({
  itemPrice,
  platformCommissionRate = 10,
  pocCommissionRate = 5,
}) => {
  const price = roundCurrency(itemPrice);
  if (isNaN(price) || price < 0) {
    throw new Error("Item price must be a non-negative number.");
  }

  const platformRate = Number(platformCommissionRate);
  const pocRate = Number(pocCommissionRate);

  validateCommissionRates(platformRate, pocRate);

  const sellerCommissionRate = roundCurrency(100 - platformRate - pocRate);

  if (price === 0) {
    return {
      itemPrice: 0,
      platformCommissionRate: platformRate,
      pocCommissionRate: pocRate,
      sellerCommissionRate,
      platformFee: 0,
      pocPayout: 0,
      sellerPayout: 0,
      buyerTotal: 0,
    };
  }

  const platformFee = roundCurrency(price * (platformRate / 100));
  const pocPayout = roundCurrency(price * (pocRate / 100));
  const sellerPayout = roundCurrency(price - platformFee - pocPayout);

  // Reconciliation assertion to ensure no loss of precision
  const totalReconciled = roundCurrency(sellerPayout + pocPayout + platformFee);
  if (totalReconciled !== price) {
    console.warn(`[Payout Reconciliation Warning] Reconciled sum ${totalReconciled} != price ${price}`);
  }

  return {
    itemPrice: price,
    platformCommissionRate: platformRate,
    pocCommissionRate: pocRate,
    sellerCommissionRate,
    platformFee,
    pocPayout,
    sellerPayout,
    buyerTotal: price, // Campus delivery is FREE for buyer
  };
};

export default {
  validateCommissionRates,
  calculatePayouts,
};
