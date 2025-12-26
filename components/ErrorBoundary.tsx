import { Button } from "@/components/ui/Button";
import { VStack } from "@/components/ui/Stack";
import { Heading, Text } from "@/components/ui/Text";
import * as Clipboard from "expo-clipboard";
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
                <ScrollView>
                    <VStack spacing="xl">
                        <VStack spacing="md">
                            <Heading size="xl">Something went wrong</Heading>
                            <Text>
                                We encountered an unexpected error. Please try again or restart
                                the app.
                            </Text>
                        </VStack>

                        {this.state.error && (
                            <VStack spacing="sm">
                                <Text>Error Details (Development Only):</Text>
                                <Text
                                    selectable
                                    style={{ maxWidth: "100%" }}
                                >
                                    {this.state.error.toString()}
                                </Text>
                                {this.state.errorInfo && (
                                    <Text>{this.state.errorInfo.componentStack}</Text>
                                )}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onPress={() =>
                                        this.state.error &&
                                        Clipboard.setStringAsync(
                                            `${this.state.error.toString()}\n${this.state.errorInfo?.componentStack ?? ""
                                            }`,
                                        )
                                    }
                                >
                                    Copy details
                                </Button>
                            </VStack>
                        )}

                        <Button onPress={this.handleReset}>Try Again</Button>
                    </VStack>
                </ScrollView>
            );
        }

        return this.props.children;
    }
}
