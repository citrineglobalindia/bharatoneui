-- Platform-wide activity logging: triggers on AEPS, BBPS, wallets, registrations,
-- notifications, tickets, Razorpay, site pages and newsletter write every event
-- into public.system_health_log with source='app', alongside scanner health checks.
-- Helper: public.track(module, message, level, detail).
-- Admin views them in Admin -> System Health (filter by module / activity / level).
-- Applied to prod via the MCP; full DDL lives in the production database.
select 1;
