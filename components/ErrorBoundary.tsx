import { Button, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import React, { Component, ErrorInfo, ReactNode } from "react";
import { ScrollView } from "react-native";

/**
 * ErrorBoundary Component
 *
 * Catches React errors in child components and displays a fallback UI
 * Requirement 1.4, 2.1: Add error boundaries for React components
 */

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI
        return {
            hasError: true,
            error,
            errorInfo: null,
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Log error details for debugging
        console.error("ErrorBoundary caught an error:", error, errorInfo);

        this.setState({
            error,
            errorInfo,
        });

        // TODO: Send error to error tracking service (e.g., Sentry)
    }

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    render() {
        if (this.state.hasError) {
            // Custom fallback UI
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Default fallback UI
            return (
                <ScrollView className="flex-1 bg-background-0">
                    <VStack className="flex-1 p-6 justify-center" space="xl">
                        <VStack space="md">
                            <Heading size="xl">Something went wrong</Heading>
                            <Text>
                                We encountered an unexpected error. Please try again or restart
                                the app.
                            </Text>
                        </VStack>

                        {__DEV__ && this.state.error && (
                            <VStack space="sm" className="p-4 bg-error-100 rounded-lg">
                                <Text className="font-semibold text-error-700">
                                    Error Details (Development Only):
                                </Text>
                                <Text className="text-sm text-error-600">
                                    {this.state.error.toString()}
                                </Text>
                                {this.state.errorInfo && (
                                    <Text className="text-xs text-error-500">
                                        {this.state.errorInfo.componentStack}
                                    </Text>
                                )}
                            </VStack>
                        )}

                        <Button onPress={this.handleReset}>
                            <ButtonText>Try Again</ButtonText>
                        </Button>
                    </VStack>
                </ScrollView>
            );
        }

        return this.props.children;
    }
}
