/**
 * Property-Based Tests for Friend Service
 * Feature: friend-management-ui
 */

import * as fc from "fast-check";

/**
 * **Feature: friend-management-ui, Property 1: Search results match query**
 * **Validates: Requirements 1.1**
 *
 * For any search query and user database, all returned results should have
 * either email or displayName matching the query, and should never include
 * the searching user's own account.
 *
 * This test validates the core logic of search result filtering without
 * requiring a live Firebase connection.
 */

interface TestUser {
    userId: string;
    email: string;
    displayName: string;
    shameScore: number;
}

interface UserSearchResult {
    userId: string;
    displayName: string;
    email: string;
    relationshipStatus: "none" | "friend" | "pending_sent" | "pending_received";
    shameScore?: number;
}

// Helper function that simulates the search filtering logic
function filterSearchResults(
    query: string,
    currentUserId: string,
    allUsers: TestUser[],
): UserSearchResult[] {
    if (!query || query.trim().length === 0) {
        return [];
    }

    const normalizedQuery = query.trim().toLowerCase();

    return allUsers
        .filter((user) => {
            // Exclude current user
            if (user.userId === currentUserId) {
                return false;
            }

            // Check if email or displayName matches query
            const matchesEmail = user.email.toLowerCase().includes(normalizedQuery);
            const matchesName = user.displayName
                .toLowerCase()
                .includes(normalizedQuery);

            return matchesEmail || matchesName;
        })
        .map((user) => ({
            userId: user.userId,
            displayName: user.displayName,
            email: user.email,
            relationshipStatus: "none" as const,
            shameScore: user.shameScore,
        }));
}

describe("Friend Service Property-Based Tests", () => {
    describe("Property 1: Search results match query", () => {
        it("should return only users matching the query and exclude the current user", () => {
            fc.assert(
                fc.property(
                    fc
                        .string({ minLength: 1, maxLength: 20 })
                        .filter((s) => s.trim().length > 0),
                    fc.uuid(),
                    fc.array(
                        fc.record({
                            userId: fc.uuid(),
                            email: fc.emailAddress(),
                            displayName: fc.string({ minLength: 1, maxLength: 30 }),
                            shameScore: fc.integer({ min: 0, max: 100 }),
                        }),
                        { minLength: 0, maxLength: 20 },
                    ),
                    (query, currentUserId, allUsers) => {
                        const results = filterSearchResults(query, currentUserId, allUsers);
                        const normalizedQuery = query.trim().toLowerCase();

                        for (const result of results) {
                            const matchesEmail = result.email
                                .toLowerCase()
                                .includes(normalizedQuery);
                            const matchesName = result.displayName
                                .toLowerCase()
                                .includes(normalizedQuery);
                            expect(matchesEmail || matchesName).toBe(true);
                        }

                        const currentUserInResults = results.some(
                            (r) => r.userId === currentUserId,
                        );
                        expect(currentUserInResults).toBe(false);

                        for (const result of results) {
                            const existsInInput = allUsers.some(
                                (u) => u.userId === result.userId,
                            );
                            expect(existsInInput).toBe(true);
                        }

                        const userIds = results.map((r) => r.userId);
                        const uniqueUserIds = new Set(userIds);
                        expect(userIds.length).toBe(uniqueUserIds.size);
                    },
                ),
                { numRuns: 100 },
            );
        });

        it("should return empty array for empty query", () => {
            fc.assert(
                fc.property(
                    fc.uuid(),
                    fc.array(
                        fc.record({
                            userId: fc.uuid(),
                            email: fc.emailAddress(),
                            displayName: fc.string({ minLength: 1, maxLength: 30 }),
                            shameScore: fc.integer({ min: 0, max: 100 }),
                        }),
                        { minLength: 0, maxLength: 20 },
                    ),
                    (currentUserId, allUsers) => {
                        const results = filterSearchResults("", currentUserId, allUsers);
                        expect(results).toEqual([]);
                    },
                ),
                { numRuns: 100 },
            );
        });

        it("should perform case-insensitive matching", () => {
            fc.assert(
                fc.property(
                    fc
                        .string({ minLength: 1, maxLength: 20 })
                        .filter((s) => s.trim().length > 0),
                    fc.uuid(),
                    fc.array(
                        fc.record({
                            userId: fc.uuid(),
                            email: fc.emailAddress(),
                            displayName: fc.string({ minLength: 1, maxLength: 30 }),
                            shameScore: fc.integer({ min: 0, max: 100 }),
                        }),
                        { minLength: 0, maxLength: 20 },
                    ),
                    (query, currentUserId, allUsers) => {
                        const lowerResults = filterSearchResults(
                            query.toLowerCase(),
                            currentUserId,
                            allUsers,
                        );
                        const upperResults = filterSearchResults(
                            query.toUpperCase(),
                            currentUserId,
                            allUsers,
                        );
                        const mixedResults = filterSearchResults(
                            query,
                            currentUserId,
                            allUsers,
                        );

                        const lowerIds = new Set(lowerResults.map((r) => r.userId));
                        const upperIds = new Set(upperResults.map((r) => r.userId));
                        const mixedIds = new Set(mixedResults.map((r) => r.userId));

                        expect(lowerIds).toEqual(upperIds);
                        expect(lowerIds).toEqual(mixedIds);
                    },
                ),
                { numRuns: 100 },
            );
        });
    });
});
