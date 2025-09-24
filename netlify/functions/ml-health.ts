import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
  const timeout = 3000; // 3 second timeout

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: ''
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(`${ML_SERVICE_URL}/`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (response.ok) {
        const data = await response.json();
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            status: 'healthy',
            service: data.message || 'ml-service',
            version: data.version || '1.0.0',
            timestamp: new Date().toISOString(),
            uptime: data.uptime,
            model_loaded: data.model_loaded || true,
            message: 'ML service is operational'
          })
        };
      } else {
        return {
          statusCode: response.status,
          headers,
          body: JSON.stringify({
            status: 'degraded',
            service: 'ml-service',
            timestamp: new Date().toISOString(),
            message: `ML service returned status ${response.status}`,
            error: await response.text()
          })
        };
      }
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        throw new Error(`Connection timed out after ${timeout}ms`);
      }
      throw fetchError;
    }
  } catch (error) {
    return {
      statusCode: 200, // Return 200 even if ML service is down to prevent cascading failures
      headers,
      body: JSON.stringify({
        status: 'degraded',
        service: 'ml-service',
        timestamp: new Date().toISOString(),
        message: 'ML service is degraded but fallbacks are active',
        error_message: error.message,
        fallback_active: true,
        model_loaded: false
      })
    };
  }
};
