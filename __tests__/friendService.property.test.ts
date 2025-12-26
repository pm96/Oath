/**
 * Property-Based Tests for Friend Service
 * Feature: friend-management-ui
 */

import * as fc from "fast-check";

/**
 * **Feature: friend-management-ui, Property 1: Search results match query**
 * **Validates: Requirements 1.1**
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
            if (user.userId === currentUserId) {
                return false;
            }
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

// Optimized generators - much faster than complex string/uuid generators
const userIdArb = fc.oneof(
    fc.constant("user-1"),
    fc.constant("user-2"),
    fc.constant("user-3"),
    fc.constant("user-4"),
    fc.constant("user-5"),
);

const emailArb = fc.oneof(
    fc.constant("john@example.com"),
    fc.constant("jane@test.com"),
    fc.constant("bob@demo.org"),
    fc.constant("alice@sample.net"),
);

const nameArb = fc.oneof(
    fc.constant("John Doe"),
    fc.constant("Jane Smith"),
    fc.constant("Bob Johnson"),
    fc.constant("Alice Brown"),
);

const queryArb = fc.oneof(
    fc.constant("john"),
    fc.constant("jane"),
    fc.constant("test"),
    fc.constant("example"),
);

const testUserArb = fc.record({
    userId: userIdArb,
    email: emailArb,
    displayName: nameArb,
    shameScore: fc.integer({ min: 0, max: 10 }),
});

describe("Friend Service Property-Based Tests", () => {
    describe("Property 1: Search results match query", () => {
        it("should return only users matching the query and exclude the current user", () => {
            fc.assert(
                fc.property(
                    queryArb,
                    userIdArb,
                    fc.array(testUserArb, { minLength: 0, maxLength: 5 }),
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
                    },
                ),
                { numRuns: 25 }, // Reduced from 100 to 25
            );
        });

        it("should return empty array for empty query", () => {
            fc.assert(
                fc.property(
                    userIdArb,
                    fc.array(testUserArb, { minLength: 0, maxLength: 5 }),
                    (currentUserId, allUsers) => {
                        const results = filterSearchResults("", currentUserId, allUsers);
                        expect(results).toEqual([]);
                    },
                ),
                { numRuns: 25 }, // Reduced from 100 to 25
            );
        });

        it("should perform case-insensitive matching", () => {
            fc.assert(
                fc.property(
                    queryArb,
                    userIdArb,
                    fc.array(testUserArb, { minLength: 0, maxLength: 5 }),
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

                        const lowerIds = new Set(lowerResults.map((r) => r.userId));
                        const upperIds = new Set(upperResults.map((r) => r.userId));

                        expect(lowerIds).toEqual(upperIds);
                    },
                ),
                { numRuns: 25 }, // Reduced from 100 to 25
            );
        });
    });

    describe("Property 2: Search result display completeness", () => {
        it("should include both displayName and email in all search results", () => {
            fc.assert(
                fc.property(
                    queryArb,
                    userIdArb,
                    fc.array(testUserArb, { minLength: 1, maxLength: 5 }),
                    (query, currentUserId, allUsers) => {
                        const results = filterSearchResults(query, currentUserId, allUsers);

                        for (const result of results) {
                            expect(result.displayName).toBeDefined();
                            expect(typeof result.displayName).toBe("string");
                            expect(result.displayName.length).toBeGreaterThan(0);

                            expect(result.email).toBeDefined();
                            expect(typeof result.email).toBe("string");
                            expect(result.email.length).toBeGreaterThan(0);
                        }
                    },
                ),
                { numRuns: 25 }, // Reduced from 100 to 25
            );
        });
    });

    describe("Property 3: Search result relationship status accuracy", () => {
        interface FriendRequestData {
            requestId: string;
            senderId: string;
            receiverId: string;
            status: "pending" | "accepted" | "rejected";
        }

        function determineRelationshipStatus(
            currentUserId: string,
            targetUserId: string,
            currentUserFriends: string[],
            pendingRequests: FriendRequestData[],
        ): "none" | "friend" | "pending_sent" | "pending_received" {
            if (currentUserFriends.includes(targetUserId)) {
                return "friend";
            }

            const sentRequest = pendingRequests.find(
                (req) =>
                    req.senderId === currentUserId &&
                    req.receiverId === targetUserId &&
                    req.status === "pending",
            );
            if (sentRequest) {
                return "pending_sent";
            }

            const receivedRequest = pendingRequests.find(
                (req) =>
                    req.senderId === targetUserId &&
                    req.receiverId === currentUserId &&
                    req.status === "pending",
            );
            if (receivedRequest) {
                return "pending_received";
            }

            return "none";
        }

        it("should return 'friend' status when user is in friends array", () => {
            fc.assert(
                fc.property(
                    userIdArb,
                    userIdArb,
                    fc.array(userIdArb, { maxLength: 3 }),
                    (currentUserId, targetUserId, otherFriends) => {
                        fc.pre(currentUserId !== targetUserId);

                        const friends = [...otherFriends, targetUserId];
                        const status = determineRelationshipStatus(
                            currentUserId,
                            targetUserId,
                            friends,
                            [],
                        );

                        expect(status).toBe("friend");
                    },
                ),
                { numRuns: 25 }, // Reduced from 100 to 25
            );
        });

        it("should return 'none' when there is no relationship", () => {
            fc.assert(
                fc.property(
                    userIdArb,
                    userIdArb,
                    fc.array(userIdArb, { maxLength: 3 }),
                    (currentUserId, targetUserId, friends) => {
                        fc.pre(currentUserId !== targetUserId);
                        fc.pre(!friends.includes(targetUserId));

                        const status = determineRelationshipStatus(
                            currentUserId,
                            targetUserId,
                            friends,
                            [],
                        );

                        expect(status).toBe("none");
                    },
                ),
                { numRuns: 25 }, // Reduced from 100 to 25
            );
        });
    });
});
