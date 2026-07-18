/**
 * Validates a password against complexity requirements:
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 * 
 * @param {string} password 
 * @returns {string|null} Error message if weak, null if valid.
 */
export const validatePassword = (password) => {
  if (!password) {
    return "Password is required";
  }

  const minLength = 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  if (password.length < minLength) {
    return "Password must be at least 8 characters long";
  }
  if (!hasUppercase) {
    return "Password must contain at least one uppercase letter";
  }
  if (!hasLowercase) {
    return "Password must contain at least one lowercase letter";
  }
  if (!hasNumber) {
    return "Password must contain at least one digit (0-9)";
  }
  if (!hasSpecial) {
    return "Password must contain at least one special character (e.g., @, $, !, #, %)";
  }

  return null;
};

export default validatePassword;
