export function notFound(req, res, next) {
  const error = new Error(`Route introuvable: ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
}

export function errorHandler(err, req, res, next) {
  const status = err.statusCode || err.status || (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500);
  if (process.env.NODE_ENV !== 'test') {
    console.error(`[ERROR] ${req.method} ${req.originalUrl}`, err.message);
  }
  res.status(status).json({
    message: err.message || 'Erreur serveur',
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
  });
}
