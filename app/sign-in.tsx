import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal, VStack } from "@/components/ui";
import { Heading, Text } from "@/components/ui/Text";
import { useAuth } from "@/hooks/useAuth";
import { validateEmail, validatePassword } from "@/utils/errorHandling";
import { showErrorToast, showSuccessToast } from "@/utils/toast";
import { Redirect, router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View, TouchableOpacity } from "react-native";

/**
 * SignInScreen
 *
 * UI for existing users to authenticate
 * Requirements: 1.2, 1.4, 8.4
 *
 * Protected route: Redirects authenticated users to home
 */
export default function SignIn() {
    const { signIn, sendPasswordReset, user, loading: authLoading } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    
    // Password reset state
    const [showResetModal, setShowResetModal] = useState(false);
    const [resetEmail, setResetEmail] = useState("");
    const [resetLoading, setResetLoading] = useState(false);

    // Redirect to home if already authenticated
    if (!authLoading && user) {
        return <Redirect href="/(tabs)" />;
    }

    /**
     * Validate form inputs using centralized validation
     * Requirement 1.4: Display appropriate error messages
     */
    const validateForm = (): string | null => {
        const emailError = validateEmail(email);
        if (emailError) return emailError;

        const passwordError = validatePassword(password);
        if (passwordError) return passwordError;

        return null;
    };

    /**
     * Handle sign in
     * Requirement 1.2: Authenticate user and grant access to their data
     * Requirement 1.4: Display user-friendly error messages
     */
    const handleSignIn = async () => {
        // Validate form
        const validationError = validateForm();
        if (validationError) {
            showErrorToast(validationError, "Validation Error");
            return;
        }

        setLoading(true);
        try {
            await signIn(email.trim(), password);
            // Navigation is handled automatically by AuthProvider state change
            router.replace("/(tabs)");
        } catch (error: any) {
            // Requirement 1.4: Display appropriate error message
            showErrorToast(error.message || "Sign in failed", "Sign In Failed");
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async () => {
        const error = validateEmail(resetEmail);
        if (error) {
            showErrorToast(error, "Invalid Email");
            return;
        }

        setResetLoading(true);
        try {
            await sendPasswordReset(resetEmail.trim());
            showSuccessToast("Password reset email sent! Check your inbox.");
            setShowResetModal(false);
            setResetEmail("");
        } catch (error: any) {
            showErrorToast(error.message || "Failed to send reset email");
        } finally {
            setResetLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
        >
            <ScrollView
                contentContainerStyle={{
                    flexGrow: 1,
                    padding: 24,
                    justifyContent: "center",
                }}
                keyboardShouldPersistTaps="handled"
            >
                <View style={{ gap: 32 }}>
                    <View style={{ gap: 16 }}>
                        <Heading size="xl">Sign In</Heading>
                        <Text>Welcome back! Sign in to continue.</Text>
                    </View>

                    <View style={{ gap: 24 }}>
                        <Input
                            placeholder="Email"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoComplete="email"
                            editable={!loading}
                        />

                        <View style={{ gap: 8 }}>
                            <Input
                                placeholder="Password"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                                autoComplete="password"
                                editable={!loading}
                            />
                            <TouchableOpacity 
                                onPress={() => {
                                    setResetEmail(email);
                                    setShowResetModal(true);
                                }}
                                style={{ alignSelf: 'flex-end' }}
                            >
                                <Text style={{ fontSize: 14, color: '#3b82f6', fontWeight: '500' }}>
                                    Forgot Password?
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <Button onPress={handleSignIn} disabled={loading}>
                            {loading ? "Signing in..." : "Sign In"}
                        </Button>

                        <Button
                            variant="ghost"
                            onPress={() => router.push("/create-account")}
                            disabled={loading}
                        >
                            Don&apos;t have an account? Create one
                        </Button>
                    </View>
                </View>
            </ScrollView>

            {/* Password Reset Modal */}
            <Modal
                visible={showResetModal}
                onClose={() => !resetLoading && setShowResetModal(false)}
                title="Reset Password"
            >
                <VStack spacing="lg" style={{ padding: 20 }}>
                    <Text>
                        Enter your email address and we'll send you a link to reset your password.
                    </Text>
                    <Input
                        placeholder="Email Address"
                        value={resetEmail}
                        onChangeText={setResetEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        editable={!resetLoading}
                    />
                    <Button 
                        onPress={handleResetPassword} 
                        loading={resetLoading}
                        disabled={!resetEmail}
                    >
                        Send Reset Link
                    </Button>
                    <Button 
                        variant="ghost" 
                        onPress={() => setShowResetModal(false)}
                        disabled={resetLoading}
                    >
                        Cancel
                    </Button>
                </VStack>
            </Modal>
        </KeyboardAvoidingView>
    );
}
