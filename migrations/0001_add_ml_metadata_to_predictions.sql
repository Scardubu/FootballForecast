ALTER TABLE predictions
    ADD COLUMN latency_ms integer,
    ADD COLUMN service_latency_ms integer,
    ADD COLUMN model_calibrated boolean,
    ADD COLUMN calibration_metadata jsonb;
