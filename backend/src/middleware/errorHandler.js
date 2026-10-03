function errorHandler(error, _req, res, _next) {
  let statusCode = error.statusCode || error.status || 500;
  let message = error.message;

  if (error.code === 11000) {
    statusCode = 409;
    message = 'A record with this value already exists.';
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(error.errors).map((item) => item.message).join('; ');
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = 'A supplied identifier or value is invalid.';
  } else if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    statusCode = 400;
    message = 'Request body contains invalid JSON.';
  }
  if (statusCode >= 500) message = 'Something went wrong.';

  if (statusCode >= 500) {
    console.error(error);
  }

  res.status(statusCode).json({
    success: false,
    message,
    data: null
  });
}

module.exports = errorHandler;
