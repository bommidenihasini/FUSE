function checkPolicy(actionCount) {
  if (actionCount <= 3) {
    return {
      allowed: true,
      reason: "Action allowed"
    };
  }

  return {
    allowed: false,
    reason: "Repeated action limit exceeded"
  };
}

module.exports = { checkPolicy };