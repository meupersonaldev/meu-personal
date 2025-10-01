-- Add payment_source column to bookings table
-- This tracks how the booking is being paid for

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS payment_source VARCHAR(50) DEFAULT 'student_credits';

-- Add comment for documentation
COMMENT ON COLUMN bookings.payment_source IS 'Payment source: student_credits (aluno paga com créditos), teacher_credits (professor paga), academy_guest (academia libera como cortesia)';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_bookings_payment_source ON bookings(payment_source);
