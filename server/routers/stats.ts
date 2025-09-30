import { Router } from 'express';
import { asyncHandler } from '../middleware/index.js';

export const statsRouter = Router();

// Placeholder for real stats from the database
const getPlatformStats = async () => {
  return {
    leaguesCovered: 1100,
    aiAccuracy: 82,
    updateIntervalSeconds: 15,
    dataSources: 5,
    modelAccuracy: 82.4,
    totalPredictions: 1247,
    correctPredictions: 1027,
    incorrectPredictions: 220,
    dataQuality: {
      xgDataCoverage: 94,
      teamFormData: 98,
      injuryReports: 76,
      h2hHistory: 89,
    },
  };
};

statsRouter.get('/', asyncHandler(async (req, res) => {
  const stats = await getPlatformStats();
  res.json(stats);
}));
