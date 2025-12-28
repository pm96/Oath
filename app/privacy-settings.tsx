import {
    Body,
    Button,
    Caption,
    Container,
    Heading,
    HStack,
    VStack,
} from "@/components/ui";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { useAuth } from "@/hooks/useAuth";
import { useThemeStyles } from "@/hooks/useTheme";
import { updatePrivacySettings } from "@/services/firebase/socialService";
import { showErrorToast, showSuccessToast } from "@/utils/toast";
import { router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { Switch, View } from "react-native";

export default function PrivacySettingsScreen() {
    const { colors, spacing } = useThemeStyles();
    const { user } = useAuth();

    // Initialize state from user data, with defaults
    const [isSearchable, setIsSearchable] = useState(true);
    const [defaultShare, setDefaultShare] = useState(true);

    useEffect(() => {
        if (user?.privacySettings) {
            setIsSearchable(user.privacySettings.isSearchable ?? true);
            setDefaultShare(user.privacySettings.defaultShare ?? true);
        }
    }, [user]);

    const handleSettingChange = async (
        setting: "isSearchable" | "defaultShare",
        value: boolean,
    ) => {
        if (!user?.uid) return;

        // Optimistic UI update
        if (setting === "isSearchable") {
            setIsSearchable(value);
        } else if (setting === "defaultShare") {
            setDefaultShare(value);
        }

        try {
            await updatePrivacySettings(user.uid, { [setting]: value });
            showSuccessToast("Privacy setting updated.");
        } catch (error: any) {
            showErrorToast(error.message || "Failed to update setting.");
            // Revert UI on error
            if (setting === "isSearchable") {
                setIsSearchable(!value);
            } else if (setting === "defaultShare") {
                setDefaultShare(!value);
            }
        }
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
                    Privacy Settings
                </Heading>
                <View style={{ width: 40 }} />
                {/* Placeholder for spacing */}
            </HStack>

            <Container padding="lg" style={{ flex: 1 }}>
                <VStack spacing="xl">
                    {/* Profile Visibility */}
                    <HStack align="center" justify="space-between">
                        <VStack style={{ flex: 1, marginRight: spacing.md }}>
                            <Body weight="medium">Profile Discoverability</Body>
                            <Caption color="muted">
                                Allow others to find you by searching for your name or email.
                            </Caption>
                        </VStack>
                        <Switch
                            value={isSearchable}
                            onValueChange={(value) =>
                                handleSettingChange("isSearchable", value)
                            }
                            trackColor={{ false: colors.muted, true: colors.success }}
                            thumbColor={colors.background}
                        />
                    </HStack>

                    {/* Default Habit Sharing */}
                    <HStack align="center" justify="space-between">
                        <VStack style={{ flex: 1, marginRight: spacing.md }}>
                            <Body weight="medium">Default Habit Sharing</Body>
                            <Caption color="muted">
                                Automatically set new habits to be shared with your friends.
                            </Caption>
                        </VStack>
                        <Switch
                            value={defaultShare}
                            onValueChange={(value) =>
                                handleSettingChange("defaultShare", value)
                            }
                            trackColor={{ false: colors.muted, true: colors.success }}
                            thumbColor={colors.background}
                        />
                    </HStack>
                </VStack>
            </Container>
        </SafeAreaView>
    );
}
