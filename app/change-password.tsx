import {
    Container,
    Heading,
    VStack,
    Button,
    Input,
    Body,
} from "@/components/ui";
import { useThemeStyles } from "@/hooks/useTheme";
import { reauthenticate, changePassword } from "@/services/firebase/authService";
import { showErrorToast, showSuccessToast } from "@/utils/toast";
import { router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import React, { useState } from "react";
import { SafeAreaView } from "@/components/ui/safe-area-view";

export default function ChangePasswordScreen() {
    const { colors, spacing } = useThemeStyles();
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleUpdatePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            showErrorToast("Please fill in all fields.");
            return;
        }
        if (newPassword !== confirmPassword) {
            showErrorToast("New passwords do not match.");
            return;
        }
        if (newPassword.length < 6) {
            showErrorToast("New password must be at least 6 characters long.");
            return;
        }

        setLoading(true);
        try {
            // Re-authenticate user first for security
            await reauthenticate(currentPassword);
            // If successful, update the password
            await changePassword(newPassword);
            showSuccessToast("Password updated successfully!");
            router.back();
        } catch (error: any) {
            showErrorToast(error.message || "Failed to update password.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            {/* Header */}
            <VStack
                style={{
                    paddingHorizontal: spacing.lg,
                    paddingVertical: spacing.md,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                }}
                align="center"
                spacing="md"
            >
                <Button
                    variant="ghost"
                    size="sm"
                    onPress={() => router.back()}
                    style={{ alignSelf: "flex-start", position: "absolute", left: spacing.md, top: spacing.sm }}
                >
                    <ArrowLeft size={20} color={colors.foreground} />
                </Button>
                <Heading size="lg" style={{ flex: 1, textAlign: "center" }}>
                    Change Password
                </Heading>
            </VStack>

            <Container padding="lg" style={{ flex: 1 }}>
                <VStack spacing="xl">
                    <VStack spacing="sm">
                        <Body weight="medium">Current Password</Body>
                        <Input
                            placeholder="Enter your current password"
                            value={currentPassword}
                            onChangeText={setCurrentPassword}
                            secureTextEntry
                        />
                    </VStack>
                    <VStack spacing="sm">
                        <Body weight="medium">New Password</Body>
                        <Input
                            placeholder="Enter your new password"
                            value={newPassword}
                            onChangeText={setNewPassword}
                            secureTextEntry
                        />
                    </VStack>
                    <VStack spacing="sm">
                        <Body weight="medium">Confirm New Password</Body>
                        <Input
                            placeholder="Confirm your new password"
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry
                        />
                    </VStack>
                    <Button onPress={handleUpdatePassword} loading={loading} disabled={loading}>
                        Update Password
                    </Button>
                </VStack>
            </Container>
        </SafeAreaView>
    );
}
