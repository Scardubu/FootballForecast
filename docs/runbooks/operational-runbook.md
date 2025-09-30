# Operational Runbook

## Quick Links
- Web Health: `/api/health`
- ML Health: `/health`
- Telemetry: `/api/predictions/telemetry`

## Common Issues

### 1) High API Latency
- Check ML latency on telemetry
- Verify DB load and slow queries
- Temporarily increase cache TTLs

### 2) ML Service Down
- Confirm ML health endpoint
- Check Render ML service logs
- Enable fallback predictions in server

### 3) Database Errors
- Verify `DATABASE_URL`
- Check migrations are applied
- Inspect connection pool saturation

## Deployment Issues
- Verify environment variables present
- Rebuild from latest commit
- Rollback in Render Deploys if needed

## Data Ingestion Failures
- Check scraper logs (Python service or worker)
- Fallback to archived CSVs if live sources fail
- Re-run ETL in idempotent mode

## Access & Security
- Rotate tokens in Render dashboard
- Audit logs for suspicious activity

## On-call Handoff
- Capture incident details and actions taken
- Update known issues list
