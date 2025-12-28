import { Body, Caption, Card, HStack, LoadingSkeleton, VStack } from "@/components/ui";
import { useFriends } from "@/hooks/useFriends";
import { useThemeStyles } from "@/hooks/useTheme";
import React, { useMemo } from "react";
import { FlatList, View } from "react-native";

interface LeaderboardProps {
    userId?: string;
    type: "streak" | "shame";
}

export function Leaderboard({ userId, type }: LeaderboardProps) {
    const { friendsList, currentUser, loading } = useFriends(userId);
    const { colors, spacing } = useThemeStyles();

    const sortedList = useMemo(() => {
        // Include current user in leaderboard
        const allUsers = currentUser 
            ? [...friendsList, { ...currentUser, userId: userId || 'me' }]
            : friendsList;

        if (type === "streak") {
            // This is tricky because streaks are per habit. 
            // For a global leaderboard, we'll use 'bestStreak' if available, or just ignore for now.
            // Actually, let's use Shame Score as it's the primary global metric.
            return allUsers.sort((a, b) => (b.shameScore || 0) - (a.shameScore || 0));
        } else {
            // Shame Leaderboard: Lowest shame at top
            return allUsers.sort((a, b) => (a.shameScore || 0) - (b.shameScore || 0));
        }
    }, [friendsList, currentUser, type]);

    if (loading && sortedList.length === 0) {
        return (
            <VStack spacing="md">
                {[1, 2, 3].map((i) => (
                    <LoadingSkeleton key={i} height={60} />
                ))}
            </VStack>
        );
    }

    return (
        <VStack spacing="md">
            {sortedList.map((item, index) => {
                const isMe = item.userId === userId || item.userId === 'me';
                return (
                    <Card 
                        key={item.userId} 
                        variant={isMe ? "elevated" : "outlined"} 
                        padding="md"
                        style={isMe ? { borderColor: colors.primary, borderWidth: 1 } : {}}
                    >
                        <HStack align="center" justify="space-between">
                            <HStack align="center" spacing="md">
                                <Body weight="bold" style={{ width: 24 }}>{index + 1}</Body>
                                <VStack>
                                    <Body weight={isMe ? "bold" : "semibold"}>
                                        {item.displayName} {isMe ? "(You)" : ""}
                                    </Body>
                                    <Caption color="muted">
                                        {type === 'shame' ? 'Accountability Score' : 'Top Performer'}
                                    </Caption>
                                </VStack>
                            </HStack>
                            <VStack align="flex-end">
                                <Body weight="bold" color={type === 'shame' && item.shameScore > 0 ? "destructive" : "success"}>
                                    {item.shameScore || 0}
                                </Body>
                                <Caption size="xs" color="muted">SHAME</Caption>
                            </VStack>
                        </HStack>
                    </Card>
                );
            })}
        </VStack>
    );
}
