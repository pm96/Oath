/**
 * Security Audit Service
 *
 * Handles audit logging, suspicious activity detection, and security monitoring
 * Requirements: 12.5
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, serverTimestamp, setDoc, Timestamp } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { HabitCompletion, HabitStreak } from "../../types/habit-streaks";

/**
 * Audit event types
 */
export type AuditEventType =
    | "completion_recorded"
    | "completion_validation_failed"
    | "streak_calculated"
    | "streak_validation_failed"
    | "streak_integrity_check_failed"
    | "friend_accessed_streak"
    | "friend_display_validation_failed"
    | "streak_freeze_used"
    | "suspicious_activity_detected"
    | "data_integrity_violation"
    | "unauthorized_access_attempt";

/**
 * Security risk levels
 */
export type SecurityRiskLevel = "low" | "medium" | "high" | "critical";

/**
 * Audit log entry interface
 */
export interface SecurityAuditEntry {
    id: string;
    timestamp: Timestamp;
    userId: string;
    eventType: AuditEventType;
    entityType: "completion" | "streak" | "analytics" | "user";
    entityId: string;
    riskLevel: SecurityRiskLevel;
    details: {
        action: string;
        oldData?: any;
        newData?: any;
        validationErrors?: string[];
        suspiciousFlags?: string[];
        ipAddress?: string;
        userAgent?: string;
        friendId?: string;
        metadata?: Record<string, any>;
    };
    resolved: boolean;
    reviewedBy?: string;
    reviewedAt?: Timestamp;
    notes?: string;
}

/**
 * Suspicious activity pattern interface
 */
export interface SuspiciousActivityPattern {
    userId: string;
    patternType: string;
    occurrences: number;
    firstDetected: Timestamp;
    lastDetected: Timestamp;
    riskScore: number;
    flags: string[];
    autoBlocked: boolean;
}

/**
 * Security metrics interface
 */
export interface SecurityMetrics {
    totalAuditEntries: number;
    suspiciousActivities: number;
    highRiskEvents: number;
    unresolvedIncidents: number;
    topRiskUsers: {
        userId: string;
        riskScore: number;
        incidentCount: number;
    }[];
    commonViolations: {
        type: string;
        count: number;
    }[];
}

/**
 * Security Audit Service Implementation
 */
export class SecurityAuditService {
    private static readonly AUDIT_COLLECTION = "securityAuditLogs";
    private static readonly SUSPICIOUS_PATTERNS_COLLECTION = "suspiciousPatterns";
    private static readonly LOCAL_AUDIT_KEY = "@security_audit_logs";
    private static readonly MAX_LOCAL_ENTRIES = 500;

    /**
     * Create a security audit log entry
     * Requirements: 12.5
     */
    async createAuditEntry(
        userId: string,
        eventType: AuditEventType,
        entityType: "completion" | "streak" | "analytics" | "user",
        entityId: string,
        details: {
            action: string;
            oldData?: any;
            newData?: any;
            validationErrors?: string[];
            suspiciousFlags?: string[];
            ipAddress?: string;
            userAgent?: string;
            friendId?: string;
            metadata?: Record<string, any>;
        },
    ): Promise<void> {
        try {
            const riskLevel = this.calculateRiskLevel(eventType, details);
            const auditId = `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            const sanitizedDetails = this.sanitizeAuditDetails(details);

            const auditEntry: SecurityAuditEntry = {
                id: auditId,
                timestamp: Timestamp.now(),
                userId,
                eventType,
                entityType,
                entityId,
                riskLevel,
                details: sanitizedDetails,
                resolved: riskLevel === "low",
            };

            // Store in Firestore for server-side analysis
            await this.storeAuditEntryRemote(auditEntry);

            // Store locally for immediate access
            await this.storeAuditEntryLocal(auditEntry);

            // Check for suspicious patterns
            if (riskLevel !== "low") {
                await this.analyzeSuspiciousPatterns(userId, eventType, details);
            }

            // Log to console for development
            console.log(`SECURITY AUDIT [${riskLevel.toUpperCase()}]:`, {
                userId,
                eventType,
                entityId,
                action: details.action,
            });

            // Alert on high-risk events
            if (riskLevel === "high" || riskLevel === "critical") {
                await this.alertHighRiskEvent(auditEntry);
            }
        } catch (error) {
            console.error("Failed to create audit entry:", error);
            // Don't throw - audit logging failure shouldn't block operations
        }
    }

    /**
     * Detect and log suspicious activity patterns
     * Requirements: 12.5
     */
    async detectSuspiciousActivity(
        userId: string,
        recentCompletions: HabitCompletion[],
        recentStreaks: HabitStreak[],
    ): Promise<{
        isSuspicious: boolean;
        patterns: string[];
        riskScore: number;
        recommendedAction: "monitor" | "warn" | "restrict" | "block";
    }> {
        try {
            const patterns: string[] = [];
            let riskScore = 0;

            // Pattern 1: Excessive completion frequency
            const now = Date.now();
            const recentCount = recentCompletions.filter(
                (c) => now - c.completedAt.toMillis() < 60 * 60 * 1000, // Last hour
            ).length;

            if (recentCount > 15) {
                patterns.push("Excessive completions in short timeframe");
                riskScore += 30;
            } else if (recentCount > 8) {
                patterns.push("High completion frequency");
                riskScore += 15;
            }

            // Pattern 2: Identical timestamps
            const timestamps = recentCompletions.map((c) => c.completedAt.toMillis());
            const uniqueTimestamps = new Set(timestamps);
            if (uniqueTimestamps.size < timestamps.length * 0.8) {
                patterns.push("Multiple completions with identical timestamps");
                riskScore += 25;
            }

            // Pattern 3: Unrealistic streak growth
            const unrealisticStreaks = recentStreaks.filter(
                (s) => s.currentStreak > 100 && s.milestones.length < 3,
            );
            if (unrealisticStreaks.length > 0) {
                patterns.push("Unrealistic streak growth without milestones");
                riskScore += 40;
            }

            // Pattern 4: Retroactive completion pattern
            const sortedByCreation = [...recentCompletions].sort(
                (a, b) => a.completedAt.toMillis() - b.completedAt.toMillis(),
            );
            const retroactiveCount = sortedByCreation.filter((completion, index) => {
                if (index === 0) return false;
                const prevCompletion = sortedByCreation[index - 1];
                return (
                    completion.completedAt.toMillis() <
                    prevCompletion.completedAt.toMillis()
                );
            }).length;

            if (retroactiveCount > recentCompletions.length * 0.3) {
                patterns.push("High percentage of retroactive completions");
                riskScore += 20;
            }

            // Pattern 5: Multiple timezone usage
            const timezones = new Set(recentCompletions.map((c) => c.timezone));
            if (timezones.size > 3) {
                patterns.push("Completions from multiple timezones");
                riskScore += 15;
            }

            // Determine recommended action based on risk score
            let recommendedAction: "monitor" | "warn" | "restrict" | "block";
            if (riskScore >= 60) {
                recommendedAction = "block";
            } else if (riskScore >= 40) {
                recommendedAction = "restrict";
            } else if (riskScore >= 20) {
                recommendedAction = "warn";
            } else {
                recommendedAction = "monitor";
            }

            // Log suspicious activity if detected
            if (patterns.length > 0) {
                await this.createAuditEntry(
                    userId,
                    "suspicious_activity_detected",
                    "user",
                    userId,
                    {
                        action: "suspicious_pattern_analysis",
                        suspiciousFlags: patterns,
                        metadata: {
                            riskScore,
                            recommendedAction,
                            completionsAnalyzed: recentCompletions.length,
                            streaksAnalyzed: recentStreaks.length,
                        },
                    },
                );

                // Update suspicious pattern tracking
                await this.updateSuspiciousPattern(userId, patterns, riskScore);
            }

            return {
                isSuspicious: patterns.length > 0,
                patterns,
                riskScore,
                recommendedAction,
            };
        } catch (error) {
            console.error("Error detecting suspicious activity:", error);
            return {
                isSuspicious: false,
                patterns: [],
                riskScore: 0,
                recommendedAction: "monitor",
            };
        }
    }

    /**
     * Get security metrics for monitoring
     */
    async getSecurityMetrics(
        timeRange: "24h" | "7d" | "30d" = "24h",
    ): Promise<SecurityMetrics> {
        try {
            const auditLogs = await this.getLocalAuditLogs();
            const cutoffTime = this.getCutoffTime(timeRange);

            const recentLogs = auditLogs.filter(
                (log) => log.timestamp.toMillis() >= cutoffTime,
            );

            const suspiciousActivities = recentLogs.filter(
                (log) => log.eventType === "suspicious_activity_detected",
            ).length;

            const highRiskEvents = recentLogs.filter(
                (log) => log.riskLevel === "high" || log.riskLevel === "critical",
            ).length;

            const unresolvedIncidents = recentLogs.filter(
                (log) => !log.resolved && log.riskLevel !== "low",
            ).length;

            // Calculate top risk users
            const userRiskMap = new Map<
                string,
                { riskScore: number; incidentCount: number }
            >();
            recentLogs.forEach((log) => {
                if (log.riskLevel !== "low") {
                    const current = userRiskMap.get(log.userId) || {
                        riskScore: 0,
                        incidentCount: 0,
                    };
                    const riskPoints = this.getRiskPoints(log.riskLevel);
                    userRiskMap.set(log.userId, {
                        riskScore: current.riskScore + riskPoints,
                        incidentCount: current.incidentCount + 1,
                    });
                }
            });

            const topRiskUsers = Array.from(userRiskMap.entries())
                .map(([userId, data]) => ({ userId, ...data }))
                .sort((a, b) => b.riskScore - a.riskScore)
                .slice(0, 10);

            // Calculate common violations
            const violationMap = new Map<string, number>();
            recentLogs.forEach((log) => {
                const violation = log.eventType;
                violationMap.set(violation, (violationMap.get(violation) || 0) + 1);
            });

            const commonViolations = Array.from(violationMap.entries())
                .map(([type, count]) => ({ type, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 10);

            return {
                totalAuditEntries: recentLogs.length,
                suspiciousActivities,
                highRiskEvents,
                unresolvedIncidents,
                topRiskUsers,
                commonViolations,
            };
        } catch (error) {
            console.error("Error getting security metrics:", error);
            return {
                totalAuditEntries: 0,
                suspiciousActivities: 0,
                highRiskEvents: 0,
                unresolvedIncidents: 0,
                topRiskUsers: [],
                commonViolations: [],
            };
        }
    }

    /**
     * Get audit logs for a specific user
     */
    async getUserAuditLogs(
        userId: string,
        limit: number = 50,
    ): Promise<SecurityAuditEntry[]> {
        try {
            const auditLogs = await this.getLocalAuditLogs();
            return auditLogs
                .filter((log) => log.userId === userId)
                .sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis())
                .slice(0, limit);
        } catch (error) {
            console.error("Error getting user audit logs:", error);
            return [];
        }
    }

    /**
     * Clear audit logs (for development/testing)
     */
    async clearAuditLogs(): Promise<void> {
        try {
            await AsyncStorage.removeItem(SecurityAuditService.LOCAL_AUDIT_KEY);
            console.log("Audit logs cleared");
        } catch (error) {
            console.error("Failed to clear audit logs:", error);
        }
    }

    // Private helper methods

    /**
     * Calculate risk level based on event type and details
     */
    private calculateRiskLevel(
        eventType: AuditEventType,
        details: any,
    ): SecurityRiskLevel {
        // Critical risk events
        if (
            eventType === "unauthorized_access_attempt" ||
            eventType === "data_integrity_violation"
        ) {
            return "critical";
        }

        // High risk events
        if (
            eventType === "suspicious_activity_detected" ||
            eventType === "streak_validation_failed" ||
            eventType === "completion_validation_failed"
        ) {
            return "high";
        }

        // Medium risk events
        if (
            eventType === "streak_integrity_check_failed" ||
            eventType === "friend_display_validation_failed" ||
            (details.suspiciousFlags && details.suspiciousFlags.length > 0)
        ) {
            return "medium";
        }

        // Low risk (normal operations)
        return "low";
    }

    /**
     * Store audit entry in Firestore
     */
    private async storeAuditEntryRemote(
        entry: SecurityAuditEntry,
    ): Promise<void> {
        try {
            const auditRef = doc(
                db,
                `artifacts/oath-app/${SecurityAuditService.AUDIT_COLLECTION}`,
                entry.id,
            );
            await setDoc(auditRef, {
                ...entry,
                timestamp: serverTimestamp(),
            });
        } catch (error) {
            console.error("Failed to store audit entry remotely:", error);
        }
    }

    /**
     * Store audit entry locally
     */
    private async storeAuditEntryLocal(entry: SecurityAuditEntry): Promise<void> {
        try {
            const existingLogs = await this.getLocalAuditLogs();
            existingLogs.push(entry);

            // Keep only recent entries
            if (existingLogs.length > SecurityAuditService.MAX_LOCAL_ENTRIES) {
                existingLogs.splice(
                    0,
                    existingLogs.length - SecurityAuditService.MAX_LOCAL_ENTRIES,
                );
            }

            await AsyncStorage.setItem(
                SecurityAuditService.LOCAL_AUDIT_KEY,
                JSON.stringify(existingLogs),
            );
        } catch (error) {
            console.error("Failed to store audit entry locally:", error);
        }
    }

    /**
     * Get local audit logs
     */
    private async getLocalAuditLogs(): Promise<SecurityAuditEntry[]> {
        try {
            const logsData = await AsyncStorage.getItem(
                SecurityAuditService.LOCAL_AUDIT_KEY,
            );
            return logsData ? JSON.parse(logsData) : [];
        } catch (error) {
            console.error("Failed to get local audit logs:", error);
            return [];
        }
    }

    /**
     * Analyze suspicious patterns for a user
     */
    private async analyzeSuspiciousPatterns(
        userId: string,
        eventType: AuditEventType,
        details: any,
    ): Promise<void> {
        try {
            // This would typically analyze patterns across multiple events
            // For now, we'll just log the pattern detection
            console.log(`Analyzing suspicious patterns for user ${userId}:`, {
                eventType,
                suspiciousFlags: details.suspiciousFlags,
            });
        } catch (error) {
            console.error("Error analyzing suspicious patterns:", error);
        }
    }

    /**
     * Alert on high-risk events
     */
    private async alertHighRiskEvent(entry: SecurityAuditEntry): Promise<void> {
        try {
            console.warn(`HIGH RISK SECURITY EVENT DETECTED:`, {
                userId: entry.userId,
                eventType: entry.eventType,
                riskLevel: entry.riskLevel,
                details: entry.details,
            });

            // In production, this would:
            // 1. Send alert to security monitoring system
            // 2. Notify security team
            // 3. Potentially auto-restrict user actions
            // 4. Create incident ticket
        } catch (error) {
            console.error("Error alerting high-risk event:", error);
        }
    }

    private sanitizeAuditDetails(
        details: SecurityAuditEntry["details"],
    ): SecurityAuditEntry["details"] {
        const sanitizeValue = (value: any): any => {
            if (Array.isArray(value)) {
                const sanitizedArray = value
                    .map((item) => sanitizeValue(item))
                    .filter(
                        (item) =>
                            item !== undefined &&
                            !(typeof item === "object" && Object.keys(item).length === 0),
                    );
                return sanitizedArray.length > 0 ? sanitizedArray : undefined;
            }

            if (value && typeof value === "object") {
                const entries = Object.entries(value).reduce(
                    (acc, [key, val]) => {
                        const sanitized = sanitizeValue(val);
                        if (sanitized !== undefined) {
                            acc[key] = sanitized;
                        }
                        return acc;
                    },
                    {} as Record<string, any>,
                );
                return Object.keys(entries).length > 0 ? entries : undefined;
            }

            return value !== undefined ? value : undefined;
        };

        const sanitized = sanitizeValue(details);
        return sanitized || { action: details.action };
    }

    /**
     * Update suspicious pattern tracking
     */
    private async updateSuspiciousPattern(
        userId: string,
        patterns: string[],
        riskScore: number,
    ): Promise<void> {
        try {
            // This would update a tracking system for user risk patterns
            console.log(`Updating suspicious pattern tracking for user ${userId}:`, {
                patterns,
                riskScore,
            });
        } catch (error) {
            console.error("Error updating suspicious pattern:", error);
        }
    }

    /**
     * Get cutoff time for metrics calculation
     */
    private getCutoffTime(timeRange: "24h" | "7d" | "30d"): number {
        const now = Date.now();
        switch (timeRange) {
            case "24h":
                return now - 24 * 60 * 60 * 1000;
            case "7d":
                return now - 7 * 24 * 60 * 60 * 1000;
            case "30d":
                return now - 30 * 24 * 60 * 60 * 1000;
            default:
                return now - 24 * 60 * 60 * 1000;
        }
    }

    /**
     * Get risk points for a risk level
     */
    private getRiskPoints(riskLevel: SecurityRiskLevel): number {
        switch (riskLevel) {
            case "critical":
                return 50;
            case "high":
                return 25;
            case "medium":
                return 10;
            case "low":
                return 1;
            default:
                return 0;
        }
    }
}

// Export singleton instance
export const securityAuditService = new SecurityAuditService();
