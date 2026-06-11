export function errorHandler(err, req, res, next) {
  console.error('Error:', err)
  
  // Postgres unique constraint violation
  if (err.code === '23505') {
    return res.status(400).json({
      message: 'A record with this value already exists',
    })
  }
  
  // Postgres foreign key violation
  if (err.code === '23503') {
    return res.status(400).json({
      message: 'Referenced record does not exist',
    })
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      message: 'Invalid token',
    })
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      message: 'Token expired',
    })
  }
  
  // Service-not-configured errors (AI / video) -> 503 with a clear message,
  // including when services have wrapped the original error message
  if (err.code === 'AI_NOT_CONFIGURED' || err.code === 'VIDEO_NOT_CONFIGURED' ||
      /not configured on this server/i.test(err.message || '')) {
    return res.status(503).json({
      message: (err.message || '').match(/[A-Za-z].*not configured on this server[^.]*\./)?.[0]
        || 'This feature is not configured on this server.',
      code: err.code || 'SERVICE_NOT_CONFIGURED',
    })
  }

  // Default error
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  })
}
