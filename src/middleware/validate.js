export const validate = (req, res, next) => {
  const errors = [];
  if (req.body.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(req.body.email)) {
      errors.push({ param: 'email', msg: 'Invalid email format' });
    }
  }
  if (req.body.password && req.body.password.length < 6) {
    errors.push({ param: 'password', msg: 'Password must be at least 6 characters' });
  }
  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }
  next();
};
