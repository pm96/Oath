import React, { useState, useRef } from "react";
import { View, ScrollView, Dimensions, Image, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { VStack, HStack, Heading, Body, Button, Container } from "@/components/ui";
import { useThemeStyles } from "@/hooks/useTheme";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Flame, Users, Shield, Trophy } from "lucide-react-native";

const { width } = Dimensions.get("window");

const ONBOARDING_DATA = [
    {
        title: "Welcome to Oath",
        description: "The social accountability app that uses positive pressure to help you crush your goals.",
        icon: <Flame size={100} color="#F59E0B" />,
        // Image path would go here: source: require("@/assets/images/onboarding1.png")
    },
    {
        title: "Avoid the Shame",
        description: "Consistency is key. If you miss a goal, your status turns Red and your friends get notified.",
        icon: <Shield size={100} color="#EF4444" />,
    },
    {
        title: "Social Accountability",
        description: "Connect with friends, nudge them to stay active, and high-five their streaks.",
        icon: <Users size={100} color="#3B82F6" />,
    },
    {
        title: "Reach the Top",
        description: "Build streaks, achieve milestones, and climb the Accountability Board.",
        icon: <Trophy size={100} color="#10B981" />,
    }
];

export default function Onboarding() {
    const { colors, spacing } = useThemeStyles();
    const [activeIndex, setActiveTab] = useState(0);
    const scrollRef = useRef<ScrollView>(null);

    const handleNext = async () => {
        if (activeIndex < ONBOARDING_DATA.length - 1) {
            scrollRef.current?.scrollTo({ x: (activeIndex + 1) * width, animated: true });
            setActiveTab(activeIndex + 1);
        } else {
            await completeOnboarding();
        }
    };

    const completeOnboarding = async () => {
        try {
            await AsyncStorage.setItem("@onboarding_completed", "true");
            router.replace("/(tabs)");
        } catch (error) {
            console.error("Failed to save onboarding status", error);
            router.replace("/(tabs)");
        }
    };

    const handleScroll = (event: any) => {
        const x = event.nativeEvent.contentOffset.x;
        const index = Math.round(x / width);
        setActiveTab(index);
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView
                ref={scrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                style={{ flex: 1 }}
            >
                {ONBOARDING_DATA.map((item, index) => (
                    <View key={index} style={{ width, flex: 1, justifyContent: 'center' }}>
                        <Container padding="lg">
                            <VStack align="center" spacing="xl">
                                <View style={styles.iconContainer}>
                                    {/* Placeholder for images when they exist */}
                                    {/* <Image source={item.source} style={styles.image} /> */}
                                    {item.icon}
                                </View>
                                <VStack align="center" spacing="md">
                                    <Heading size="xxl" align="center">{item.title}</Heading>
                                    <Body color="muted" align="center" style={{ paddingHorizontal: 20 }}>
                                        {item.description}
                                    </Body>
                                </VStack>
                            </VStack>
                        </Container>
                    </View>
                ))}
            </ScrollView>

            <VStack spacing="lg" style={{ padding: 24 }}>
                {/* Pagination Dots */}
                <HStack justify="center" spacing="sm">
                    {ONBOARDING_DATA.map((_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.dot,
                                {
                                    backgroundColor: activeIndex === index ? colors.primary : colors.muted,
                                    width: activeIndex === index ? 24 : 8,
                                }
                            ]}
                        />
                    ))}
                </HStack>

                <Button 
                    variant="primary" 
                    onPress={handleNext}
                    style={{ height: 56 }}
                >
                    {activeIndex === ONBOARDING_DATA.length - 1 ? "Get Started" : "Continue"}
                </Button>

                {activeIndex < ONBOARDING_DATA.length - 1 && (
                    <TouchableOpacity onPress={completeOnboarding}>
                        <Body color="muted" align="center">Skip Introduction</Body>
                    </TouchableOpacity>
                )}
            </VStack>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    iconContainer: {
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: 'rgba(0,0,0,0.03)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    image: {
        width: 200,
        height: 200,
        resizeMode: 'contain',
    },
    dot: {
        height: 8,
        borderRadius: 4,
    }
});
