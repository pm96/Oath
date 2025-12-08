import { GoalForm, GoalList } from "@/components/goals";
import { Button, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { useAuth } from "@/hooks/useAuth";
import { useGoals } from "@/hooks/useGoals";
import { showErrorToast, showSuccessToast } from "@/utils/toast";
import React, { useState } from "react";
import { Modal } from "react-native";

/**
 * Home screen with goal management
 * Requirements: 2.1, 2.2, 2.3, 2.5, 8.1, 8.2, 8.5
 */
export default function Home() {
    const { signOut } = useAuth();
    const { goals, loading, createGoal, completeGoal, refresh } = useGoals();
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [signingOut, setSigningOut] = useState(false);

    const handleSignOut = async () => {
        setSigningOut(true);
        try {
            await signOut();
        } catch (error: any) {
            showErrorToast(error.message || "Sign out failed", "Sign Out Failed");
        } finally {
            setSigningOut(false);
        }
    };

    const handleCreateGoal = async (goalInput: any) => {
        try {
            await createGoal(goalInput);
            setShowCreateForm(false);
            showSuccessToast("Goal created successfully!");
        } catch (error: any) {
            showErrorToast(error.message || "Failed to create goal", "Error");
        }
    };

    const handleCompleteGoal = async (goalId: string) => {
        try {
            await completeGoal(goalId);
            showSuccessToast("Goal completed!");
        } catch (error: any) {
            showErrorToast(error.message || "Failed to complete goal", "Error");
        }
    };

    /**
     * Handle pull-to-refresh
     * Requirement 8.5: Add pull-to-refresh functionality
     */
    const handleRefresh = () => {
        if (refresh) {
            refresh();
        }
    };

    return (
        <VStack className="flex-1">
            {/* Header - Requirement 8.3: Touch targets at least 44x44 pixels */}
            <VStack className="p-4 pb-2" space="sm">
                <HStack className="justify-between items-center">
                    <Heading size="xl">My Goals</Heading>
                    <Button
                        size="sm"
                        variant="outline"
                        onPress={handleSignOut}
                        disabled={signingOut}
                        style={{ minWidth: 44, minHeight: 44 }}
                    >
                        <ButtonText>{signingOut ? "..." : "Sign Out"}</ButtonText>
                    </Button>
                </HStack>
                <Button
                    onPress={() => setShowCreateForm(true)}
                    style={{ minHeight: 44 }}
                >
                    <ButtonText>+ Create New Goal</ButtonText>
                </Button>
            </VStack>

            {/* Goals List with pull-to-refresh - Requirements 8.1, 8.5 */}
            <GoalList
                goals={goals}
                onComplete={handleCompleteGoal}
                loading={loading}
                onRefresh={handleRefresh}
            />

            {/* Create Goal Modal */}
            <Modal
                visible={showCreateForm}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowCreateForm(false)}
            >
                <VStack className="flex-1 bg-background-0">
                    <VStack className="p-4 border-b border-background-200">
                        <Heading size="lg">Create New Goal</Heading>
                    </VStack>
                    <GoalForm
                        onSubmit={handleCreateGoal}
                        onCancel={() => setShowCreateForm(false)}
                    />
                </VStack>
            </Modal>
        </VStack>
    );
}
