import { listDatasetQuestions } from "../services/dataset.service.js";

export const getMongoDatasetQuestions = async (req, res, next) => {
  try {
    const limit = Number(req.query.limit) || 100;
    const results = await listDatasetQuestions({ limit });

    return res.json({
      source: "mongodb",
      dataset: "greengerong/leetcode",
      count: results.length,
      results,
    });
  } catch (error) {
    return next(error);
  }
};
