import { Button, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Input, InputField } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { useAuth } from "@/hooks/useAuth";
import {
    validateDisplayName,
    validateEmail,
    validatePassword,
} from "@/utils/errorHandling";
import { showErrorToast } from "@/utils/toast";
import { Redirect, router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform } from "react-native";

/**
 * CreateAccountScreen
 *
 * UI for new user registration with Firestore user initialization
 * Requirements: 1.1, 1.3, 1.4, 8.4
 *
 * Protected route: Redirects authenticated users to home
 */
export default function CreateAccount() {
    const { signUp, user, loading: authLoading } = useAuth();
    const [displayName, setDisplayName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);

    // Redirect to home if already authenticated
    if (!authLoading && user) {
        return <Redirect href="/(tabs)" />;
    }

    /**
     * Validate form inputs using centralized validation
     * Requirement 1.4: Display appropriate error messages
     */
    const validateForm = (): string | null => {
        const displayNameError = validateDisplayName(displayName);
        if (displayNameError) return displayNameError;

        const emailError = validateEmail(email);
        if (emailError) return emailError;

        const passwordError = validatePassword(password);
        if (passwordError) return passwordError;

        if (!confirmPassword) {
            return "Please confirm your password";
        }

        if (password !== confirmPassword) {
            return "Passwords do not match";
        }

        return null;
    };

    /**
     * Handle account creation
     * Requirements 1.1, 1.3: Create user account and initialize Firestore document
     * Requirement 1.4: Display user-friendly error messages
     */
    const handleCreateAccount = async () => {
        // Validate form
        const validationError = validateForm();
        if (validationError) {
            showErrorToast(validationError, "Validation Error");
            return;
        }

        setLoading(true);
        try {
            // Requirement 1.1: Create new user account with unique userId
            // Requirement 1.3: Initialize user document with displayName, shameScore=0, empty friends array
            await signUp(email.trim(), password, displayName.trim());
            // Navigation is handled automatically by AuthProvider state change
            router.replace("/(tabs)");
        } catch (error: any) {
            // Requirement 1.4: Display appropriate error message
            showErrorToast(
                error.message || "Account creation failed",
                "Account Creation Failed",
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
        >
            <VStack className="flex-1 p-6 justify-center" space="xl">
                <VStack space="md">
                    <Heading size="2xl">Create Account</Heading>
                    <Text>Sign up to get started.</Text>
                </VStack>

                <VStack space="lg">
                    <Input>
                        <InputField
                            placeholder="Display Name"
                            value={displayName}
                            onChangeText={setDisplayName}
                            autoCapitalize="words"
                            autoComplete="name"
                            editable={!loading}
                        />
                    </Input>

                    <Input>
                        <InputField
                            placeholder="Email"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoComplete="email"
                            editable={!loading}
                        />
                    </Input>

                    <Input>
                        <InputField
                            placeholder="Password"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            autoComplete="password-new"
                            editable={!loading}
                        />
                    </Input>

                    <Input>
                        <InputField
                            placeholder="Confirm Password"
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry
                            autoComplete="password-new"
                            editable={!loading}
                        />
                    </Input>

                    <Button onPress={handleCreateAccount} disabled={loading}>
                        <ButtonText>
                            {loading ? "Creating account..." : "Create Account"}
                        </ButtonText>
                    </Button>

                    <Button
                        variant="link"
                        onPress={() => router.push("/sign-in")}
                        disabled={loading}
                    >
                        <ButtonText>Already have an account? Sign in</ButtonText>
                    </Button>
                </VStack>
            </VStack>
        </KeyboardAvoidingView>
    );
}
