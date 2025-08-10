# Compliance Pack Feature Documentation

## Overview

The Compliance Pack is a comprehensive system for monitoring policy violations and generating audit reports in the AI agent dashboard. It provides automated compliance checking, violation tracking, and audit report generation capabilities.

## System Components

### 1. Database Schema

#### Compliance Policies (`compliance_policies`)

- **Purpose**: Store compliance rules and policies
- **Key Fields**:
  - `name`: Policy name (e.g., "PII Data Detection")
  - `category`: Type of policy (`data_privacy`, `security`, `regulatory`, `operational`)
  - `severity`: Impact level (`low`, `medium`, `high`, `critical`)
  - `rule_config`: JSON configuration defining the rule logic
  - `is_active`: Whether the policy is currently enforced

#### Compliance Violations (`compliance_violations`)

- **Purpose**: Track detected policy violations
- **Key Fields**:
  - `session_id`: Links to the session where violation occurred
  - `policy_id`: References the violated policy
  - `violation_type`: Type of violation (e.g., "pii_exposure", "token_threshold")
  - `description`: Human-readable description of the violation
  - `context`: Additional data about the violation
  - `resolved`: Whether the violation has been addressed
  - `detected_at`: When the violation was detected

#### Audit Reports (`audit_reports`)

- **Purpose**: Store generated compliance reports
- **Key Fields**:
  - `name`: Report name
  - `report_type`: Type of report (`compliance`, `security`, `performance`, `full_audit`)
  - `date_range_start/end`: Time period covered
  - `summary`: Aggregated statistics
  - `violations_count`: Number of violations in the report

### 2. Compliance Checker (`lib/compliance-checker.ts`)

#### How It Works:

1. **Policy Loading**: Loads active policies from the database
2. **Real-time Checking**: Evaluates each log entry against all policies
3. **Rule Types**:
   - **Pattern Match**: Detects specific patterns (e.g., email addresses, sensitive keywords)
   - **Data Detection**: Identifies PII and sensitive data types
   - **Threshold**: Monitors numeric values (e.g., token usage, session duration)
   - **Custom**: Extensible for custom rule logic

#### Integration:

- Automatically triggered when new log entries are received
- Runs asynchronously to avoid impacting logging performance
- Records violations automatically in the database

### 3. Dashboard Interface

#### Compliance Section Features:

- **Metrics Overview**:

  - Compliance score calculation
  - Active policies count
  - Violations by severity and category
  - Resolution rates and trends

- **Violations Management**:

  - Filter by severity and resolution status
  - View detailed violation information
  - Mark violations as resolved
  - Track resolution notes and timestamps

- **Policy Management**:

  - View all compliance policies
  - Create new policies with different rule types
  - Enable/disable policies
  - Category and severity management

- **Audit Reports**:
  - Generate reports for specific date ranges
  - Multiple report types (compliance, security, performance)
  - Export reports as CSV files
  - Track report generation history

### 4. API Endpoints

#### `/api/compliance` (GET)

- Returns violations, policies, and metrics
- Used by the dashboard to display compliance data

#### `/api/compliance/reports` (GET/POST)

- GET: Retrieve existing audit reports
- POST: Generate new audit reports

#### `/api/compliance/export/[id]` (GET)

- Export specific audit report as CSV
- Updates report status to "exported"

#### `/api/compliance/policies` (POST)

- Create new compliance policies
- Validates policy configuration

### 5. Automated Features

#### Real-time Compliance Checking:

```typescript
// Triggered on every log entry
await complianceChecker.checkLogEntry(logEntry);
```

#### Policy Examples:

1. **PII Detection**: Scans for emails, SSNs, phone numbers
2. **Token Usage**: Monitors excessive AI model usage
3. **Error Rates**: Tracks high error frequencies
4. **Sensitive Keywords**: Detects security-related terms
5. **Session Duration**: Flags unusually long sessions
6. **GDPR Compliance**: Ensures data handling compliance

## Usage Instructions

### Creating a New Policy:

1. Click "Add Policy" in the Compliance dashboard
2. Fill in policy details:
   - Name and description
   - Category (data_privacy, security, etc.)
   - Severity level
3. The system creates a basic custom policy that can be enhanced

### Generating an Audit Report:

1. Click "Generate Report" in the Compliance dashboard
2. Specify:
   - Report name
   - Report type (compliance, security, etc.)
   - Date range for analysis
3. The system:
   - Queries violations in the specified period
   - Calculates summary statistics
   - Creates a downloadable report
   - Stores the report for future reference

### Monitoring Violations:

1. View violations in the Compliance dashboard
2. Filter by severity or resolution status
3. Click on violations to see detailed information
4. Mark violations as resolved with notes

### Exporting Data:

1. Generate or select an existing audit report
2. Click "Export" to download as CSV
3. CSV includes all violation details for the report period

## Configuration

### Default Policies (Seeded):

- PII Data Detection (High severity)
- Excessive Token Usage (Medium severity)
- Error Rate Threshold (High severity)
- Sensitive Keywords (Critical severity)
- Long Session Duration (Low severity)
- GDPR Compliance Check (Critical severity)

### Compliance Score Calculation:

- Resolution Rate (60% weight): Percentage of resolved violations
- Severity Score (40% weight): Based on violation severity distribution
- Scale: 0-100 (higher is better)
- Trend: "improving", "stable", or "declining"

## Integration with Logging

The compliance system automatically integrates with the existing logging infrastructure:

1. **Log Entry Processing**: Every log entry is automatically checked
2. **Asynchronous Checking**: Compliance checking doesn't block log processing
3. **Context Preservation**: Violations maintain links to original log entries
4. **Session Tracking**: Violations are associated with specific sessions

## Benefits

1. **Automated Monitoring**: No manual compliance checking required
2. **Real-time Detection**: Violations detected as they occur
3. **Audit Trail**: Complete history of compliance events
4. **Regulatory Compliance**: Helps meet GDPR, SOX, and other requirements
5. **Risk Management**: Early detection of potential issues
6. **Reporting**: Easy generation of compliance reports for stakeholders

## Extensibility

The system is designed to be extensible:

1. **Custom Rules**: Add new rule types in the compliance checker
2. **Policy Templates**: Create reusable policy configurations
3. **Integration Points**: Hook into external compliance systems
4. **Custom Metrics**: Add organization-specific compliance measurements
5. **Notification Systems**: Integrate with alerting for critical violations

This compliance system provides a comprehensive foundation for maintaining regulatory compliance and monitoring AI agent behavior in production environments.
