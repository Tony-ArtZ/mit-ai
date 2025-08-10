import db from "@/db";
import { compliancePolicies, complianceViolations } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { LogEntry, PolicyRuleConfig } from "@/types/logger";

export class ComplianceChecker {
  private static instance: ComplianceChecker;
  private policies: Array<{
    id: number;
    name: string;
    category: string;
    severity: string;
    rule_config: PolicyRuleConfig;
  }> = [];

  private constructor() {
    this.loadPolicies();
  }

  public static getInstance(): ComplianceChecker {
    if (!ComplianceChecker.instance) {
      ComplianceChecker.instance = new ComplianceChecker();
    }
    return ComplianceChecker.instance;
  }

  private async loadPolicies() {
    try {
      const activePolicies = await db
        .select({
          id: compliancePolicies.id,
          name: compliancePolicies.name,
          category: compliancePolicies.category,
          severity: compliancePolicies.severity,
          rule_config: compliancePolicies.rule_config,
        })
        .from(compliancePolicies)
        .where(eq(compliancePolicies.is_active, true));

      this.policies = activePolicies.map((p) => ({
        ...p,
        rule_config: p.rule_config as PolicyRuleConfig,
      }));
    } catch (error) {
      console.error("Failed to load compliance policies:", error);
    }
  }

  public async checkLogEntry(logEntry: LogEntry): Promise<void> {
    for (const policy of this.policies) {
      const violation = await this.evaluatePolicy(logEntry, policy);
      if (violation) {
        await this.recordViolation({
          session_id: logEntry.session_id,
          policy_id: policy.id,
          violation_type: violation.type,
          severity: policy.severity as "low" | "medium" | "high" | "critical",
          description: violation.description,
          context: violation.context,
        });
      }
    }
  }

  private async evaluatePolicy(
    logEntry: LogEntry,
    policy: {
      id: number;
      name: string;
      category: string;
      severity: string;
      rule_config: PolicyRuleConfig;
    }
  ): Promise<{
    type: string;
    description: string;
    context?: Record<string, unknown>;
  } | null> {
    const { rule_config } = policy;

    switch (rule_config.type) {
      case "pattern_match":
        return this.checkPatternMatch(logEntry, policy);
      case "data_detection":
        return this.checkDataDetection(logEntry, policy);
      case "threshold":
        return this.checkThreshold(logEntry, policy);
      case "custom":
        return this.checkCustomRule(logEntry, policy);
      default:
        return null;
    }
  }

  private checkPatternMatch(
    logEntry: LogEntry,
    policy: { rule_config: PolicyRuleConfig }
  ): {
    type: string;
    description: string;
    context?: Record<string, unknown>;
  } | null {
    const patterns = policy.rule_config.parameters.patterns as string[];
    const fields = policy.rule_config.parameters.fields as string[];

    for (const field of fields) {
      const value = this.getFieldValue(logEntry, field);
      if (typeof value === "string") {
        for (const pattern of patterns) {
          const regex = new RegExp(pattern, "i");
          if (regex.test(value)) {
            return {
              type: "pattern_violation",
              description: `Pattern "${pattern}" detected in ${field}`,
              context: {
                field,
                pattern,
                matched_value: value.substring(0, 100), // Truncate for privacy
              },
            };
          }
        }
      }
    }
    return null;
  }

  private checkDataDetection(
    logEntry: LogEntry,
    policy: { rule_config: PolicyRuleConfig }
  ): {
    type: string;
    description: string;
    context?: Record<string, unknown>;
  } | null {
    const dataTypes = policy.rule_config.parameters.data_types as string[];
    const fields = policy.rule_config.parameters.fields as string[];

    for (const field of fields) {
      const value = this.getFieldValue(logEntry, field);
      if (typeof value === "string") {
        for (const dataType of dataTypes) {
          if (this.detectSensitiveData(value, dataType)) {
            return {
              type: "data_exposure",
              description: `Potential ${dataType} detected in ${field}`,
              context: {
                field,
                data_type: dataType,
                // Don't log the actual sensitive data
              },
            };
          }
        }
      }
    }
    return null;
  }

  private checkThreshold(
    logEntry: LogEntry,
    policy: { rule_config: PolicyRuleConfig }
  ): {
    type: string;
    description: string;
    context?: Record<string, unknown>;
  } | null {
    const field = policy.rule_config.parameters.field as string;
    const threshold = policy.rule_config.parameters.threshold as number;
    const operator = policy.rule_config.parameters.operator as string;

    const value = this.getFieldValue(logEntry, field);
    if (typeof value === "number") {
      let violated = false;
      switch (operator) {
        case "gt":
          violated = value > threshold;
          break;
        case "gte":
          violated = value >= threshold;
          break;
        case "lt":
          violated = value < threshold;
          break;
        case "lte":
          violated = value <= threshold;
          break;
      }

      if (violated) {
        return {
          type: "threshold_violation",
          description: `${field} value ${value} violates threshold ${operator} ${threshold}`,
          context: {
            field,
            value,
            threshold,
            operator,
          },
        };
      }
    }
    return null;
  }

  private checkCustomRule(
    _logEntry: LogEntry,
    _policy: { rule_config: PolicyRuleConfig }
  ): {
    type: string;
    description: string;
    context?: Record<string, unknown>;
  } | null {
    // Implement custom rule logic based on policy configuration
    // This is a placeholder for extensible custom rules
    return null;
  }

  private getFieldValue(logEntry: LogEntry, field: string): unknown {
    // Support nested field access with dot notation
    const parts = field.split(".");
    let value: unknown = logEntry;

    for (const part of parts) {
      if (value && typeof value === "object" && part in value) {
        value = (value as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  private detectSensitiveData(text: string, dataType: string): boolean {
    switch (dataType) {
      case "email":
        return /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(text);
      case "ssn":
        return /\b\d{3}-\d{2}-\d{4}\b/.test(text);
      case "credit_card":
        return /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/.test(text);
      case "phone":
        return /\b\d{3}[- ]?\d{3}[- ]?\d{4}\b/.test(text);
      case "ip_address":
        return /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/.test(text);
      default:
        return false;
    }
  }

  private async recordViolation(violation: {
    session_id: string;
    policy_id: number;
    violation_type: string;
    severity: "low" | "medium" | "high" | "critical";
    description: string;
    context?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await db.insert(complianceViolations).values({
        session_id: violation.session_id,
        policy_id: violation.policy_id,
        violation_type: violation.violation_type,
        severity: violation.severity,
        description: violation.description,
        context: violation.context,
        resolved: false,
      });
    } catch (error) {
      console.error("Failed to record compliance violation:", error);
    }
  }

  // Method to refresh policies from database
  public async refreshPolicies(): Promise<void> {
    await this.loadPolicies();
  }
}

// Export singleton instance
export const complianceChecker = ComplianceChecker.getInstance();
