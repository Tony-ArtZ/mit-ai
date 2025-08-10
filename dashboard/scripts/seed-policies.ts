#!/usr/bin/env node

import db from "../db/index.ts";
import { compliancePolicies } from "../db/schema.ts";

const defaultPolicies = [
  {
    name: "PII Data Detection",
    description: "Detects potential personally identifiable information in logs",
    category: "data_privacy",
    severity: "high",
    rule_config: {
      type: "data_detection",
      parameters: {
        data_types: ["email", "ssn", "credit_card", "phone"],
        fields: ["prompt", "response", "user_input", "tool_input", "tool_output"]
      }
    }
  },
  {
    name: "Excessive Token Usage",
    description: "Flags sessions with unusually high token consumption",
    category: "operational",
    severity: "medium",
    rule_config: {
      type: "threshold",
      parameters: {
        field: "llm_usage.total_tokens",
        threshold: 10000,
        operator: "gt"
      }
    }
  },
  {
    name: "Error Rate Threshold",
    description: "Monitors sessions with high error rates",
    category: "operational",
    severity: "high",
    rule_config: {
      type: "threshold",
      parameters: {
        field: "error_count",
        threshold: 5,
        operator: "gte"
      }
    }
  },
  {
    name: "Sensitive Keywords",
    description: "Detects sensitive keywords in communications",
    category: "security",
    severity: "critical",
    rule_config: {
      type: "pattern_match",
      parameters: {
        patterns: [
          "\\b(password|secret|key|token|api[-_]?key)\\b",
          "\\b(confidential|classified|restricted)\\b",
          "\\b(ssn|social security)\\b"
        ],
        fields: ["prompt", "response", "user_input"]
      }
    }
  },
  {
    name: "Long Session Duration",
    description: "Flags sessions that run for unusually long periods",
    category: "operational",
    severity: "low",
    rule_config: {
      type: "threshold",
      parameters: {
        field: "elapsed_time",
        threshold: 3600, // 1 hour
        operator: "gt"
      }
    }
  },
  {
    name: "GDPR Compliance Check",
    description: "Ensures data handling complies with GDPR requirements",
    category: "regulatory",
    severity: "critical",
    rule_config: {
      type: "pattern_match",
      parameters: {
        patterns: [
          "\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b", // Email addresses
          "\\b\\d{1,2}[/-]\\d{1,2}[/-]\\d{4}\\b" // Dates that might be birthdates
        ],
        fields: ["prompt", "response", "user_input", "tool_input", "tool_output"]
      }
    }
  }
];

async function seedPolicies() {
  try {
    console.log("Seeding compliance policies...");
    
    for (const policy of defaultPolicies) {
      await db.insert(compliancePolicies).values({
        name: policy.name,
        description: policy.description,
        category: policy.category,
        severity: policy.severity,
        rule_config: policy.rule_config,
        is_active: true
      });
      console.log(`Created policy: ${policy.name}`);
    }
    
    console.log("✅ Successfully seeded compliance policies!");
  } catch (error) {
    console.error("❌ Failed to seed policies:", error);
  } finally {
    process.exit(0);
  }
}

seedPolicies();
