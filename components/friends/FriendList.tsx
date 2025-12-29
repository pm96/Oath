import { Avatar, Body, Button, Caption, Card, HStack, LoadingSkeleton, VStack } from "@/components/ui";
import { useFriends } from "@/hooks/useFriends";
import { useThemeStyles } from "@/hooks/useTheme";
import { blockUser } from "@/services/firebase/friendService";
import { showErrorToast, showSuccessToast } from "@/utils/toast";
import React, { useState } from "react";
import { Alert, FlatList, View } from "react-native";
import { ReportModal } from "./ReportModal";

interface FriendListProps {
    userId?: string;
}

export function FriendList({ userId }: FriendListProps) {
    const { friendsList, loading, removeFriendById, removingFriendId } = useFriends(userId);
    const { colors, spacing } = useThemeStyles();
    
    const [reportingUser, setReportingUser] = useState<{ id: string, name: string } | null>(null);

    const handleBlock = async (friendId: string) => {
        if (!userId) return;
        try {
            await blockUser(userId, friendId);
            showSuccessToast("User blocked.");
        } catch (error: any) {
            showErrorToast(error.message);
        }
    };

    const confirmRemove = (friendId: string, name: string) => {
        Alert.alert(
            "Manage Friend",
            `What would you like to do with ${name}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove Friend",
                    style: "destructive",
                    onPress: () => removeFriendById(friendId),
                },
                {
                    text: "Report User",
                    onPress: () => setReportingUser({ id: friendId, name: name }),
                },
                {
                    text: "Block User",
                    style: "destructive",
                    onPress: () => handleBlock(friendId),
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
        <>
            <FlatList
                data={friendsList}
                keyExtractor={(item) => item.userId}
                contentContainerStyle={{ gap: spacing.md }}
                scrollEnabled={false} // Rendered inside a ScrollView usually
                renderItem={({ item }) => (
                    <Card variant="elevated" padding="md">
                        <HStack align="center" spacing="md">
                            <Avatar 
                                fallback={item.displayName[0].toUpperCase()} 
                                size="md" 
                            />
                            <VStack style={{ flex: 1 }}>
                                <Body weight="semibold">{item.displayName}</Body>
                                <Caption color="muted">{item.email}</Caption>
                                {item.shameScore > 0 && (
                                    <Caption color="destructive" weight="medium">
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
                                style={{ height: 36, minHeight: 36, borderRadius: 18, paddingHorizontal: 12 }}
                            >
                                <Body size="xs" color="primary">Manage</Body>
                            </Button>
                        </HStack>
                    </Card>
                )}
            />

            {reportingUser && (
                <ReportModal
                    visible={!!reportingUser}
                    targetUserId={reportingUser.id}
                    targetUserName={reportingUser.name}
                    onClose={() => setReportingUser(null)}
                />
            )}
        </>
    );
}
