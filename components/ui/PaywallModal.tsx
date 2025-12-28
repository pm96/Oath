import React from "react";
import { View, ScrollView, TouchableOpacity } from "react-native";
import { Modal, VStack, HStack, Heading, Body, Caption, Button, Card } from "./index";
import { useThemeStyles } from "@/hooks/useTheme";
import { Check, Flame, Infinity, ShieldCheck, Trophy, X } from "lucide-react-native";

export interface PaywallModalProps {
    visible: boolean;
    onClose: () => void;
    onUpgrade?: () => void;
}

const PRO_FEATURES = [
    {
        icon: <Infinity size={20} color="#8B5CF6" />,
        title: "Unlimited Habits",
        description: "Track as many goals as you want. No more 3-habit limit."
    },
    {
        icon: <Flame size={20} color="#F59E0B" />,
        title: "Streak Repair",
        description: "Accidentally missed a day? Pro users can repair broken streaks once per month."
    },
    {
        icon: <ShieldCheck size={20} color="#10B981" />,
        title: "Privacy Controls",
        description: "Advanced controls over who can see your progress and shame scores."
    },
    {
        icon: <Trophy size={20} color="#3B82F6" />,
        title: "Pro Badge",
        description: "Stand out on the leaderboards with a unique Pro member badge."
    }
];

export function PaywallModal({ visible, onClose, onUpgrade }: PaywallModalProps) {
    const { colors, spacing } = useThemeStyles();

    return (
        <Modal visible={visible} onClose={onClose} title="" size="lg">
            <ScrollView showsVerticalScrollIndicator={false}>
                <VStack spacing="xl" style={{ padding: 20, paddingTop: 0 }}>
                    {/* Hero Section */}
                    <VStack align="center" spacing="md" style={{ marginTop: 10 }}>
                        <View style={{ 
                            width: 80, 
                            height: 80, 
                            borderRadius: 40, 
                            backgroundColor: colors.primary + '15',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Flame size={40} color={colors.primary} />
                        </View>
                        <Heading size="xxl" align="center">Go Pro</Heading>
                        <Body color="muted" align="center" style={{ paddingHorizontal: 20 }}>
                            Unlock your full potential and support the community.
                        </Body>
                    </VStack>

                    {/* Features List */}
                    <VStack spacing="md">
                        {PRO_FEATURES.map((feature, index) => (
                            <HStack key={index} spacing="md" align="flex-start">
                                <View style={{ marginTop: 2 }}>{feature.icon}</View>
                                <VStack style={{ flex: 1 }} spacing="xs">
                                    <Body weight="semibold">{feature.title}</Body>
                                    <Caption color="muted">{feature.description}</Caption>
                                </VStack>
                            </HStack>
                        ))}
                    </VStack>

                    {/* Pricing Card */}
                    <Card variant="elevated" padding="lg" style={{ backgroundColor: colors.primary }}>
                        <VStack align="center" spacing="sm">
                            <Body style={{ color: colors.primaryForeground }} weight="medium">MONTHLY ACCESS</Body>
                            <Heading size="xxl" style={{ color: colors.primaryForeground }}>$4.99 / mo</Heading>
                            <Caption style={{ color: colors.primaryForeground, opacity: 0.8 }}>Cancel anytime. No commitment.</Caption>
                        </VStack>
                    </Card>

                    {/* Action Buttons */}
                    <VStack spacing="sm">
                        <Button 
                            variant="primary" 
                            onPress={() => onUpgrade?.()}
                            style={{ height: 56 }}
                        >
                            Start 7-Day Free Trial
                        </Button>
                        <Button 
                            variant="ghost" 
                            onPress={onClose}
                        >
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
