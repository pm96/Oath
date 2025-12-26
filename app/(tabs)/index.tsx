import { Redirect } from "expo-router";

/**
 * Index redirect
 * Redirects to the home tab (My Goals)
 * Requirement 4.1: Display tab bar with Home, Friends, and Profile tabs
 */
export default function Index() {
  return <Redirect href="/(tabs)/home" />;
}
