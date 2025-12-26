/**
 * CelebrationSettings component for managing celebration preferences
 * Requirements: 3.2 - User control over celebration effects
 */

import { useCelebrations } from "@/hooks/useCelebrations";
import { useTheme } from "@/hooks/useTheme";
import React from "react";
import {
    ActivityIndicator,
    StyleSheet,
    Switch,
    Text,
    View,
} from "react-native";

export interface CelebrationSettingsProps {
    title?: string;
    showTitle?: boolean;
}

/**
 * Settings component for celebration preferences
 */
export const CelebrationSettings: React.FC<CelebrationSettingsProps> = ({
    title = "Celebration Settings",
    showTitle = true,
}) => {
    const { theme } = useTheme();
    const { preferences, loading, updatePreference } = useCelebrations();

    if (loading) {
        return (
            <View
                style={[styles.container, { backgroundColor: theme.colors.background }]}
            >
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                    <Text
                        style={[
                            styles.loadingText,
                            { color: theme.colors.mutedForeground },
                        ]}
                    >
                        Loading preferences...
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <View
            style={[styles.container, { backgroundColor: theme.colors.background }]}
        >
            {showTitle && (
                <Text style={[styles.title, { color: theme.colors.foreground }]}>
                    {title}
                </Text>
            )}

            <View style={styles.settingsContainer}>
                {/* Sound Effects */}
                <View style={styles.settingRow}>
                    <View style={styles.settingInfo}>
                        <Text
                            style={[styles.settingLabel, { color: theme.colors.foreground }]}
                        >
                            Sound Effects
                        </Text>
                        <Text
                            style={[
                                styles.settingDescription,
                                { color: theme.colors.mutedForeground },
                            ]}
                        >
                            Play celebration sounds for achievements
                        </Text>
                    </View>
                    <Switch
                        value={preferences.soundEnabled}
                        onValueChange={(value) => updatePreference("soundEnabled", value)}
                        trackColor={{
                            false: theme.colors.border,
                            true: theme.colors.primary,
                        }}
                        thumbColor={
                            preferences.soundEnabled
                                ? theme.colors.background
                                : theme.colors.mutedForeground
                        }
                    />
                </View>

                {/* Haptic Feedback */}
                <View style={styles.settingRow}>
                    <View style={styles.settingInfo}>
                        <Text
                            style={[styles.settingLabel, { color: theme.colors.foreground }]}
                        >
                            Haptic Feedback
                        </Text>
                        <Text
                            style={[
                                styles.settingDescription,
                                { color: theme.colors.mutedForeground },
                            ]}
                        >
                            Feel vibrations for celebrations and interactions
                        </Text>
                    </View>
                    <Switch
                        value={preferences.hapticEnabled}
                        onValueChange={(value) => updatePreference("hapticEnabled", value)}
                        trackColor={{
                            false: theme.colors.border,
                            true: theme.colors.primary,
                        }}
                        thumbColor={
                            preferences.hapticEnabled
                                ? theme.colors.background
                                : theme.colors.mutedForeground
                        }
                    />
                </View>

                {/* Confetti Animations */}
                <View style={styles.settingRow}>
                    <View style={styles.settingInfo}>
                        <Text
                            style={[styles.settingLabel, { color: theme.colors.foreground }]}
                        >
                            Confetti Animations
                        </Text>
                        <Text
                            style={[
                                styles.settingDescription,
                                { color: theme.colors.mutedForeground },
                            ]}
                        >
                            Show confetti effects for milestone achievements
                        </Text>
                    </View>
                    <Switch
                        value={preferences.confettiEnabled}
                        onValueChange={(value) =>
                            updatePreference("confettiEnabled", value)
                        }
                        trackColor={{
                            false: theme.colors.border,
                            true: theme.colors.primary,
                        }}
                        thumbColor={
                            preferences.confettiEnabled
                                ? theme.colors.background
                                : theme.colors.mutedForeground
                        }
                    />
                </View>

                {/* Reduced Motion */}
                <View style={styles.settingRow}>
                    <View style={styles.settingInfo}>
                        <Text
                            style={[styles.settingLabel, { color: theme.colors.foreground }]}
                        >
                            Reduce Motion
                        </Text>
                        <Text
                            style={[
                                styles.settingDescription,
                                { color: theme.colors.mutedForeground },
                            ]}
                        >
                            Minimize animations for accessibility
                        </Text>
                    </View>
                    <Switch
                        value={preferences.reducedMotion}
                        onValueChange={(value) => updatePreference("reducedMotion", value)}
                        trackColor={{
                            false: theme.colors.border,
                            true: theme.colors.primary,
                        }}
                        thumbColor={
                            preferences.reducedMotion
                                ? theme.colors.background
                                : theme.colors.mutedForeground
                        }
                    />
                </View>
            </View>

            <Text style={[styles.note, { color: theme.colors.mutedForeground }]}>
                These settings help customize your celebration experience. Changes are
                saved automatically.
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
        margin: 16,
        borderRadius: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    loadingContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 20,
    },
    loadingText: {
        marginLeft: 8,
        fontSize: 14,
    },
    title: {
        fontSize: 18,
        fontWeight: "600",
        marginBottom: 16,
    },
    settingsContainer: {
        gap: 16,
    },
    settingRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 8,
    },
    settingInfo: {
        flex: 1,
        marginRight: 16,
    },
    settingLabel: {
        fontSize: 16,
        fontWeight: "500",
        marginBottom: 2,
    },
    settingDescription: {
        fontSize: 14,
        lineHeight: 20,
    },
    note: {
        fontSize: 12,
        marginTop: 16,
        textAlign: "center",
        fontStyle: "italic",
    },
});

export default CelebrationSettings;
