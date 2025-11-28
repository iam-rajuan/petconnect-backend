module.exports = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body); // sanitized & validated
    next();
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.errors?.[0]?.message || "Validation failed",
      issues: err.errors,
    });
  }
};
