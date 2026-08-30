import "dotenv/config";
import { calculatePayouts, validateCommissionRates } from "./utils/payoutCalculator.js";

function runTests() {
  console.log("==========================================");
  console.log("RUNNING FINANCIAL PAYOUT CALCULATION TESTS");
  console.log("==========================================");

  const testCases = [
    {
      price: 100,
      expected: { sellerPayout: 85, pocPayout: 5, platformFee: 10 },
    },
    {
      price: 200,
      expected: { sellerPayout: 170, pocPayout: 10, platformFee: 20 },
    },
    {
      price: 500,
      expected: { sellerPayout: 425, pocPayout: 25, platformFee: 50 },
    },
    {
      price: 999,
      expected: { sellerPayout: 849.15, pocPayout: 49.95, platformFee: 99.90 },
    },
    {
      price: 1000,
      expected: { sellerPayout: 850, pocPayout: 50, platformFee: 100 },
    },
    {
      price: 5000,
      expected: { sellerPayout: 4250, pocPayout: 250, platformFee: 500 },
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const tc of testCases) {
    const res = calculatePayouts({ itemPrice: tc.price });
    const sellerOk = res.sellerPayout === tc.expected.sellerPayout;
    const pocOk = res.pocPayout === tc.expected.pocPayout;
    const platformOk = res.platformFee === tc.expected.platformFee;
    const sumOk = Math.abs((res.sellerPayout + res.pocPayout + res.platformFee) - tc.price) < 0.001;

    if (sellerOk && pocOk && platformOk && sumOk) {
      console.log(`[PASS] Price ₹${tc.price}: Seller ₹${res.sellerPayout}, POC ₹${res.pocPayout}, Platform ₹${res.platformFee}`);
      passed++;
    } else {
      console.error(`[FAIL] Price ₹${tc.price}: Got Seller ₹${res.sellerPayout}, POC ₹${res.pocPayout}, Platform ₹${res.platformFee}`);
      console.error(`       Expected: Seller ₹${tc.expected.sellerPayout}, POC ₹${tc.expected.pocPayout}, Platform ₹${tc.expected.platformFee}`);
      failed++;
    }
  }

  console.log("\nTesting Commission Rate Validation:");
  try {
    validateCommissionRates(-5, 5);
    console.error("[FAIL] Failed to throw error for negative platform rate");
    failed++;
  } catch (err) {
    console.log("[PASS] Correctly rejected negative platform rate");
    passed++;
  }

  try {
    validateCommissionRates(10, -1);
    console.error("[FAIL] Failed to throw error for negative POC rate");
    failed++;
  } catch (err) {
    console.log("[PASS] Correctly rejected negative POC rate");
    passed++;
  }

  try {
    validateCommissionRates(80, 25);
    console.error("[FAIL] Failed to throw error for platform + poc >= 100%");
    failed++;
  } catch (err) {
    console.log("[PASS] Correctly rejected platform + poc >= 100%");
    passed++;
  }

  console.log("==========================================");
  console.log(`TOTAL RESULT: ${passed} PASSED, ${failed} FAILED`);
  console.log("==========================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
