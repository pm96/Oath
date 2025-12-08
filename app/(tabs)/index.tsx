import { FriendsDashboard } from "@/components/social";
import { Heading } from "@/components/ui/heading";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { VStack } from "@/components/ui/vstack";
import React from "react";

/**
 * Friends Dashboard Screen
 * Requirements: 3.1, 3.3, 5.1, 6.1, 6.2, 8.1
 *
 * Main screen for viewing friends' goals and social accountability features
 * Optimized for mobile with responsive design
 */
export default function Index() {
  return (
    <SafeAreaView className="flex-1">
      <VStack className="flex-1">
        {/* Header */}
        <VStack className="p-4 pb-2 border-b border-background-200">
          <Heading size="xl">Friends</Heading>
        </VStack>

        {/* Friends Dashboard */}
        <FriendsDashboard />
      </VStack>
    </SafeAreaView>
  );
}
