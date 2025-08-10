#!/usr/bin/env node

import db from "../db/index.ts";
import { complianceViolations, compliancePolicies } from "../db/schema.ts";

const sampleViolations = [
  {
    session_id: "test_session_001",
    violation_type: "pii_exposure",
    description: "Email address detected in user input: john.doe@example.com",
    severity: "high",
    context: {
      field: "user_input",
      pattern: "email",
      location: "user message"
    }
  },
  {
    session_id: "test_session_002", 
    violation_type: "sensitive_keyword",
    description: "Sensitive keyword 'password' detected in prompt",
    severity: "critical",
    context: {
      field: "prompt",
      keyword: "password",
      location: "system prompt"
    }
  },
  {
    session_id: "test_session_003",
    violation_type: "token_threshold",
    description: "Session exceeded token usage threshold (15,000 tokens used)",
    severity: "medium",
    context: {
      field: "llm_usage.total_tokens",
      threshold: 10000,
      actual_value: 15000
    }
  },
  {
    session_id: "test_session_004",
    violation_type: "gdpr_violation", 
    description: "Potential birthdate detected in response without consent",
    severity: "critical",
    context: {
      field: "response",
      pattern: "date",
      gdpr_issue: "processing personal data without consent"
    }
  },
  {
    session_id: "test_session_005",
    violation_type: "session_duration",
    description: "Session exceeded maximum duration (1.5 hours)",
    severity: "low",
    context: {
      field: "elapsed_time",
      threshold: 3600,
      actual_value: 5400
    }
  }
];

async function seedViolations() {
  try {
    console.log("Seeding compliance violations...");
    
    // Get the first few policies to link violations to
    const policies = await db.select().from(compliancePolicies).limit(5);
    
    if (policies.length === 0) {
      console.log("No policies found. Please run seed-policies.js first.");
      return;
    }
    
    for (let i = 0; i < sampleViolations.length; i++) {
      const violation = sampleViolations[i];
      const policy = policies[i % policies.length]; // Cycle through available policies
      
      await db.insert(complianceViolations).values({
        session_id: violation.session_id,
        policy_id: policy.id,
        violation_type: violation.violation_type,
        severity: violation.severity as "low" | "medium" | "high" | "critical",
        description: violation.description,
        context: violation.context,
        resolved: i % 3 === 0, // Mark every third violation as resolved
        resolved_by: i % 3 === 0 ? "admin" : undefined,
        resolved_at: i % 3 === 0 ? new Date() : undefined,
        resolution_notes: i % 3 === 0 ? "Reviewed and approved as false positive" : undefined
      });
      
      console.log(`Created violation: ${violation.violation_type}`);
    }
    
    console.log("✅ Successfully seeded compliance violations!");
  } catch (error) {
    console.error("❌ Failed to seed violations:", error);
  } finally {
    process.exit(0);
  }
}

seedViolations();
