/**
 * Performance-optimized FlatList component
 * Requirements: 4.4 - Optimize performance for low-end devices
 */

import {
    getDevicePerformanceTier,
    getOptimizedFlatListProps,
} from "@/utils/performance";
import React from "react";
import { FlatList, FlatListProps, ListRenderItem } from "react-native";

interface OptimizedFlatListProps<T> extends Omit<
    FlatListProps<T>,
    "renderItem"
> {
    data: T[];
    renderItem: ListRenderItem<T>;
    keyExtractor: (item: T, index: number) => string;
    estimatedItemSize?: number;
}

/**
 * Optimized FlatList that adjusts performance settings based on device capabilities
 */
export function OptimizedFlatList<T>({
    data,
    renderItem,
    keyExtractor,
    estimatedItemSize,
    ...props
}: OptimizedFlatListProps<T>) {
    const performanceTier = getDevicePerformanceTier();
    const optimizedProps = getOptimizedFlatListProps(performanceTier);
    const {
        getItemLayout: optimizedGetItemLayout,
        ...restOptimizedProps
    } = optimizedProps as typeof optimizedProps & {
        getItemLayout?: FlatListProps<T>["getItemLayout"];
    };

    // Generate getItemLayout if estimatedItemSize is provided
    const getItemLayout = estimatedItemSize
        ? (data: any, index: number) => ({
            length: estimatedItemSize,
            offset: estimatedItemSize * index,
            index,
        })
        : undefined;

    return (
        <FlatList
            data={data}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            getItemLayout={getItemLayout ?? optimizedGetItemLayout}
            {...restOptimizedProps}
            {...props}
        />
    );
}

/**
 * Memoized list item wrapper to prevent unnecessary re-renders
 */
export function MemoizedListItem<T>({
    item,
    index,
    renderItem,
}: {
    item: T;
    index: number;
    renderItem: ListRenderItem<T>;
}) {
    return React.useMemo(
        () => renderItem({ item, index, separators: {} as any }),
        [item, index, renderItem],
    );
}

/**
 * Hook for optimizing FlatList performance
 */
export function useOptimizedFlatList<T>(data: T[]) {
    const [visibleRange, setVisibleRange] = React.useState({ start: 0, end: 10 });

    const onViewableItemsChanged = React.useCallback(
        ({ viewableItems }: { viewableItems: any[] }) => {
            if (viewableItems.length > 0) {
                const start = viewableItems[0].index || 0;
                const end = viewableItems[viewableItems.length - 1].index || 0;
                setVisibleRange({ start, end });
            }
        },
        [],
    );

    const viewabilityConfig = React.useMemo(
        () => ({
            itemVisiblePercentThreshold: 50,
            minimumViewTime: 100,
        }),
        [],
    );

    return {
        visibleRange,
        onViewableItemsChanged,
        viewabilityConfig,
    };
}
