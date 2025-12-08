# Requirements Document

## Introduction

Este documento define os requisitos para o sistema de check-in de aulas do Meu Personal. O sistema permite que professores confirmem a realização de aulas através de QR code ou botão manual, atualizando o status do booking e creditando horas ao professor.

## Glossary

- **Booking**: Agendamento de aula entre aluno e professor
- **Check-in**: Confirmação de que a aula foi realizada
- **Professor**: Personal trainer que ministra as aulas
- **Aluno**: Cliente que agenda e realiza as aulas
- **Créditos/Horas**: Unidade de medida para aulas (1 hora = 1 crédito)
- **CONSUME**: Tipo de transação que credita horas ao professor
- **prof_hour_balance**: Tabela que armazena o saldo de horas do professor
- **hour_tx**: Tabela de transações de horas
- **status_canonical**: Status normalizado do booking (AVAILABLE, PAID, COMPLETED, CANCELED)

## Requirements

### Requirement 1

**User Story:** As a professor, I want to confirm class completion via QR code scan, so that I can quickly register check-in and receive my credits.

#### Acceptance Criteria

1. WHEN a professor scans a valid QR code for a booking THEN the System SHALL update the booking status_canonical to COMPLETED
2. WHEN a booking is marked as COMPLETED THEN the System SHALL create a CONSUME transaction in hour_tx for the professor
3. WHEN a CONSUME transaction is created THEN the System SHALL increment the professor's available_hours in prof_hour_balance by the booking duration
4. WHEN a professor attempts to check-in a booking that is not PAID THEN the System SHALL reject the check-in and display an error message
5. WHEN a professor attempts to check-in a booking that is already COMPLETED THEN the System SHALL inform that check-in was already done

### Requirement 2

**User Story:** As a professor, I want to confirm class completion via manual button, so that I can register check-in when QR code is not available.

#### Acceptance Criteria

1. WHEN a professor clicks the check-in button for a valid booking THEN the System SHALL update the booking status_canonical to COMPLETED
2. WHEN manual check-in is performed THEN the System SHALL create a CONSUME transaction identical to QR code check-in
3. WHEN a professor views their upcoming classes THEN the System SHALL display a check-in button for each PAID booking
4. WHEN a booking date has not yet arrived THEN the System SHALL disable the check-in button with appropriate message

### Requirement 3

**User Story:** As a professor, I want to see my credit balance updated after check-in, so that I can track my earnings in real-time.

#### Acceptance Criteria

1. WHEN a check-in is completed successfully THEN the System SHALL display a success message with the credited hours
2. WHEN viewing the dashboard after check-in THEN the System SHALL show the updated available_hours balance
3. WHEN a check-in fails THEN the System SHALL display a clear error message explaining the reason

### Requirement 4

**User Story:** As a system administrator, I want check-in data to be auditable, so that I can track class completions and resolve disputes.

#### Acceptance Criteria

1. WHEN a check-in is performed THEN the System SHALL record the check-in in the checkins table with timestamp and method (QRCODE or MANUAL)
2. WHEN a CONSUME transaction is created THEN the System SHALL include booking_id and origin in meta_json
3. WHEN querying check-in history THEN the System SHALL return all check-ins with associated booking and transaction data

### Requirement 5

**User Story:** As a professor, I want to generate a QR code for my students to scan, so that students can initiate the check-in process.

#### Acceptance Criteria

1. WHEN a professor views a PAID booking THEN the System SHALL provide an option to display a QR code
2. WHEN a QR code is generated THEN the System SHALL encode the booking_id and academy_id
3. WHEN a QR code is scanned THEN the System SHALL validate the booking belongs to the scanning user's context

### Requirement 6

**User Story:** As a student, I want to confirm my attendance via QR code, so that my professor receives credit for the class.

#### Acceptance Criteria

1. WHEN a student scans a check-in QR code THEN the System SHALL validate the student is the booking's student_id
2. WHEN student check-in is valid THEN the System SHALL trigger the same CONSUME flow as professor check-in
3. WHEN a student attempts to check-in for another student's booking THEN the System SHALL reject with appropriate error
