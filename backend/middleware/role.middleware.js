// roleMiddleware(requiredRoleOrArray) - checks req.user.role and permissions
function roleMiddleware(required) {
  return function (req, res, next) {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const role = user.role;

    if (role === 'admin') return next();

    // allow passing array of roles or single role string
    const allowed = Array.isArray(required) ? required : [required];
    if (allowed.includes(role)) return next();

    return res.status(403).json({ error: 'Forbidden' });
  };
}

module.exports = roleMiddleware;
