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
} from "@shared/schema";

/**
 * HTTP client for communicating with the Python ML FastAPI service
 */
export class MLServiceClient {
  private baseUrl: string;
  private timeout: number;
  private fallbackEnabled: boolean;

  constructor() {
    this.baseUrl = process.env.ML_SERVICE_URL || "http://localhost:8000";
    this.timeout = parseInt(process.env.ML_SERVICE_TIMEOUT || "30000");
    // Fallbacks are safe in development, but default to disabled in production unless explicitly enabled
    const envFlag = (process.env.ML_FALLBACK_ENABLED || '').toLowerCase();
    const explicit = envFlag === 'true' || envFlag === '1' || envFlag === 'yes';
    this.fallbackEnabled = explicit || process.env.NODE_ENV !== 'production';
  }

  /**
   * Check if ML service is healthy
   */
  async healthCheck(): Promise<MLHealthResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/`, {
        method: "GET",
        signal: AbortSignal.timeout(5000), // Short timeout for health checks
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
        model_loaded: true, // Assume loaded if service responds
        ...data
      });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') console.error("ML service health check failed:", error);
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
      if (process.env.NODE_ENV === 'development') console.log(`🧠 Requesting ML prediction for fixture ${request.fixture_id}: ${request.home_team_name} vs ${request.away_team_name}`);
      
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
      const validatedResponse = mlPredictionResponseSchema.parse(data);
      
      if (process.env.NODE_ENV === 'development') console.log(`✅ ML prediction successful: ${validatedResponse.predicted_outcome} (confidence: ${Math.round(validatedResponse.confidence * 100)}%)`);
      return validatedResponse;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') console.error("ML prediction failed:", error);
      return null;
    }
  });
  }

  /**
   * Get batch predictions for multiple matches
   */
  async predictBatch(request: MLBatchPredictionRequest): Promise<MLPredictionResponse[]> {
    return this.withRetries(async () => {
      if (process.env.NODE_ENV === 'development') console.log(`🧠 Requesting ML batch predictions for ${request.requests.length} matches`);
      
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
      const validatedResponses = predictionsArray.map((pred: any) => mlPredictionResponseSchema.parse(pred));
      
      if (process.env.NODE_ENV === 'development') console.log(`✅ ML batch predictions successful: ${validatedResponses.length} predictions generated`);
      return validatedResponses;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') console.error("ML batch prediction failed:", error);
      return [];
    }
  });
  }

  /**
   * Trigger model training
   */
  async trainModel(request: MLTrainingRequest): Promise<boolean> {
    return this.withRetries(async () => {
      if (process.env.NODE_ENV === 'development') console.log(`🏋️ Requesting ML model training: ${request.start_date} to ${request.end_date}`);
      
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

      if (process.env.NODE_ENV === 'development') console.log(`✅ ML model training initiated successfully`);
      return true;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') console.error("ML model training failed:", error);
      return false;
    }
  });
  }

  /**
   * Get model status and metrics
   */
  async getModelStatus(): Promise<MLModelStatusResponse | null> {
    return this.withRetries(async () => {
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
      if (process.env.NODE_ENV === 'development') console.error("ML model status check failed:", error);
      return null;
    }
  });
  }

  /**
   * Generate fallback prediction when ML service is unavailable
   */
  generateFallbackPrediction(request: MLPredictionRequest): MLPredictionResponse {
    if (process.env.NODE_ENV === 'development') console.log(`🔄 Generating fallback prediction for fixture ${request.fixture_id}`);
    
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