import {
    Body,
    Button,
    Caption,
    Container,
    Heading,
    HStack,
    Input,
    VStack,
} from "@/components/ui";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { useAuth } from "@/hooks/useAuth";
import { useThemeStyles } from "@/hooks/useTheme";
import { deleteAccount } from "@/services/firebase/authService";
import { updateUserProfile } from "@/services/firebase/socialService";
import { showErrorToast, showSuccessToast } from "@/utils/toast";
import { router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { Alert, View } from "react-native";

export default function AccountSettingsScreen() {
    const { colors, spacing } = useThemeStyles();
    const { user } = useAuth();
    const [displayName, setDisplayName] = useState(user?.displayName || "");
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        if (user?.displayName) {
            setDisplayName(user.displayName);
        }
    }, [user?.displayName]);

    const handleSave = async () => {
        if (displayName.trim().length < 3) {
            showErrorToast("Display name must be at least 3 characters long.");
            return;
        }
        if (displayName.trim().length > 50) {
            showErrorToast("Display name cannot exceed 50 characters.");
            return;
        }

        setLoading(true);
        try {
            await updateUserProfile(displayName.trim());
            showSuccessToast("Display name updated successfully!");
        } catch (error: any) {
            showErrorToast(error.message || "Failed to update display name.");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            "Delete Account",
            "Are you absolutely sure? This action is irreversible and will permanently delete all your goals, streaks, and account data.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        setDeleting(true);
                        try {
                            await deleteAccount();
                            showSuccessToast("Account deleted successfully.");
                            // The useAuth hook will handle navigation on auth state change
                        } catch (error: any) {
                            showErrorToast(error.message || "Failed to delete account.");
                            setDeleting(false);
                        }
                    },
                },
            ],
        );
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            {/* Header */}
            <HStack
                style={{
                    paddingHorizontal: spacing.lg,
                    paddingVertical: spacing.md,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                }}
                align="center"
                justify="space-between"
            >
                <Button variant="ghost" size="sm" onPress={() => router.back()}>
                    <ArrowLeft size={20} color={colors.foreground} />
                </Button>
                <Heading size="lg" style={{ flex: 1, textAlign: "center" }}>
                    Account Settings
                </Heading>
                <View style={{ width: 20 }} />
                {/* Placeholder for spacing */}
            </HStack>

            <Container
                padding="lg"
                style={{ flex: 1, justifyContent: "space-between" }}
            >
                <VStack spacing="xl">
                    <VStack spacing="sm">
                        <Body weight="medium">Display Name</Body>
                        <Input
                            placeholder="Enter your display name"
                            value={displayName}
                            onChangeText={setDisplayName}
                        />
                    </VStack>
                    <Button
                        onPress={handleSave}
                        loading={loading}
                        disabled={
                            loading || deleting || displayName === (user?.displayName || "")
                        }
                    >
                        Save Changes
                    </Button>

                    <Button
                        variant="outline"
                        onPress={() => router.push("/change-password")}
                    >
                        Change Password
                    </Button>
                </VStack>

                <VStack spacing="md" style={{ marginTop: spacing.xl }}>
                    <Heading size="lg" color="destructive">
                        Danger Zone
                    </Heading>
                    <Caption color="muted">
                        These actions are permanent and cannot be undone.
                    </Caption>
                    <Button
                        variant="destructive"
                        onPress={handleDeleteAccount}
                        loading={deleting}
                        disabled={deleting || loading}
                    >
                        Delete Account
                    </Button>
                </VStack>
            </Container>
        </SafeAreaView>
    );
}
