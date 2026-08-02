-- No-op (migration ordering fix).
-- Original SQL dropped indexes / added FKs on tables that are created in
-- 20260531120000_platform_upgrade. Those changes are already applied there.
-- Init (20260530200231) already defines core Package/Booking/Inquiry FKs.

SELECT 1;
