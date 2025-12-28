import { NotificationBadge } from "@/components/ui";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/hooks/useAuth";
import { subscribeToPendingRequests } from "@/services/firebase/friendService";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Redirect, Tabs } from "expo-router";
import { useEffect, useState } from "react";
import { Platform, View } from "react-native";

/**
 * TabLayout
 *
 * Protected tabs layout for authenticated users with three tabs: Home, Friends, and Profile
 * Features modern styling with smooth transitions, proper focus states, and accessibility
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 7.5, 1.5, 3.4
 */
export default function TabLayout() {
  const { user, loading } = useAuth();
  const { theme, isDark } = useTheme();
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  // Subscribe to pending friend requests count for badge
  // Requirement 7.5: Display badge count on Friends tab
  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = subscribeToPendingRequests(
      user.uid,
      () => {
        // No list usage needed here
      },
      (error) => {
        console.error("Error subscribing to pending requests count:", error);
      },
      (count) => {
        setPendingRequestsCount(count);
      },
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // Redirect to sign-in if not authenticated
  if (!loading && !user) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // Modern tab bar styling with theme support
        // Requirements: 1.5, 3.4 - Smooth transitions and modern styling
        tabBarStyle: {
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
          paddingTop: 8,
          // Remove hardcoded height and excessive padding to let navigation handle safe area
          ...(Platform.OS === "android" && { elevation: 8 }), // Android shadow
          ...(Platform.OS === "ios" && {
            shadowColor: theme.colors.foreground, // iOS shadow
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: isDark ? 0.3 : 0.1,
            shadowRadius: 8,
          }),
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.mutedForeground,
        tabBarLabelStyle: {
          fontSize: theme.typography.sizes.xs,
          fontWeight: "500" as const,
          marginTop: 4,
        },
        // Smooth tab transitions
        tabBarItemStyle: {
          paddingVertical: 4,
        },
        // Accessibility improvements
        tabBarAccessibilityLabel: "Main navigation tabs",
        tabBarAllowFontScaling: true,
      }}
    >
      {/* Home Tab - My Goals */}
      {/* Requirement 4.2: Navigate to goals management screen */}
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons
              size={focused ? 30 : 26}
              name="check-circle"
              color={color}
              style={{
                transform: [{ scale: focused ? 1.1 : 1 }],
              }}
            />
          ),
          tabBarAccessibilityLabel: "Home tab - View and manage your goals",
        }}
      />

      {/* Friends Tab - Search, Requests, and Friends List */}
      {/* Requirement 4.3: Navigate to friends dashboard with search and friends list */}
      {/* Requirement 7.5: Display badge count for pending requests */}
      <Tabs.Screen
        name="friends"
        options={{
          title: "Friends",
          tabBarIcon: ({ color, focused }) => (
            <View style={{ position: "relative" }}>
              <MaterialIcons
                size={focused ? 30 : 26}
                name="people"
                color={color}
                style={{
                  transform: [{ scale: focused ? 1.1 : 1 }],
                }}
              />
              {pendingRequestsCount > 0 && (
                <NotificationBadge
                  count={pendingRequestsCount}
                  variant="destructive"
                  size="sm"
                  style={{
                    position: "absolute",
                    top: -8,
                    right: -8,
                  }}
                />
              )}
            </View>
          ),
          tabBarAccessibilityLabel: `Friends tab - Manage friends and requests${pendingRequestsCount > 0
              ? `, ${pendingRequestsCount} pending requests`
              : ""
            }`,
        }}
      />

      {/* Profile Tab - User Profile and Settings */}
      {/* Requirement 4.4: Navigate to user's profile showing shame score and settings */}
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons
              size={focused ? 30 : 26}
              name="person"
              color={color}
              style={{
                transform: [{ scale: focused ? 1.1 : 1 }],
              }}
            />
          ),
          tabBarAccessibilityLabel: "Profile tab - View profile and settings",
        }}
      />

      {/* Hide the index screen - it's just a redirect */}
      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
