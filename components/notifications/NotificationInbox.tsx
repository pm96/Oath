import { Body, Button, Caption, Card, Heading, HStack, LoadingSkeleton, VStack } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useThemeStyles } from "@/hooks/useTheme";
import { getNudgesCollection } from "@/services/firebase/collections";
import { formatDistanceToNow } from "date-fns";
import { getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { X } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { FlatList, Modal, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface NotificationInboxProps {
    visible: boolean;
    onClose: () => void;
}

interface NudgeNotification {
    id: string;
    senderName: string;
    goalDescription: string;
    createdAt: Date;
    type: 'nudge';
}

export function NotificationInbox({ visible, onClose }: NotificationInboxProps) {
    const { user } = useAuth();
    const { colors, spacing } = useThemeStyles();
    const [notifications, setNotifications] = useState<NudgeNotification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (visible && user?.uid) {
            fetchNotifications();
        }
    }, [visible, user?.uid]);

    const fetchNotifications = async () => {
        if (!user?.uid) return;
        setLoading(true);
        try {
            const nudgesRef = getNudgesCollection();
            const q = query(
                nudgesRef,
                where("receiverId", "==", user.uid),
                orderBy("createdAt", "desc"),
                limit(20)
            );
            const snapshot = await getDocs(q);
            const fetched = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date(),
                type: 'nudge' as const
            })) as NudgeNotification[];
            setNotifications(fetched);
        } catch (error) {
            console.error("Failed to fetch notifications", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
                <View style={{ padding: spacing.lg, flex: 1 }}>
                    <HStack justify="space-between" align="center" style={{ marginBottom: spacing.lg }}>
                        <Heading size="xl">Notifications</Heading>
                        <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <X size={24} color={colors.foreground} />
                        </TouchableOpacity>
                    </HStack>

                    {loading ? (
                        <VStack spacing="md">
                            {[1, 2, 3].map(i => (
                                <Card key={i} variant="outlined" padding="md">
                                    <VStack spacing="xs">
                                        <LoadingSkeleton width="80%" height={16} />
                                        <LoadingSkeleton width="40%" height={12} />
                                    </VStack>
                                </Card>
                            ))}
                        </VStack>
                    ) : notifications.length === 0 ? (
                        <VStack style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} spacing="md">
                            <Body color="muted">No recent notifications</Body>
                            <Button variant="outline" size="sm" onPress={onClose}>Close</Button>
                        </VStack>
                    ) : (
                        <FlatList
                            data={notifications}
                            keyExtractor={item => item.id}
                            contentContainerStyle={{ gap: spacing.md }}
                            renderItem={({ item }) => (
                                <Card variant="outlined" padding="md">
                                    <VStack spacing="xs">
                                        <HStack justify="space-between">
                                            <Body weight="semibold">Nudge from {item.senderName}</Body>
                                            <Caption color="muted">{formatDistanceToNow(item.createdAt, { addSuffix: true })}</Caption>
                                        </HStack>
                                        <Body size="sm">"{item.goalDescription}"</Body>
                                    </VStack>
                                </Card>
                            )}
                        />
                    )}
                </View>
            </SafeAreaView>
        </Modal>
    );
}
