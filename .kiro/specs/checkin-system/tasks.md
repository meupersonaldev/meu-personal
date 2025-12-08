# Implementation Plan

- [x] 1. Implement check-in backend endpoint





  - [x] 1.1 Create POST /api/bookings/:id/checkin route in bookings.ts


    - Validate booking exists and belongs to user (teacher or student)
    - Validate booking status_canonical is PAID
    - Return appropriate errors for invalid states
    - _Requirements: 1.1, 1.4, 1.5, 2.1_
  - [x] 1.2 Implement booking status update to COMPLETED


    - Update status_canonical to COMPLETED
    - Update status to COMPLETED
    - Set updated_at timestamp
    - _Requirements: 1.1, 2.1_
  - [x] 1.3 Implement CONSUME transaction creation


    - Create hour_tx record with type CONSUME
    - Include booking_id and origin in meta_json
    - Use balance.service.ts createHourTransaction
    - _Requirements: 1.2, 2.2, 4.2_
  - [x] 1.4 Implement professor balance update


    - Increment available_hours in prof_hour_balance
    - Use balance.service.ts updateProfessorBalance
    - _Requirements: 1.3_
  - [x] 1.5 Implement checkin record creation


    - Insert record in checkins table with method (QRCODE/MANUAL)
    - Record timestamp and status (GRANTED/DENIED)
    - _Requirements: 4.1_
  - [x] 1.6 Write property test for check-in status update






    - **Property 1: Check-in updates booking status to COMPLETED**
    - **Validates: Requirements 1.1, 2.1**
  - [x] 1.7 Write property test for CONSUME transaction






    - **Property 2: Check-in creates CONSUME transaction**
    - **Validates: Requirements 1.2, 2.2, 4.2**
  - [x] 1.8 Write property test for balance update






    - **Property 3: CONSUME transaction increments professor balance**
    - **Validates: Requirements 1.3**

- [x] 2. Implement check-in validations






  - [x] 2.1 Add validation for booking status

    - Reject if status_canonical is not PAID
    - Return INVALID_STATUS error code
    - _Requirements: 1.4_

  - [x] 2.2 Add validation for already completed bookings

    - Check if booking is already COMPLETED
    - Return ALREADY_COMPLETED with informative message
    - _Requirements: 1.5_

  - [x] 2.3 Add validation for future bookings

    - Check if booking date is within tolerance window
    - Use academy's checkin_tolerance setting
    - _Requirements: 2.4_
  - [x] 2.4 Add authorization validation


    - Verify user is teacher_id or student_id of booking
    - Return UNAUTHORIZED for invalid users
    - _Requirements: 5.3, 6.1, 6.3_
  - [x] 2.5 Write property test for invalid status rejection






    - **Property 4: Invalid status check-in rejection**
    - **Validates: Requirements 1.4**
  - [x] 2.6 Write property test for idempotency






    - **Property 5: Check-in idempotency**
    - **Validates: Requirements 1.5**
  - [x] 2.7 Write property test for authorization






    - **Property 6: Check-in authorization validation**
    - **Validates: Requirements 5.3, 6.1, 6.3**

- [x] 3. Checkpoint - Backend tests





  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement frontend check-in button





  - [x] 4.1 Create CheckinButton component


    - Accept bookingId, bookingDate, status props
    - Show loading state during API call
    - Handle success and error callbacks
    - _Requirements: 2.3_
  - [x] 4.2 Add check-in button to professor dashboard


    - Display button for each PAID booking in "Próximas Aulas"
    - Disable button for future bookings outside tolerance
    - Show success toast with credited hours
    - _Requirements: 2.3, 2.4, 3.1, 3.2_

  - [x] 4.3 Update dashboard to refresh balance after check-in

    - Reload hourBalance state after successful check-in
    - Show updated available_hours immediately
    - _Requirements: 3.2_

- [x] 5. Implement QR code functionality





  - [x] 5.1 Create QRCodeGenerator component


    - Generate QR with booking_id and academy_id
    - Use qrcode library or similar
    - _Requirements: 5.1, 5.2_
  - [x] 5.2 Add QR code display option to booking cards


    - Show "Gerar QR" button for PAID bookings
    - Display QR in modal or inline
    - _Requirements: 5.1_

  - [x] 5.3 Update QR scanner to handle check-in flow

    - Parse QR content for booking_id
    - Call check-in endpoint with method QRCODE
    - _Requirements: 1.1, 6.2_
  - [x] 5.4 Write property test for QR code content






    - **Property 8: QR code content validation**
    - **Validates: Requirements 5.2**

- [x] 6. Final Checkpoint - All tests passing





  - Ensure all tests pass, ask the user if questions arise.
