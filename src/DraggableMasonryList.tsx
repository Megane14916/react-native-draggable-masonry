import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, InteractionManager, LayoutChangeEvent, View } from 'react-native';

import Animated, {
    runOnJS,
    useAnimatedRef,
    useAnimatedScrollHandler,
    useFrameCallback,
    useScrollViewOffset,
    useSharedValue
} from 'react-native-reanimated';
import { calculateColumnLayout, distributeToColumns } from './masonry';
import MasonryItem from './MasonryItem';
import {
    DEFAULT_PROPS,
    type DraggableMasonryListProps,
    type MasonryItem as MasonryItemType,
} from './types';

function throttle(func: Function, limit: number) {
    let inThrottle: boolean;
    return function (this: any, ...args: any[]) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

function DraggableMasonryList<T extends MasonryItemType>({
    data,
    renderItem,
    keyExtractor = (item) => item.id,
    sortEnabled = DEFAULT_PROPS.sortEnabled,
    columns: numColumns = DEFAULT_PROPS.columns,
    rowGap = DEFAULT_PROPS.rowGap,
    columnGap = DEFAULT_PROPS.columnGap,
    dragActivationDelay = DEFAULT_PROPS.dragActivationDelay,
    activationAnimationDuration = DEFAULT_PROPS.activationAnimationDuration,
    dropAnimationDuration = DEFAULT_PROPS.dropAnimationDuration,
    overDrag = DEFAULT_PROPS.overDrag,
    activeItemScale = DEFAULT_PROPS.activeItemScale,
    activeItemOpacity = DEFAULT_PROPS.activeItemOpacity,
    activeItemShadowOpacity = DEFAULT_PROPS.activeItemShadowOpacity,
    inactiveItemOpacity = DEFAULT_PROPS.inactiveItemOpacity,
    inactiveItemScale = DEFAULT_PROPS.inactiveItemScale,
    autoScrollEnabled = DEFAULT_PROPS.autoScrollEnabled,
    autoScrollActivationOffset = DEFAULT_PROPS.autoScrollActivationOffset,
    autoScrollSpeed = DEFAULT_PROPS.autoScrollSpeed,
    itemEntering,
    itemExiting,
    onDragStart,
    onDragEnd,
    onOrderChange,
    contentContainerStyle,
}: DraggableMasonryListProps<T>) {
    const [containerWidth, setContainerWidth] = useState(0);

    // Calculate gap (use columnGap for horizontal, rowGap for vertical)
    const gap = Math.max(rowGap, columnGap);

    // Primary State
    const [columns, setColumns] = useState<T[][]>(() =>
        distributeToColumns(data as MasonryItemType[], numColumns) as T[][]
    );

    const [activeDragId, setActiveDragId] = useState<string | null>(null);

    // Track numColumns to detect column count changes
    const prevNumColumnsRef = useRef(numColumns);

    // Recalculate columns only when:
    // 1. Number of columns changes
    // 2. Items are added or removed (not just reordered)
    useEffect(() => {
        const columnsChanged = prevNumColumnsRef.current !== numColumns;

        // Get current column item IDs
        const currentColumnIds = new Set(columns.flat().map(item => item.id));
        const dataIds = new Set(data.map(item => item.id));

        // Check if items were added or removed (not just reordered)
        const itemsAdded = data.some(item => !currentColumnIds.has(item.id));
        const itemsRemoved = columns.flat().some(item => !dataIds.has(item.id));
        const itemCountChanged = itemsAdded || itemsRemoved;

        if ((columnsChanged || itemCountChanged) && !activeDragId) {
            setColumns(distributeToColumns(data as MasonryItemType[], numColumns) as T[][]);
        }

        prevNumColumnsRef.current = numColumns;
    }, [data, numColumns, columns]);

    // Synchronous Ref for Drag Logic
    const columnsRef = useRef(columns);

    // Sync Ref with State
    useEffect(() => {
        columnsRef.current = columns;
    }, [columns]);

    // Visual Layout (for Rendering)
    const layout = useMemo(() => {
        return calculateColumnLayout({
            columns,
            numColumns,
            containerWidth: containerWidth || Dimensions.get('window').width,
            gap,
        });
    }, [columns, numColumns, containerWidth, gap]);

    const handleLayout = (e: LayoutChangeEvent) => {
        setContainerWidth(e.nativeEvent.layout.width);
    };

    const handleDragStart = useCallback((id: string, startScrollY: number, initialScreenY: number) => {
        setActiveDragId(id);
        isDraggingShared.value = true;
        scrollYRef.current = startScrollY; // Sync initial scroll pos
        dragScreenYRef.current = initialScreenY; // Initialize drag pos
        // Ensure ref is fresh at start
        columnsRef.current = columns;
    }, [columns]);

    const handleDragEnd = useCallback((id: string) => {
        setActiveDragId(null);
        isDraggingShared.value = false;

        // Find the item's final position
        let fromIndex = -1;
        let toIndex = -1;
        const flatData = columns.flat();

        for (let i = 0; i < data.length; i++) {
            if (keyExtractor(data[i]) === id) {
                fromIndex = i;
                break;
            }
        }
        for (let i = 0; i < flatData.length; i++) {
            if (keyExtractor(flatData[i]) === id) {
                toIndex = i;
                break;
            }
        }

        if (onDragEnd) {
            onDragEnd({
                key: id,
                fromIndex,
                toIndex,
                data: flatData,
            });
        }

        if (onOrderChange) {
            onOrderChange({
                key: id,
                fromIndex,
                toIndex,
            });
        }
    }, [columns, data, keyExtractor, onDragEnd, onOrderChange]);

    // Scroll Tracking with Reanimated - using useAnimatedRef for worklet scrollTo
    const scrollViewRef = useAnimatedRef<Animated.ScrollView>();
    const scrollOffset = useScrollViewOffset(scrollViewRef);
    const scrollY = useSharedValue(0); // For MasonryItem compatibility
    const scrollYRef = useRef(0); // JS thread sync

    const isDraggingShared = useSharedValue(false);
    const dragY = useSharedValue(0);
    const dragStartScrollY = useSharedValue(0); // Shared with MasonryItem, updated during auto-scroll
    const autoScrollOffset = useSharedValue(0); // Pseudo-scroll offset (translateY for all items)
    const totalContentHeight = useSharedValue(0); // Content height for scroll limits

    // Update totalContentHeight SharedValue when layout changes
    useEffect(() => {
        totalContentHeight.value = layout.totalHeight;
    }, [layout.totalHeight, totalContentHeight]);

    // JS thread function for updating scroll ref - must be defined before use in worklet
    const updateScrollRef = (y: number) => {
        scrollYRef.current = y;
    };

    // Combined Handler: Updates SharedValue (UI) and Ref (JS)
    const onScrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollY.value = event.contentOffset.y;
            // Only update JS ref if dragging (to prevent crash on excessive bridge calls)
            if (isDraggingShared.value) {
                runOnJS(updateScrollRef)(event.contentOffset.y);
            }
        },
    });

    // Drag Position Tracking for Auto-Scroll
    const dragScreenYRef = useRef(0);

    // Capture height for UI thread usage as a SharedValue
    const windowHeightShared = useSharedValue(Dimensions.get('window').height);


    // Auto-Scroll using useFrameCallback with setActive() pattern
    // Uses pseudo-scroll approach: update autoScrollOffset instead of actual scrollTo

    // Parse autoScrollActivationOffset (can be number or [top, bottom] tuple)
    const topThreshold = Array.isArray(autoScrollActivationOffset)
        ? autoScrollActivationOffset[0]
        : autoScrollActivationOffset;
    const bottomThreshold = Array.isArray(autoScrollActivationOffset)
        ? autoScrollActivationOffset[1]
        : autoScrollActivationOffset;

    const frameCallback = useFrameCallback(() => {
        'worklet';

        const screenY = dragY.value;
        const windowHeight = windowHeightShared.value;
        const currentScroll = scrollOffset.value;

        // Thresholds from props
        const TOP_THRESHOLD = topThreshold;
        const BOTTOM_THRESHOLD = bottomThreshold;
        const MAX_SPEED = autoScrollSpeed;

        let scrollDelta = 0;

        if (screenY < TOP_THRESHOLD && screenY > 0) {
            // Scroll UP (move content DOWN = positive delta)
            // Use squared intensity for acceleration effect - closer to edge = faster
            const intensity = (TOP_THRESHOLD - screenY) / TOP_THRESHOLD;
            scrollDelta = MAX_SPEED * intensity * intensity;
        } else if (screenY > windowHeight - BOTTOM_THRESHOLD) {
            // Scroll DOWN (move content UP = negative delta)
            // Use squared intensity for acceleration effect - closer to edge = faster
            const intensity = (screenY - (windowHeight - BOTTOM_THRESHOLD)) / BOTTOM_THRESHOLD;
            scrollDelta = -MAX_SPEED * intensity * intensity;
        }

        if (Math.abs(scrollDelta) > 0.1) {
            // Calculate maximum scroll limits
            const maxScrollUp = currentScroll; // Can't scroll past top

            // Calculate max downward scroll based on content height
            // When autoScrollOffset is negative, we're scrolling down (content moving up)
            // Add 200px buffer so the bottom items are fully visible
            const BOTTOM_BUFFER = 200;
            const maxScrollableDown = Math.max(0, totalContentHeight.value - windowHeight - currentScroll + BOTTOM_BUFFER);
            const maxScrollDown = -maxScrollableDown;

            let newAutoScrollOffset = autoScrollOffset.value + scrollDelta;
            newAutoScrollOffset = Math.min(newAutoScrollOffset, maxScrollUp); // Limit upward scroll
            newAutoScrollOffset = Math.max(newAutoScrollOffset, maxScrollDown); // Limit downward scroll

            autoScrollOffset.value = newAutoScrollOffset;
        }
    }, false); // Start inactive, activated on drag start

    // Activate/deactivate frameCallback based on drag state
    // Also handle autoScrollOffset reset when drag ends
    useEffect(() => {
        if (activeDragId !== null) {
            frameCallback.setActive(true);
        } else {
            frameCallback.setActive(false);

            // Compensate for pseudo-scroll by adjusting ScrollView position
            const pseudoScrollAmount = autoScrollOffset.value;

            if (Math.abs(pseudoScrollAmount) > 1) {
                const currentScroll = scrollYRef.current;
                const newScroll = Math.max(0, currentScroll - pseudoScrollAmount);

                // Scroll first
                const scrollView = scrollViewRef.current;
                if (scrollView) {
                    (scrollView as any).scrollTo?.({ y: newScroll, animated: false });
                    scrollYRef.current = newScroll;
                    scrollY.value = newScroll;
                }
            }

            // Reset autoScrollOffset after interactions complete to prevent flash
            InteractionManager.runAfterInteractions(() => {
                autoScrollOffset.value = 0;
            });
        }
    }, [activeDragId, frameCallback, autoScrollOffset, scrollY]);

    /* Removed JS Interval Loop */

    const handleDragChange = useMemo(() => throttle((id: string, x: number, y: number, screenY: number) => {
        // Update Ref for Auto-Scroll
        dragScreenYRef.current = screenY;

        const currentColumns = columnsRef.current;
        // ... (rest of the logic)

        // Calculate Layout SYNCHRONOUSLY based on current Ref State
        // This ensures we are making decisions on the exact state we hold, 
        // not waiting for React render.
        const currentLayout = calculateColumnLayout({
            columns: currentColumns,
            numColumns,
            containerWidth: containerWidth || Dimensions.get('window').width,
            gap: 10,
        });

        const draggedItemPos = currentLayout.positions[id];
        if (!draggedItemPos) return;

        const columnWidth = (containerWidth - (numColumns - 1) * 10) / numColumns;
        const centerX = x + draggedItemPos.width / 2;

        let targetColIndex = Math.floor(centerX / (columnWidth + 10));
        targetColIndex = Math.max(0, Math.min(numColumns - 1, targetColIndex));

        // Adjust Y position for pseudo-scroll offset
        // autoScrollOffset > 0 means content moved down, so logical Y should be lower
        const adjustedY = y - autoScrollOffset.value;
        const centerY = adjustedY + draggedItemPos.height / 2;
        const targetColItems = currentColumns[targetColIndex];
        let targetRowIndex = targetColItems.length;

        for (let i = 0; i < targetColItems.length; i++) {
            const item = targetColItems[i];
            if (item.id === id) continue;

            // Use the synchronous layout for comparison
            const pos = currentLayout.positions[item.id];
            if (!pos) continue;

            const itemCenterY = pos.y + pos.height / 2;
            if (centerY < itemCenterY) {
                targetRowIndex = i;
                break;
            }
        }

        let sourceColIndex = -1;
        let sourceRowIndex = -1;

        for (let c = 0; c < currentColumns.length; c++) {
            const index = currentColumns[c].findIndex(it => it.id === id);
            if (index !== -1) {
                sourceColIndex = c;
                sourceRowIndex = index;
                break;
            }
        }

        if (sourceColIndex === -1) return;

        // Check No-Op
        let finalTargetIndex = targetRowIndex;
        if (sourceColIndex === targetColIndex) {
            if (sourceRowIndex === targetRowIndex) return;
            if (sourceRowIndex < targetRowIndex) {
                finalTargetIndex -= 1;
                if (sourceRowIndex === finalTargetIndex) return;
            }
        }

        const newCols = currentColumns.map(c => [...c]);

        // SWAP Logic for Cross-Column (when targeting an existing item)
        // We only swap if we are hovering over an item (targetRowIndex < length)
        // AND it's a different column.
        if (sourceColIndex !== targetColIndex && targetRowIndex < newCols[targetColIndex].length) {
            // Swap source item with target item
            const sourceItem = newCols[sourceColIndex][sourceRowIndex];
            const targetItem = newCols[targetColIndex][targetRowIndex];

            newCols[targetColIndex][targetRowIndex] = sourceItem;
            newCols[sourceColIndex][sourceRowIndex] = targetItem;
        }
        else {
            // Standard Insert Logic (Same column OR appending to empty space)
            const [movedItem] = newCols[sourceColIndex].splice(sourceRowIndex, 1);
            newCols[targetColIndex].splice(finalTargetIndex, 0, movedItem);
        }

        // --- Height Balancing Logic ---
        // Check if columns are unbalanced by HEIGHT.
        // If one column is significantly taller, move its tail item to the shorter column.

        const BALANCE_THRESHOLD = 300; // Pixel threshold (approx 1.5 cards)
        // Safety break
        let iterations = 0;
        let heightBalanced = false;

        while (!heightBalanced && iterations < 2) {
            iterations++;

            // Calculate Heights
            const colHeights = newCols.map(col => col.reduce((sum, item) => sum + item.height + 10, 0));

            let minH = Infinity;
            let maxH = -Infinity;
            let minColIdx = -1;
            let maxColIdx = -1;

            for (let c = 0; c < newCols.length; c++) {
                if (colHeights[c] < minH) { minH = colHeights[c]; minColIdx = c; }
                if (colHeights[c] > maxH) { maxH = colHeights[c]; maxColIdx = c; }
            }

            if (maxH - minH > BALANCE_THRESHOLD) {
                const tallCol = newCols[maxColIdx];
                if (tallCol.length === 0) { heightBalanced = true; break; }

                let itemToMoveIdx = tallCol.length - 1;
                const itemToMove = tallCol[itemToMoveIdx];

                // CRITICAL: Do NOT auto-move the item the user is currently dragging.
                if (itemToMove.id === id) {
                    itemToMoveIdx--;
                }

                if (itemToMoveIdx >= 0) {
                    const [balancingItem] = newCols[maxColIdx].splice(itemToMoveIdx, 1);
                    newCols[minColIdx].push(balancingItem);
                } else {
                    heightBalanced = true;
                }
            } else {
                heightBalanced = true;
            }
        }

        // Update Ref immediately
        columnsRef.current = newCols;

        // Trigger Render
        setColumns(newCols);

    }, 16), [containerWidth, numColumns]); // Throttle ~60fps (16ms)

    return (
        <View onLayout={handleLayout} style={{ flex: 1 }}>
            <Animated.ScrollView
                ref={scrollViewRef}
                onScroll={onScrollHandler}
                scrollEventThrottle={16}
                contentContainerStyle={[{ height: layout.totalHeight + 100 }, contentContainerStyle]}
            >
                {columns.flat().map((item, flatIndex) => {
                    const pos = layout.positions[item.id];
                    if (!pos) return null;

                    return (
                        <MasonryItem
                            key={keyExtractor(item)}
                            id={keyExtractor(item)}
                            x={pos.x}
                            y={pos.y}
                            width={pos.width}
                            height={pos.height}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                            onDragChange={handleDragChange}
                            isDragging={activeDragId === keyExtractor(item)}
                            scrollY={scrollY}
                            dragY={dragY}
                            dragStartScrollY={dragStartScrollY}
                            autoScrollOffset={autoScrollOffset}
                            sortEnabled={sortEnabled}
                            dragActivationDelay={dragActivationDelay}
                            activationAnimationDuration={activationAnimationDuration}
                            dropAnimationDuration={dropAnimationDuration}
                            overDrag={overDrag}
                            activeItemScale={activeItemScale}
                            activeItemOpacity={activeItemOpacity}
                            activeItemShadowOpacity={activeItemShadowOpacity}
                            inactiveItemOpacity={inactiveItemOpacity}
                            inactiveItemScale={inactiveItemScale}
                            itemEntering={itemEntering}
                            itemExiting={itemExiting}
                            containerWidth={containerWidth}
                            containerHeight={layout.totalHeight}
                        >
                            {renderItem({ item, index: flatIndex })}
                        </MasonryItem>
                    );
                })}
            </Animated.ScrollView>
        </View>
    );
}

export default DraggableMasonryList;
