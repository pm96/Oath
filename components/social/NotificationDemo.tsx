import { useThemeStyles } from "@/hooks/useTheme";
import React from "react";
import { ScrollView, View } from "react-native";
import { NotificationCard } from "../ui/NotificationCard";
import { Text } from "../ui/Text";
import { FriendRequestNotificationCard } from "./FriendRequestNotificationCard";
import { NotificationInbox, NotificationItem } from "./NotificationInbox";
import { NudgeNotificationCard } from "./NudgeNotificationCard";

/**
 * NotificationDemo Component
 *
 * Demo component to showcase the new notification styling
 * This is for testing purposes and demonstrates all notification types
 */
export function NotificationDemo() {
    const { colors, spacing, typography } = useThemeStyles();

    // Sample notifications for demo
    const sampleNotifications: NotificationItem[] = [
        {
            id: "1",
            type: "friend_request",
            title: "New Friend Request",
            message: "John Doe wants to be your friend",
            timestamp: "2 minutes ago",
            isRead: false,
            data: {
                senderName: "John Doe",
                senderEmail: "john@example.com",
                requestId: "req_123",
            },
        },
        {
            id: "2",
            type: "nudge",
            title: "Nudge from Sarah",
            message: "Time to work on your daily exercise goal!",
            timestamp: "5 minutes ago",
            isRead: false,
            data: {
                senderName: "Sarah Wilson",
                goalDescription: "Daily 30-minute workout",
                goalId: "goal_456",
            },
        },
        {
            id: "3",
            type: "shame",
            title: "Shame Score Update",
            message: "Your shame score increased due to missed goals",
            timestamp: "1 hour ago",
            isRead: true,
            data: {
                newScore: 3,
            },
        },
        {
            id: "4",
            type: "general",
            title: "Welcome to Oath!",
            message: "Start by creating your first goal and inviting friends",
            timestamp: "1 day ago",
            isRead: true,
        },
    ];

    const handleAcceptFriendRequest = async (requestId: string) => {
        console.log("Accepting friend request:", requestId);
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1000));
    };

    const handleRejectFriendRequest = async (requestId: string) => {
        console.log("Rejecting friend request:", requestId);
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1000));
    };

    const handleViewGoal = (goalId: string) => {
        console.log("Viewing goal:", goalId);
    };

    const handleMarkAsRead = (notificationId: string) => {
        console.log("Marking as read:", notificationId);
    };

    const handleDismiss = (notificationId: string) => {
        console.log("Dismissing notification:", notificationId);
    };

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: colors.background }}
            contentContainerStyle={{ padding: spacing.md }}
        >
            <Text
                style={{
                    fontSize: typography.sizes.xl,
                    fontWeight: typography.weights.bold as any,
                    color: colors.foreground,
                    marginBottom: spacing.lg,
                    textAlign: "center",
                }}
            >
                Notification Components Demo
            </Text>

            {/* Individual notification cards */}
            <View style={{ gap: spacing.lg }}>
                <View>
                    <Text
                        style={{
                            fontSize: typography.sizes.lg,
                            fontWeight: typography.weights.semibold as any,
                            color: colors.foreground,
                            marginBottom: spacing.sm,
                        }}
                    >
                        Friend Request Notification
                    </Text>
                    <FriendRequestNotificationCard
                        senderName="John Doe"
                        senderEmail="john@example.com"
                        timestamp="2 minutes ago"
                        isRead={false}
                        onAccept={() => handleAcceptFriendRequest("req_123")}
                        onReject={() => handleRejectFriendRequest("req_123")}
                        onMarkAsRead={() => handleMarkAsRead("1")}
                    />
                </View>

                <View>
                    <Text
                        style={{
                            fontSize: typography.sizes.lg,
                            fontWeight: typography.weights.semibold as any,
                            color: colors.foreground,
                            marginBottom: spacing.sm,
                        }}
                    >
                        Nudge Notification
                    </Text>
                    <NudgeNotificationCard
                        senderName="Sarah Wilson"
                        goalDescription="Daily 30-minute workout"
                        timestamp="5 minutes ago"
                        isRead={false}
                        onViewGoal={() => handleViewGoal("goal_456")}
                        onMarkAsRead={() => handleMarkAsRead("2")}
                        onDismiss={() => handleDismiss("2")}
                    />
                </View>

                <View>
                    <Text
                        style={{
                            fontSize: typography.sizes.lg,
                            fontWeight: typography.weights.semibold as any,
                            color: colors.foreground,
                            marginBottom: spacing.sm,
                        }}
                    >
                        Generic Notification Cards
                    </Text>
                    <View style={{ gap: spacing.sm }}>
                        <NotificationCard
                            title="Goal Completed!"
                            message="You've successfully completed your daily reading goal"
                            timestamp="10 minutes ago"
                            type="general"
                            isRead={false}
                            showBadge={true}
                            onAction={() => console.log("View progress")}
                            actionLabel="View Progress"
                            onDismiss={() => console.log("Dismiss")}
                        />

                        <NotificationCard
                            title="Shame Score Warning"
                            message="Your shame score is getting high. Complete some goals!"
                            timestamp="1 hour ago"
                            type="shame"
                            isRead={true}
                            showBadge={true}
                        />
                    </View>
                </View>

                <View>
                    <Text
                        style={{
                            fontSize: typography.sizes.lg,
                            fontWeight: typography.weights.semibold as any,
                            color: colors.foreground,
                            marginBottom: spacing.sm,
                        }}
                    >
                        Notification Inbox
                    </Text>
                    <View
                        style={{
                            height: 400,
                            borderWidth: 1,
                            borderColor: colors.border,
                            borderRadius: 12,
                        }}
                    >
                        <NotificationInbox
                            notifications={sampleNotifications}
                            onAcceptFriendRequest={handleAcceptFriendRequest}
                            onRejectFriendRequest={handleRejectFriendRequest}
                            onViewGoal={handleViewGoal}
                            onMarkAsRead={handleMarkAsRead}
                            onDismiss={handleDismiss}
                        />
                    </View>
                </View>
            </View>
        </ScrollView>
    );
}
