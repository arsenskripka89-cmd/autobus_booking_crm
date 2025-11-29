module.exports = function roleMiddleware(requiredRole) {
  const hierarchy = { admin: 3, manager: 2, driver: 1 };
  return (req, res, next) => {
    const userRole = req.user?.role;
    if (!userRole) return res.status(401).json({ message: 'Unauthorized' });

    if (requiredRole === 'driver') {
      if (userRole === 'driver' || userRole === 'manager' || userRole === 'admin') return next();
    }

    if (requiredRole === 'manager') {
      if (userRole === 'manager' || userRole === 'admin') return next();
    }

    if (requiredRole === 'admin') {
      if (userRole === 'admin') return next();
    }

    return res.status(403).json({ message: 'Forbidden for your role' });
  };
};
