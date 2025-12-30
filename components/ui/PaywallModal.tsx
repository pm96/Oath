import { useAuth } from "@/hooks/useAuth";
import { useThemeStyles } from "@/hooks/useTheme";
import { upgradeToPro } from "@/services/firebase/subscriptionService";
import { Flame, Infinity, ShieldCheck, Trophy } from "lucide-react-native";
import React, { useState } from "react";
import { ScrollView, View } from "react-native";
import { Button } from "./Button";
import { Card } from "./Card";
import { HStack } from "./hstack/index";
import { Modal } from "./Modal";
import { Body, Caption, Heading } from "./Text";
import { VStack } from "./vstack/index";

export interface PaywallModalProps {
    visible: boolean;
    onClose: () => void;
    onUpgrade?: () => void;
}

const PRO_FEATURES = [
    {
        icon: <Infinity size={20} color="#8B5CF6" />,
        title: "Unlimited Habits",
        description: "Track as many goals as you want. No more 3-habit limit.",
    },
    {
        icon: <Flame size={20} color="#F59E0B" />,
        title: "Streak Repair",
        description:
            "Accidentally missed a day? Pro users can repair broken streaks once per month.",
    },
    {
        icon: <ShieldCheck size={20} color="#10B981" />,
        title: "Privacy Controls",
        description:
            "Advanced controls over who can see your progress and shame scores.",
    },
    {
        icon: <Trophy size={20} color="#3B82F6" />,
        title: "Pro Badge",
        description:
            "Stand out on the leaderboards with a unique Pro member badge.",
    },
];

export function PaywallModal({
    visible,
    onClose,
    onUpgrade,
}: PaywallModalProps) {
    const { colors } = useThemeStyles();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    const handleUpgrade = async () => {
        setLoading(true);
        try {
            await upgradeToPro();
            onUpgrade?.();
            onClose();
        } catch (e) {
            // Error handled by service toast
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} onClose={onClose} title="" size="lg">
            <ScrollView showsVerticalScrollIndicator={false}>
                <VStack space="xl" style={{ padding: 20, paddingTop: 0 }}>
                    {/* Hero Section */}
                    <VStack space="md" style={{ marginTop: 10, alignItems: "center" }}>
                        <View
                            style={{
                                width: 80,
                                height: 80,
                                borderRadius: 40,
                                backgroundColor: colors.primary + "15",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <Flame size={40} color={colors.primary} />
                        </View>
                        <Heading size="xxl" align="center">
                            Go Pro
                        </Heading>
                        <Body
                            color="muted"
                            align="center"
                            style={{ paddingHorizontal: 20 }}
                        >
                            Unlock your full potential and support the community.
                        </Body>
                    </VStack>

                    {/* Features List */}
                    <VStack space="md">
                        {PRO_FEATURES.map((feature, index) => (
                            <HStack
                                key={index}
                                space="md"
                                style={{ alignItems: "flex-start" }}
                            >
                                <View style={{ marginTop: 2 }}>{feature.icon}</View>
                                <VStack style={{ flex: 1 }} space="xs">
                                    <Body weight="semibold">{feature.title}</Body>
                                    <Caption color="muted">{feature.description}</Caption>
                                </VStack>
                            </HStack>
                        ))}
                    </VStack>

                    {/* Pricing Card */}
                    <Card
                        variant="elevated"
                        padding="lg"
                        style={{ backgroundColor: colors.primary }}
                    >
                        <VStack space="sm" style={{ alignItems: "center" }}>
                            <Body style={{ color: colors.primaryForeground }} weight="medium">
                                MONTHLY ACCESS
                            </Body>
                            <Heading size="xxl" style={{ color: colors.primaryForeground }}>
                                $4.99 / mo
                            </Heading>
                            <Caption
                                style={{ color: colors.primaryForeground, opacity: 0.8 }}
                            >
                                Cancel anytime. No commitment.
                            </Caption>
                        </VStack>
                    </Card>

                    {/* Action Buttons */}
                    <VStack space="sm">
                        <Button
                            variant="primary"
                            onPress={handleUpgrade}
                            loading={loading}
                            disabled={loading}
                            style={{ height: 56 }}
                        >
                            Start 7-Day Free Trial
                        </Button>
                        <Button variant="ghost" onPress={onClose} disabled={loading}>
                            Maybe Later
                        </Button>
                    </VStack>

                    <Caption color="muted" align="center" size="xs">
                        By upgrading, you agree to our Terms of Service and Privacy Policy.
                    </Caption>
                </VStack>
            </ScrollView>
        </Modal>
    );
}
