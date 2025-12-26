import { useThemeStyles } from "@/hooks/useTheme";
import {
    AccessibilityManager,
    AccessibilityRoles,
} from "@/utils/accessibility";
import { HapticFeedback } from "@/utils/celebrations";
import React, { useEffect, useRef } from "react";
import {
    AccessibilityInfo,
    Dimensions,
    Modal as RNModal,
    Pressable,
    StyleSheet,
    Text,
    TextStyle,
    TouchableOpacity,
    View,
    ViewStyle,
    findNodeHandle,
} from "react-native";

export interface ModalProps {
    visible: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    showCloseButton?: boolean;
    size?: "sm" | "md" | "lg" | "full";
}

export function Modal({
    visible,
    onClose,
    title,
    children,
    showCloseButton = true,
    size = "md",
}: ModalProps) {
    const { colors, spacing, borderRadius, typography } = useThemeStyles();
    const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
    const modalContentRef = useRef<View>(null);

    // Focus management for modal accessibility
    useEffect(() => {
        if (visible) {
            // Announce modal opening to screen readers
            const announcement = title ? `Modal opened: ${title}` : "Modal opened";
            AccessibilityManager.announce(announcement);

            // Set focus to modal content after a short delay
            setTimeout(() => {
                if (modalContentRef.current) {
                    // Get the native tag using findNodeHandle
                    const reactTag = findNodeHandle(modalContentRef.current);
                    if (reactTag) {
                        AccessibilityInfo.setAccessibilityFocus(reactTag);
                    }
                }
            }, 100);
        }
    }, [visible, title]);

    const getModalWidth = () => {
        const sizes = {
            sm: Math.min(screenWidth * 0.8, 400),
            md: Math.min(screenWidth * 0.9, 500),
            lg: Math.min(screenWidth * 0.95, 600),
            full: screenWidth,
        };
        return sizes[size];
    };

    const getModalHeight = () => {
        if (size === "full") return screenHeight;
        // Give non-full modals a minimum height
        const minHeights = {
            sm: Math.min(screenHeight * 0.4, 300),
            md: Math.min(screenHeight * 0.6, 500),
            lg: Math.min(screenHeight * 0.7, 600),
        };
        return minHeights[size as keyof typeof minHeights] || minHeights.md;
    };

    const overlayStyles: ViewStyle = {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
        padding: size === "full" ? 0 : spacing.md,
    };

    const modalStyles: ViewStyle = {
        backgroundColor: colors.background,
        borderRadius: size === "full" ? 0 : borderRadius.lg,
        width: getModalWidth(),
        height: getModalHeight(),
        maxHeight: size === "full" ? undefined : screenHeight * 0.9,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 8,
    };

    const headerStyles: ViewStyle = {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    };

    const titleStyles: TextStyle = {
        fontSize: typography.sizes.lg,
        fontWeight: "600",
        color: colors.foreground,
        flex: 1,
    };

    const closeButtonStyles: ViewStyle = {
        padding: spacing.xs,
        marginLeft: spacing.md,
    };

    const closeButtonTextStyles: TextStyle = {
        fontSize: typography.sizes.lg,
        color: colors.mutedForeground,
    };

    const handleClose = () => {
        // Haptic feedback for modal close
        // Requirement 3.2: Subtle micro-interactions throughout the app
        HapticFeedback.selection();
        onClose();
    };

    const contentStyles: ViewStyle = {
        flex: 1,
        padding: spacing.lg,
    };

    return (
        <RNModal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
            accessible={true}
            accessibilityViewIsModal={true}
        >
            <View style={overlayStyles}>
                <Pressable
                    style={StyleSheet.absoluteFill}
                    onPress={handleClose}
                    accessible={true}
                    accessibilityRole={AccessibilityRoles.button}
                    accessibilityLabel="Close modal"
                    accessibilityHint="Tap to close the modal"
                />
                <View
                    ref={modalContentRef}
                    style={modalStyles}
                    accessible={true}
                    accessibilityLabel={title || "Modal content"}
                >
                    {(title || showCloseButton) && (
                        <View style={headerStyles}>
                            {title && (
                                <Text
                                    style={titleStyles}
                                    accessible={true}
                                    accessibilityRole={AccessibilityRoles.heading}
                                >
                                    {title}
                                </Text>
                            )}
                            {showCloseButton && (
                                <TouchableOpacity
                                    style={closeButtonStyles}
                                    onPress={handleClose}
                                    accessible={true}
                                    accessibilityRole={AccessibilityRoles.button}
                                    accessibilityLabel="Close modal"
                                    accessibilityHint="Double tap to close this modal"
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
                                    <Text style={closeButtonTextStyles}>×</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                    <View style={contentStyles}>{children}</View>
                </View>
            </View>
        </RNModal>
    );
}
