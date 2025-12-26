/**
 * Lazy loading component wrapper
 * Requirements: 4.4 - Implement lazy loading for heavy components
 */

import { LazyComponentLoader } from "@/utils/performance";
import React, { ComponentType, Suspense, lazy } from "react";
import { View, ViewStyle } from "react-native";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { ModalProps } from "./Modal";
import type {
    CelebrationViewProps,
    CelebrationViewRef,
} from "./CelebrationView";
import type { HabitCreationModalProps } from "../habits/HabitCreationModal";

interface LazyComponentProps {
    componentName: string;
    fallback?: React.ComponentType;
    style?: ViewStyle;
    children?: React.ReactNode;
}

/**
 * Higher-order component for lazy loading
 */
export function withLazyLoading<P extends object>(
    componentName: string,
    importFunction: () => Promise<{ default: ComponentType<P> }>,
) {
    const LazyComponent = lazy(importFunction);

    const WrappedComponent = React.forwardRef<any, P & LazyComponentProps>(
        (props, ref) => {
            const { fallback: CustomFallback, style, ...componentProps } = props;

            // Default fallback component
            const DefaultFallback = () => (
                <View style={style}>
                    <LoadingSkeleton height={100} />
                </View>
            );

            const FallbackComponent = CustomFallback || DefaultFallback;

            React.useEffect(() => {
                LazyComponentLoader.markAsLoaded(componentName);
            }, []);

            return (
                <Suspense fallback={<FallbackComponent />}>
                    <LazyComponent ref={ref} {...(componentProps as P)} />
                </Suspense>
            );
        },
    );

    WrappedComponent.displayName = `LazyComponent(${componentName})`;
    return WrappedComponent;
}

/**
 * Lazy loading wrapper component
 */
export function LazyComponent({
    componentName,
    fallback: CustomFallback,
    style,
    children,
}: LazyComponentProps) {
    const [isLoaded, setIsLoaded] = React.useState(
        LazyComponentLoader.isLoaded(componentName),
    );

    React.useEffect(() => {
        if (!isLoaded) {
            // Simulate component loading
            const timer = setTimeout(() => {
                LazyComponentLoader.markAsLoaded(componentName);
                setIsLoaded(true);
            }, 100);

            return () => clearTimeout(timer);
        }
    }, [componentName, isLoaded]);

    if (!isLoaded) {
        if (CustomFallback) {
            return <CustomFallback />;
        }

        return (
            <View style={style}>
                <LoadingSkeleton height={100} />
            </View>
        );
    }

    return <>{children}</>;
}

/**
 * Lazy loading for heavy modal components
 */
export const LazyModal = withLazyLoading<ModalProps>("Modal", () =>
    import("./Modal").then((module) => ({ default: module.Modal })),
);

/**
 * Lazy loading for celebration components
 */
export const LazyCelebrationView = withLazyLoading<
    CelebrationViewProps & React.RefAttributes<CelebrationViewRef>
>("CelebrationView", () =>
    import("./CelebrationView").then((module) => ({
        default: module.CelebrationView,
    })),
);

/**
 * Lazy loading for complex form components
 */
export const LazyHabitCreationModal = withLazyLoading<HabitCreationModalProps>(
    "HabitCreationModal",
    () =>
        import("../habits/HabitCreationModal").then((module) => ({
            default: module.HabitCreationModal,
        })),
);

/**
 * Intersection observer hook for lazy loading on scroll
 */
export function useIntersectionObserver(
    ref: React.RefObject<View>,
    options: {
        threshold?: number;
        rootMargin?: string;
    } = {},
) {
    const [isIntersecting, setIsIntersecting] = React.useState(false);
    const [hasIntersected, setHasIntersected] = React.useState(false);

    React.useEffect(() => {
        // For React Native, we'll use a simple visibility check
        // In a real implementation, you might use react-native-intersection-observer
        // or implement custom scroll-based visibility detection

        const checkVisibility = () => {
            if (ref.current) {
                // Simplified visibility check - in production you'd measure actual viewport intersection
                setIsIntersecting(true);
                setHasIntersected(true);
            }
        };

        // Check immediately
        checkVisibility();

        // For now, we'll just mark as intersecting after a short delay
        const timer = setTimeout(checkVisibility, 100);

        return () => clearTimeout(timer);
    }, [ref]);

    return { isIntersecting, hasIntersected };
}

/**
 * Lazy loading component that loads when it comes into view
 */
export function LazyOnScroll({
    children,
    fallback,
    style,
}: {
    children: React.ReactNode;
    fallback?: React.ComponentType;
    style?: ViewStyle;
}) {
    const ref = React.useRef<View>(null);
    const { hasIntersected } = useIntersectionObserver(
        ref as React.RefObject<View>,
    );

    const FallbackComponent =
        fallback ||
        (() => (
            <View style={style}>
                <LoadingSkeleton height={100} />
            </View>
        ));

    return (
        <View ref={ref} style={style}>
            {hasIntersected ? children : <FallbackComponent />}
        </View>
    );
}
