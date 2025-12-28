import { Body, Button, Caption, Card, HStack, LoadingSkeleton, VStack } from "@/components/ui";
import { useFriends } from "@/hooks/useFriends";
import { useThemeStyles } from "@/hooks/useTheme";
import React from "react";
import { Alert, FlatList, View } from "react-native";

interface FriendListProps {
    userId?: string;
}

export function FriendList({ userId }: FriendListProps) {
    const { friendsList, loading, removeFriendById, removingFriendId } = useFriends(userId);
    const { spacing } = useThemeStyles();

    const confirmRemove = (friendId: string, name: string) => {
        Alert.alert(
            "Remove Friend",
            `Are you sure you want to remove ${name} as a friend?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: () => removeFriendById(friendId),
                },
            ]
        );
    };

    if (loading && friendsList.length === 0) {
        return (
            <VStack spacing="md">
                {[1, 2, 3].map((i) => (
                    <Card key={i} variant="outlined" padding="md">
                        <HStack align="center" justify="space-between">
                            <VStack>
                                <LoadingSkeleton width={120} height={20} />
                                <LoadingSkeleton width={180} height={14} style={{ marginTop: 4 }} />
                            </VStack>
                            <LoadingSkeleton width={80} height={32} />
                        </HStack>
                    </Card>
                ))}
            </VStack>
        );
    }

    if (friendsList.length === 0) {
        return (
            <Card variant="outlined" padding="lg">
                <Body color="muted" align="center">You haven't added any friends yet.</Body>
            </Card>
        );
    }

    return (
        <FlatList
            data={friendsList}
            keyExtractor={(item) => item.userId}
            contentContainerStyle={{ gap: spacing.md }}
            scrollEnabled={false} // Rendered inside a ScrollView usually
            renderItem={({ item }) => (
                <Card variant="outlined" padding="md">
                    <HStack align="center" justify="space-between">
                        <VStack style={{ flex: 1 }}>
                            <Body weight="semibold">{item.displayName}</Body>
                            <Caption color="muted">{item.email}</Caption>
                            {item.shameScore > 0 && (
                                <Caption color="destructive">
                                    {item.shameScore} shame point{item.shameScore !== 1 ? 's' : ''}
                                </Caption>
                            )}
                        </VStack>
                        <Button
                            size="sm"
                            variant="outline"
                            onPress={() => confirmRemove(item.userId, item.displayName)}
                            disabled={removingFriendId === item.userId}
                            loading={removingFriendId === item.userId}
                        >
                            Remove
                        </Button>
                    </HStack>
                </Card>
            )}
        />
    );
}
