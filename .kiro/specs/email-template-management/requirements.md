# Requirements Document

## Introduction

This feature provides a management interface for the franqueadora to view and edit email templates used throughout the system. The base template structure (header with logo, footer, layout) remains fixed, while administrators can customize the content, title, and button text of each email type.

## Glossary

- **Email_Template**: A configurable email structure consisting of title, content body, and optional button
- **Template_Base**: The fixed HTML wrapper that includes header, footer, and styling (not editable)
- **Variable**: A placeholder in the format `{{variable_name}}` that gets replaced with actual data at send time
- **Franqueadora_Admin**: Administrator user with access to manage email templates

## Requirements

### Requirement 1

**User Story:** As a franqueadora admin, I want to view all email templates in the system, so that I can understand what emails are being sent to users.

#### Acceptance Criteria

1. WHEN a franqueadora admin navigates to the email templates page THEN the System SHALL display a list of all available email templates with their names and descriptions
2. WHEN displaying the template list THEN the System SHALL show the template name, description, and last modified date for each template
3. WHEN a template is selected THEN the System SHALL display a preview of how the email will look with sample data

### Requirement 2

**User Story:** As a franqueadora admin, I want to edit email template content, so that I can customize the messages sent to users.

#### Acceptance Criteria

1. WHEN editing a template THEN the System SHALL allow modification of the title, content body, and button text
2. WHEN editing content THEN the System SHALL display available variables that can be used in the template
3. WHEN saving changes THEN the System SHALL validate that required fields are not empty
4. WHEN saving changes THEN the System SHALL persist the updated template to the database
5. WHEN editing THEN the System SHALL NOT allow modification of the base template structure (header, footer, layout)

### Requirement 3

**User Story:** As a franqueadora admin, I want to preview email templates before saving, so that I can verify how they will appear to recipients.

#### Acceptance Criteria

1. WHEN editing a template THEN the System SHALL display a real-time preview of the email with sample data
2. WHEN variables are used in the content THEN the System SHALL replace them with example values in the preview
3. WHEN the preview is displayed THEN the System SHALL render the complete email including the fixed header and footer

### Requirement 4

**User Story:** As a franqueadora admin, I want to see available variables for each template, so that I can personalize emails correctly.

#### Acceptance Criteria

1. WHEN editing a template THEN the System SHALL display a list of available variables for that specific template type
2. WHEN displaying variables THEN the System SHALL show the variable name and a description of what it represents
3. WHEN a variable is clicked THEN the System SHALL insert it at the cursor position in the content editor

### Requirement 5

**User Story:** As a franqueadora admin, I want templates to have default values, so that the system works even if I haven't customized them.

#### Acceptance Criteria

1. WHEN a template has not been customized THEN the System SHALL use the default hardcoded values
2. WHEN a template is reset THEN the System SHALL restore the default values for that template
3. WHEN the system sends an email THEN the System SHALL check for custom template first, falling back to default if none exists
