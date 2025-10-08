import { 
  MLPredictionRequest, 
  MLPredictionResponse, 
  MLBatchPredictionRequest,
  MLTrainingRequest,
  MLHealthResponse,
  MLModelStatusResponse,
  mlPredictionResponseSchema,
  mlHealthResponseSchema,
  mlModelStatusResponseSchema
} from "../../shared/schema.js";
import { logger } from "../middleware/logger.js";

/**
 * HTTP client for communicating with the Python ML FastAPI service
 */
export class MLServiceClient {
  private baseUrl: string;
  private timeout: number;
  private fallbackEnabled: boolean;

  constructor() {
    // Prefer 127.0.0.1 to avoid potential IPv6 localhost resolution issues on Windows
    const defaultUrl = "http://127.0.0.1:8000";
    const envUrlRaw = process.env.ML_SERVICE_URL || defaultUrl;
    // Strip inline comments and trim
    const envUrlClean = envUrlRaw.split('#')[0].trim();
    // Prefer IPv4 localhost to avoid Windows IPv6 quirks
    this.baseUrl = (envUrlClean || defaultUrl).replace("localhost", "127.0.0.1");
    this.timeout = parseInt(process.env.ML_SERVICE_TIMEOUT || "30000");
    
    // PRODUCTION MODE: Fallbacks are STRICTLY DISABLED in production
    // Only use real ML predictions from the deployed service
    const isProduction = process.env.NODE_ENV === 'production';
    const envFlag = (process.env.ML_FALLBACK_ENABLED || '').toLowerCase();
    const explicitlyEnabled = envFlag === 'true' || envFlag === '1' || envFlag === 'yes';
    
    // In production, fallback is ALWAYS disabled regardless of env var
    // In development, fallback is enabled by default unless explicitly disabled
    this.fallbackEnabled = isProduction ? false : (explicitlyEnabled || envFlag !== 'false');
    
    if (isProduction && explicitlyEnabled) {
      logger.warn('ML_FALLBACK_ENABLED is set to true in production - this will be ignored. Production ALWAYS uses real ML predictions.');
    }
    
    logger.info({ 
      baseUrl: this.baseUrl, 
      fallbackEnabled: this.fallbackEnabled,
      environment: process.env.NODE_ENV 
    }, 'ML Service Client initialized');
  }

  /**
   * Check if ML service is healthy
   */
  async healthCheck(): Promise<MLHealthResponse> {
    // Use shorter timeout for health checks to avoid blocking
    const healthTimeoutMs = parseInt(process.env.ML_SERVICE_HEALTH_TIMEOUT || '2000', 10);
    try {
      const tryHealth = async (url: string) => {
        const response = await fetch(`${url}/`, {
          method: "GET",
          signal: AbortSignal.timeout(healthTimeoutMs),
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`Health check failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return mlHealthResponseSchema.parse({
          status: response.ok ? "healthy" : "unhealthy",
          service: "SabiScore ML API",
          version: data.version || "1.0.0",
          model_loaded: true,
          ...data
        });
      };

      // Only 1 retry for health checks to avoid blocking
      return await this.withRetries<MLHealthResponse>(async () => {
        try {
          return await tryHealth(this.baseUrl);
        } catch (e) {
          // Automatic fallback from localhost -> 127.0.0.1 if needed
          if (this.baseUrl.includes("localhost")) {
            const alt = this.baseUrl.replace("localhost", "127.0.0.1");
            return await tryHealth(alt);
          }
          throw e;
        }
      }, 1, 200);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        const msg = error instanceof Error ? error.message : String(error);
        logger.warn({ err: msg }, "ML service health check failed");
      }
      return {
        status: "unhealthy",
        service: "SabiScore ML API",
        version: "unknown",
        model_loaded: false,
        error_message: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Get single match prediction
   */
  async predict(request: MLPredictionRequest): Promise<MLPredictionResponse | null> {
    return this.withRetries(async () => {
      try {
      if (process.env.NODE_ENV === 'development') {
        logger.debug({ fixtureId: request.fixture_id, home: request.home_team_name, away: request.away_team_name }, "Requesting ML prediction");
      }
      
      const response = await fetch(`${this.baseUrl}/predict`, {
        method: "POST",
        signal: AbortSignal.timeout(this.timeout),
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`Prediction failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const serviceLatencyHeader = response.headers.get("x-service-latency-ms");
      const serviceLatencyMs = serviceLatencyHeader ? parseInt(serviceLatencyHeader, 10) : undefined;
      const validatedResponse = mlPredictionResponseSchema.parse({
        ...data,
        service_latency_ms: data.service_latency_ms ?? serviceLatencyMs
      });
      if (process.env.NODE_ENV === 'development') {
        logger.debug({ outcome: validatedResponse.predicted_outcome, confidencePct: Math.round(validatedResponse.confidence * 100) }, "ML prediction successful");
        if ('latency_ms' in validatedResponse) {
          logger.debug({ latencyMs: (validatedResponse as any).latency_ms }, "ML latency");
        }
        if ('model_calibrated' in validatedResponse) {
          logger.debug({ calibration: (validatedResponse as any).calibration }, "ML calibration");
        }
      }
      return validatedResponse;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        logger.warn({ err: error instanceof Error ? error.message : String(error) }, "ML prediction failed");
      }
      return null;
    }
  });
  }

  /**
   * Get batch predictions for multiple matches
   */
  async predictBatch(request: MLBatchPredictionRequest): Promise<MLPredictionResponse[]> {
    return this.withRetries(async () => {
      try {
      if (process.env.NODE_ENV === 'development') logger.debug({ count: request.requests.length }, "Requesting ML batch predictions");
      
      const response = await fetch(`${this.baseUrl}/predictions/batch`, {
        method: "POST",
        signal: AbortSignal.timeout(this.timeout * 2), // Longer timeout for batch
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request.requests),
      });

      if (!response.ok) {
        throw new Error(`Batch prediction failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Handle different response formats - FastAPI returns {predictions: [...]}
      const predictionsArray = Array.isArray(data) ? data : data.predictions || [];
      const validatedResponses: MLPredictionResponse[] = predictionsArray.map((pred: any) => {
        const headerLatency = response.headers.get("x-service-latency-ms");
        const serviceLatency = headerLatency ? parseInt(headerLatency, 10) : undefined;
        return mlPredictionResponseSchema.parse({
          ...pred,
          service_latency_ms: pred.service_latency_ms ?? serviceLatency
        });
      });
      if (process.env.NODE_ENV === 'development') {
        logger.debug({ generated: validatedResponses.length }, "ML batch predictions successful");
        validatedResponses.forEach((resp, i) => {
          if ('latency_ms' in resp) {
            logger.debug({ index: i, latencyMs: (resp as any).latency_ms }, "ML latency");
          }
          if ('model_calibrated' in resp) {
            logger.debug({ index: i, calibration: (resp as any).calibration }, "ML calibration");
          }
        });
      }
      return validatedResponses;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        logger.warn({ err: error instanceof Error ? error.message : String(error) }, "ML batch prediction failed");
      }
      return [];
    }
  });
  }

  /**
   * Trigger model training
   */
  async trainModel(request: MLTrainingRequest): Promise<boolean> {
    return this.withRetries(async () => {
      try {
      if (process.env.NODE_ENV === 'development') logger.info({ start: request.start_date, end: request.end_date }, "Requesting ML model training");
      
      const response = await fetch(`${this.baseUrl}/train`, {
        method: "POST",
        signal: AbortSignal.timeout(120000), // 2 minute timeout for training
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`Training failed: ${response.status} ${response.statusText}`);
      }

      if (process.env.NODE_ENV === 'development') logger.info("ML model training initiated successfully");
      return true;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        logger.warn({ err: error instanceof Error ? error.message : String(error) }, "ML model training failed");
      }
      return false;
    }
  });
  }

  /**
   * Get model status and metrics
   */
  async getModelStatus(): Promise<MLModelStatusResponse | null> {
    return this.withRetries(async () => {
      try {
      const response = await fetch(`${this.baseUrl}/model/status`, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Model status check failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return mlModelStatusResponseSchema.parse(data);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        logger.warn({ err: error instanceof Error ? error.message : String(error) }, "ML model status check failed");
      }
      return null;
    }
  });
  }

  /**
   * Generate fallback prediction when ML service is unavailable
   */
  generateFallbackPrediction(request: MLPredictionRequest): MLPredictionResponse {
    if (process.env.NODE_ENV === 'development') logger.debug({ fixtureId: request.fixture_id }, "Generating fallback prediction");
    
    return {
      fixture_id: request.fixture_id,
      predicted_outcome: "draw",
      probabilities: {
        home: 0.42,
        draw: 0.31,
        away: 0.27
      },
      confidence: 0.35,
      expected_goals: {
        home: 1.4,
        away: 1.2
      },
      additional_markets: {
        both_teams_score: 0.65,
        over_2_5_goals: 0.48,
        under_2_5_goals: 0.52
      },
      key_features: [
        {
          name: "Home Advantage",
          value: 0.15,
          impact: "Positive",
          description: "Standard home advantage factor"
        },
        {
          name: "Fallback Mode",
          value: 1.0,
          impact: "Neutral", 
          description: "ML service unavailable - using statistical fallback"
        }
      ],
      model_version: "fallback-v1.0",
      model_trained: false,
      explanation: "Prediction generated using statistical fallback due to ML service unavailability"
    };
  }

  /** Whether fallback predictions are permitted for this environment */
  isFallbackAllowed(): boolean {
    return this.fallbackEnabled;
  }
  /**
   * Exponential backoff retry wrapper for transient errors
   */
  private async withRetries<T>(fn: () => Promise<T>, maxAttempts = 3, baseDelay = 500): Promise<T> {
    let attempt = 0;
    let lastError: any;
    while (attempt < maxAttempts) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        // Only retry on network or timeout errors
        if (error.name === 'AbortError' || error.message?.includes('timeout') || error.message?.includes('network')) {
          const delay = baseDelay * Math.pow(2, attempt);
          if (process.env.NODE_ENV === 'development') console.warn(`ML request failed (attempt ${attempt + 1}/${maxAttempts}), retrying in ${delay}ms...`, error);
          await new Promise(res => setTimeout(res, delay));
          attempt++;
        } else {
          throw error;
        }
      }
    }
    throw lastError;
  }
}

// Export singleton instance
export const mlClient = new MLServiceClient();