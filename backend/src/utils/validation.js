const httpError = require('./httpError');

function validate(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse({ body: req.body, query: req.query, params: req.params });
    if (!result.success) {
      const message = result.error.issues.map((issue) => {
        const field = issue.path.slice(1).join('.');
        return field ? `${field}: ${issue.message}` : issue.message;
      }).join('; ');
      return next(httpError(400, message));
    }
    req.validated = result.data;
    next();
  };
}

module.exports = validate;
