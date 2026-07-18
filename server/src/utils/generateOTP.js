import crypto from "crypto";

const generateOTP = () => {
  // Generates a random 6-digit number as a string (100000 to 999999)
  const num = crypto.randomInt(100000, 1000000);
  return String(num);
};

export default generateOTP;
