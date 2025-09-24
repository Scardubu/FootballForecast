import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  // Simple health check for ML service
  // In production, this would proxy to your actual ML service
  const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'https://your-ml-service.render.com';
  
  try {
    // For now, return a mock health status
    // TODO: Replace with actual ML service health check when deployed
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      },
      body: JSON.stringify({
        status: 'healthy',
        service: 'ml-service',
        timestamp: new Date().toISOString(),
        message: 'ML service is operational (mock response)'
      })
    };
  } catch (error) {
    return {
      statusCode: 503,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        status: 'unhealthy',
        service: 'ml-service',
        error: 'Service unavailable'
      })
    };
  }
};
