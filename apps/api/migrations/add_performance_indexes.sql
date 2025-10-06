-- Performance Indexes for Phase 1
-- Optimizes queries for balances, transactions, and booking operations

BEGIN;

-- Student Class Balance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_class_balance_student_unit 
ON public.student_class_balance(student_id, unit_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_class_balance_available 
ON public.student_class_balance(student_id, unit_id) 
WHERE (total_purchased - total_consumed - locked_qty) > 0;

-- Student Class Transaction indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_class_tx_student_unit_type 
ON public.student_class_tx(student_id, unit_id, type);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_class_tx_student_created 
ON public.student_class_tx(student_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_class_tx_unlock_at_pending 
ON public.student_class_tx(unlock_at) 
WHERE type = 'LOCK' AND unlock_at IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_class_tx_booking_type 
ON public.student_class_tx(booking_id, type) 
WHERE booking_id IS NOT NULL;

-- Professor Hour Balance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prof_hour_balance_professor_unit 
ON public.prof_hour_balance(professor_id, unit_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prof_hour_balance_available 
ON public.prof_hour_balance(professor_id, unit_id) 
WHERE (available_hours - locked_hours) > 0;

-- Hour Transaction indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hour_tx_professor_unit_type 
ON public.hour_tx(professor_id, unit_id, type);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hour_tx_professor_created 
ON public.hour_tx(professor_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hour_tx_unlock_at_pending 
ON public.hour_tx(unlock_at) 
WHERE type = 'BONUS_LOCK' AND unlock_at IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hour_tx_booking_type 
ON public.hour_tx(booking_id, type) 
WHERE booking_id IS NOT NULL;

-- Payment Intents indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_intents_actor_status 
ON public.payment_intents(actor_user_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_intents_unit_status_created 
ON public.payment_intents(unit_id, status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_intents_provider_status 
ON public.payment_intents(provider, status);

-- Units indexes for location queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_units_city_state_active 
ON public.units(city, state, is_active) 
WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_units_franchise_active 
ON public.units(franchise_id, is_active) 
WHERE is_active = true;

-- Student Packages indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_packages_unit_status_price 
ON public.student_packages(unit_id, status, price_cents);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_packages_unit_classes 
ON public.student_packages(unit_id, classes_qty) 
WHERE status = 'active';

-- Hour Packages indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hour_packages_unit_status_price 
ON public.hour_packages(unit_id, status, price_cents);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hour_packages_unit_hours 
ON public.hour_packages(unit_id, hours_qty) 
WHERE status = 'active';

-- Bookings indexes for new schema
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_unit_start_status 
ON public.bookings(unit_id, start_at, status_canonical);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_student_start_status 
ON public.bookings(student_id, start_at DESC, status_canonical);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_professor_start_status 
ON public.bookings(teacher_id, start_at DESC, status_canonical);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_cancellable_until 
ON public.bookings(cancellable_until) 
WHERE status_canonical IN ('RESERVED', 'PAID');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_source_status 
ON public.bookings(source, status_canonical);

-- Audit Logs indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_actor_entity_created 
ON public.audit_logs(actor_user_id, entity, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_entity_created 
ON public.audit_logs(entity, entity_id, created_at DESC);

-- Reviews indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_visible_at_rating 
ON public.reviews(visible_at, rating) 
WHERE visible_at IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_unit_visible 
ON public.reviews(unit_id, visible_at) 
WHERE visible_at IS NOT NULL;

-- Composite indexes for common queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_class_balance_composite 
ON public.student_class_balance(student_id, unit_id, total_purchased, total_consumed, locked_qty);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prof_hour_balance_composite 
ON public.prof_hour_balance(professor_id, unit_id, available_hours, locked_hours);

-- Partial indexes for optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_intents_pending 
ON public.payment_intents(created_at) 
WHERE status = 'PENDING';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_class_tx_locks 
ON public.student_class_tx(unlock_at, student_id) 
WHERE type = 'LOCK' AND unlock_at IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hour_tx_locks 
ON public.hour_tx(unlock_at, professor_id) 
WHERE type = 'BONUS_LOCK' AND unlock_at IS NOT NULL;

COMMIT;