import { Button } from "@/components/ui/Button";
import { Heading, Text } from "@/components/ui/Text";
import { useRouter } from "expo-router";
import React from "react";
import { View } from "react-native";

/**
 * NotFoundPage
 *
 * 404 error page for invalid routes
 * Requirement 8.4: Consistent navigation patterns
 */
export default function NotFoundPage() {
    const router = useRouter();

    return (
        <View
            style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                padding: 24,
                gap: 32,
            }}
        >
            <Text
                size="xxl"
                weight="bold"
                style={{ fontSize: 72, textAlign: "center" }}
            >
                404
            </Text>
            <View style={{ alignItems: "center", gap: 16 }}>
                <Heading size="xl" style={{ textAlign: "center" }}>
                    Page Not Found
                </Heading>
                <Text color="muted" style={{ textAlign: "center" }}>
                    The page you&apos;re looking for doesn&apos;t exist or has been moved.
                </Text>
            </View>
            <Button onPress={() => router.replace("/(tabs)")}>Go Home</Button>
        </View>
    );
}
