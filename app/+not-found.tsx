import { Button, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { useRouter } from "expo-router";
import React from "react";

/**
 * NotFoundPage
 *
 * 404 error page for invalid routes
 * Requirement 8.4: Consistent navigation patterns
 */
export default function NotFoundPage() {
    const router = useRouter();

    return (
        <VStack className="flex-1 justify-center items-center p-6" space="xl">
            <Text className="text-7xl font-bold text-typography-900">404</Text>
            <VStack space="md" className="items-center">
                <Heading size="xl" className="text-center">
                    Page Not Found
                </Heading>
                <Text className="text-center text-typography-600">
                    The page you&apos;re looking for doesn&apos;t exist or has been moved.
                </Text>
            </VStack>
            <Button onPress={() => router.replace("/(tabs)")}>
                <ButtonText>Go Home</ButtonText>
            </Button>
        </VStack>
    );
}
