exports.validateEmail = (email) => {
  // Simple email validation
  return /\S+@\S+\.\S+/.test(email);
};