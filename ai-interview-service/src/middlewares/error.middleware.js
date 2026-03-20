export const notFoundHandler = (_req, res) => {
  res.status(404).json({ detail: "Not found" });
};

export const errorHandler = (error, _req, res, _next) => {
  const statusCode = error.statusCode || 500;
  const detail = error.message || "Internal server error";

  res.status(statusCode).json({ detail });
};
