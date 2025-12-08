import { useAuth } from "@/hooks/useAuth";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Redirect, Tabs } from "expo-router";

/**
 * TabLayout
 *
 * Protected tabs layout for authenticated users
 * Requirement 8.4: Implement navigation between screens with protected routes
 */
export default function TabLayout() {
  const { user, loading } = useAuth();

  // Redirect to sign-in if not authenticated
  if (!loading && !user) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="index"
        options={{
          title: "Friends",
          tabBarIcon: ({ color }) => (
            <MaterialIcons size={28} name="people" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="home"
        options={{
          title: "My Goals",
          tabBarIcon: ({ color }) => (
            <MaterialIcons size={28} name="check-circle" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
