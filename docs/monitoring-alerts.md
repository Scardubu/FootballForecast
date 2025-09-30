# Monitoring & Alerts

## Objectives
- Detect outages, latency regressions, and ML degradation early
- Provide clear runbooks and ownership for response

## Application Monitoring
- Health endpoints:
  - Web: `GET /api/health`
  - ML: `GET /health`
- Suggested external monitors:
  - UptimeRobot or BetterStack ping checks every 1 min
  - Alert if 2+ consecutive failures

## Performance & Telemetry
- Track in-app telemetry via `/api/predictions/telemetry`
- Define SLOs:
  - API p95 latency < 300ms
  - ML p95 latency < 800ms
  - Fallback ratio < 10%
  - Calibration rate > 80%

## Logging
- Structured logs with `pino`
- Capture request IDs and correlation IDs
- Store logs in Render (or stream to external provider)

## Alerting
- Threshold-based alerts from monitoring provider
- Pager/Email/Slack channels for severity levels

## Dashboards (Optional)
- Grafana or APM (if adopted) for latency/throughput/error rate

## Incident Response
- Declare incident in chat channel
- Follow runbook steps
- Postmortem within 48 hours
