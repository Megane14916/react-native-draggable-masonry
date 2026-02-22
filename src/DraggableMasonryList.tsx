import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import type { SharedValue } from 'react-native-reanimated';
import Animated, {
    Easing,
    runOnJS,
    scrollTo,
    useAnimatedRef,
    useAnimatedScrollHandler,
    useAnimatedStyle,
    useFrameCallback,
    useScrollViewOffset,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import MasonryItem from './MasonryItem';
import type {
    ColumnLayout,
    DraggableMasonryListProps,
    ItemPosition,
    MasonryItem as MasonryItemType
} from './types';
import { DEFAULT_PROPS } from './types';

/**
 * 1次元配列からレイアウトを計算（最も低いカラムに配置）
 */
function calculateLayout<T extends MasonryItemType>(
    data: T[],
    numColumns: number,
    containerWidth: number,
    rowGap: number,
    columnGap: number,
    keyExtractor: (item: T) => string
): ColumnLayout {
    const columnWidth = (containerWidth - (numColumns - 1) * columnGap) / numColumns;
    const columnHeights = new Array(numColumns).fill(0);
    const positions: Record<string, ItemPosition> = {};

    for (const item of data) {
        let minHeight = columnHeights[0];
        let minColumn = 0;
        for (let c = 1; c < numColumns; c++) {
            if (columnHeights[c] < minHeight) {
                minHeight = columnHeights[c];
                minColumn = c;
            }
        }

        const x = minColumn * (columnWidth + columnGap);
        const y = columnHeights[minColumn];

        positions[keyExtractor(item)] = {
            x,
            y,
            width: columnWidth,
            height: item.height,
            column: minColumn,
        };

        columnHeights[minColumn] += item.height + rowGap;
    }

    const totalHeight = Math.max(...columnHeights, 0);
    return { positions, totalHeight };
}

/**
 * ドラッグ位置から挿入インデックスを計算（直感的なMasonryレイアウト対応）
 * 
 * アルゴリズム:
 * 1. ドラッグアイテムの中心がどのカラムにあるかを判定
 * 2. 同じカラム内のアイテムとのみ入れ替えを行う
 * 3. Y座標に基づいて挿入位置を決定
 */
function findInsertIndex<T extends MasonryItemType>(
    dragX: number,
    dragY: number,
    dragWidth: number,
    dragHeight: number,
    data: T[],
    positions: Record<string, ItemPosition>,
    keyExtractor: (item: T) => string,
    dragId: string,
    currentInsertIndex: number,
    numColumns: number,
    columnGap: number
): number {
    const dragCenterX = dragX + dragWidth / 2;
    const dragCenterY = dragY + dragHeight / 2;

    const filteredData = data.filter(item => keyExtractor(item) !== dragId);

    if (filteredData.length === 0) return 0;

    // カラム幅を計算
    const firstPos = Object.values(positions)[0];
    if (!firstPos) return 0;
    const columnWidth = firstPos.width;

    // ドラッグアイテムがどのカラムにいるかを判定
    const dragColumn = Math.floor(dragCenterX / (columnWidth + columnGap));
    const clampedColumn = Math.max(0, Math.min(dragColumn, numColumns - 1));

    // 同じカラム内のアイテムのみを抽出（Y座標でソート）
    const sameColumnItems: { item: T; originalIndex: number; pos: ItemPosition }[] = [];

    for (let i = 0; i < filteredData.length; i++) {
        const item = filteredData[i];
        const pos = positions[keyExtractor(item)];
        if (!pos) continue;

        const itemColumn = Math.floor(pos.x / (columnWidth + columnGap));
        if (itemColumn === clampedColumn) {
            sameColumnItems.push({ item, originalIndex: i, pos });
        }
    }

    // 同じカラムにアイテムがない場合
    if (sameColumnItems.length === 0) {
        // 全アイテムのY座標を見て、適切な位置に挿入
        let insertIndex = 0;
        for (let i = 0; i < filteredData.length; i++) {
            const item = filteredData[i];
            const pos = positions[keyExtractor(item)];
            if (!pos) continue;

            const itemCenterY = pos.y + pos.height / 2;
            if (dragCenterY > itemCenterY) {
                insertIndex = i + 1;
            }
        }
        return insertIndex;
    }

    // Y座標でソート
    sameColumnItems.sort((a, b) => a.pos.y - b.pos.y);

    // 同じカラム内でY位置に基づいて挿入位置を決定
    for (const { originalIndex, pos } of sameColumnItems) {
        const threshold = pos.y + pos.height * 1;
        if (dragCenterY < threshold) {
            return originalIndex;
        }
    }

    // 全てより下にいる場合は最後のアイテムの後
    const lastItem = sameColumnItems[sameColumnItems.length - 1];
    return lastItem.originalIndex + 1;
}


/**
 * 可視範囲内のアイテムをフィルタリング
 */
function filterVisibleItems<T extends MasonryItemType>(
    data: T[],
    positions: Record<string, ItemPosition>,
    scrollY: number,
    viewportHeight: number,
    overscanPixels: number,
    keyExtractor: (item: T) => string,
    activeDragId: string | null
): T[] {
    const visibleTop = scrollY - overscanPixels;
    const visibleBottom = scrollY + viewportHeight + overscanPixels;

    return data.filter(item => {
        if (activeDragId && keyExtractor(item) === activeDragId) {
            return true;
        }

        const pos = positions[keyExtractor(item)];
        if (!pos) return false;

        const itemTop = pos.y;
        const itemBottom = pos.y + pos.height;

        return itemBottom >= visibleTop && itemTop <= visibleBottom;
    });
}

/**
 * ドロップインジケーターコンポーネント（アニメーション対応）
 */
interface DropIndicatorProps {
    x: SharedValue<number>;
    y: SharedValue<number>;
    width: SharedValue<number>;
    height: SharedValue<number>;
    opacity: SharedValue<number>;
    style?: any;
}

const DropIndicator = React.memo(({ x, y, width, height, opacity, style }: DropIndicatorProps) => {
    const animatedStyle = useAnimatedStyle(() => ({
        position: 'absolute' as const,
        left: x.value,
        top: y.value,
        width: width.value,
        height: height.value,
        opacity: opacity.value,
    }));

    return (
        <Animated.View
            style={[
                styles.dropIndicator,
                animatedStyle,
                style,
            ]}
        />
    );
});

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
    autoScrollMaxSpeed = DEFAULT_PROPS.autoScrollMaxSpeed,
    autoScrollMinSpeed = DEFAULT_PROPS.autoScrollMinSpeed,
    autoScrollAcceleration = DEFAULT_PROPS.autoScrollAcceleration,
    autoScrollTargetDuration = DEFAULT_PROPS.autoScrollTargetDuration,
    autoScrollDragThreshold = DEFAULT_PROPS.autoScrollDragThreshold,
    virtualizationEnabled = DEFAULT_PROPS.virtualizationEnabled,
    overscanCount = DEFAULT_PROPS.overscanCount,
    dragOverscanCount = DEFAULT_PROPS.dragOverscanCount,
    showDropIndicator = DEFAULT_PROPS.showDropIndicator,
    dropIndicatorStyle,
    itemEntering,
    itemExiting,
    onDragStart,
    onDragEnd,
    onOrderChange,
    contentContainerStyle,
}: DraggableMasonryListProps<T>) {
    const [containerWidth, setContainerWidth] = useState(0);
    const [windowHeight] = useState(() => Dimensions.get('window').height);

    const [activeDragId, setActiveDragId] = useState<string | null>(null);
    const dragStartIndexRef = useRef<number>(-1);

    const [orderedData, setOrderedData] = useState(data);
    const orderedDataRef = useRef(orderedData);

    // 新規追加アイテムを追跡（entering animationは新規アイテムにのみ適用）
    const knownItemIds = useRef<Set<string>>(new Set(data.map(item => keyExtractor(item))));
    const newItemIds = useRef<Set<string>>(new Set());

    const [targetInsertIndex, setTargetInsertIndex] = useState<number>(-1);

    // 仮想化用: 現在のスクロール位置（JS側で追跡）
    const [currentScrollY, setCurrentScrollY] = useState(0);

    // ドロップアニメーション中フラグ（仮想化を遅延再開）
    const [isDropAnimating, setIsDropAnimating] = useState(false);

    // ドロップインジケーター用SharedValues（アニメーション用）
    const dropIndicatorX = useSharedValue(0);
    const dropIndicatorY = useSharedValue(0);
    const dropIndicatorWidth = useSharedValue(0);
    const dropIndicatorHeight = useSharedValue(0);
    const dropIndicatorOpacity = useSharedValue(0);
    const isDropIndicatorVisible = useRef(false);

    useEffect(() => {
        orderedDataRef.current = orderedData;
    }, [orderedData]);

    useEffect(() => {
        // ドロップアニメーション中は外部dataの同期をスキップ（古いdataで上書きするのを防止）
        if (isDropAnimating) return;

        if (!activeDragId) {
            // 新規アイテムを検出
            const currentIds = new Set(data.map(item => keyExtractor(item)));
            const addedIds = new Set<string>();
            currentIds.forEach(id => {
                if (!knownItemIds.current.has(id)) {
                    addedIds.add(id);
                }
            });

            // 新規アイテムを記録
            addedIds.forEach(id => newItemIds.current.add(id));
            knownItemIds.current = currentIds;

            // アニメーション完了後に新規アイテムフラグをクリア
            if (addedIds.size > 0) {
                setTimeout(() => {
                    addedIds.forEach(id => newItemIds.current.delete(id));
                }, 400); // entering animation完了後
            }

            setOrderedData(data);
            orderedDataRef.current = data;
            setTargetInsertIndex(-1);
            // ドロップ後はフェードアウトアニメーション
            if (isDropIndicatorVisible.current) {
                // ドロップアニメーションが完了するまで待ってからフェードアウト
                setTimeout(() => {
                    dropIndicatorOpacity.value = withTiming(0, { duration: 150 });
                    isDropIndicatorVisible.current = false;
                }, dropAnimationDuration);
            }
        }
    }, [data, activeDragId, dropAnimationDuration, keyExtractor, isDropAnimating]);

    // 表示用データ
    const displayData = useMemo(() => {
        if (!activeDragId || targetInsertIndex < 0) {
            return orderedData;
        }

        const draggedItem = orderedData.find(item => keyExtractor(item) === activeDragId);
        if (!draggedItem) return orderedData;

        const withoutDragged = orderedData.filter(item => keyExtractor(item) !== activeDragId);
        const result = [...withoutDragged];
        result.splice(targetInsertIndex, 0, draggedItem);

        return result;
    }, [orderedData, activeDragId, targetInsertIndex, keyExtractor]);

    const layout = useMemo(() => {
        if (containerWidth === 0) {
            return { positions: {}, totalHeight: 0 };
        }
        return calculateLayout(displayData, numColumns, containerWidth, rowGap, columnGap, keyExtractor);
    }, [displayData, numColumns, containerWidth, rowGap, columnGap, keyExtractor]);

    // オートスクロールの閾値を計算
    const [topThreshold, bottomThreshold] = useMemo(() => {
        if (Array.isArray(autoScrollActivationOffset)) {
            return autoScrollActivationOffset;
        }
        return [autoScrollActivationOffset, autoScrollActivationOffset];
    }, [autoScrollActivationOffset]);

    // 仮想化: 可視アイテムのみをフィルタリング
    // オートスクロール中（ドラッグ中）またはドロップアニメーション中は仮想化を停止
    const visibleItems = useMemo(() => {
        // ドラッグ中またはドロップアニメーション中は仮想化を無効化
        if (activeDragId || isDropAnimating) {
            return displayData;
        }
        if (!virtualizationEnabled) {
            return displayData;
        }
        const effectiveOverscan = overscanCount;
        const overscanPixels = effectiveOverscan * windowHeight;

        return filterVisibleItems(
            displayData,
            layout.positions,
            currentScrollY,
            windowHeight,
            overscanPixels,
            keyExtractor,
            activeDragId
        );
    }, [virtualizationEnabled, displayData, layout.positions, currentScrollY, windowHeight, overscanCount, keyExtractor, activeDragId, isDropAnimating]);

    // ドロップインジケータの位置を更新（他のアイテムと同じタイミングで）
    const prevTargetInsertIndex = useRef(-1);
    useEffect(() => {
        if (!showDropIndicator || !activeDragId || targetInsertIndex < 0) {
            prevTargetInsertIndex.current = targetInsertIndex;
            return;
        }

        const pos = layout.positions[activeDragId];
        if (pos) {
            if (!isDropIndicatorVisible.current) {
                // 最初の表示は即座に
                dropIndicatorX.value = pos.x;
                dropIndicatorY.value = pos.y;
                dropIndicatorWidth.value = pos.width;
                dropIndicatorHeight.value = pos.height;
                dropIndicatorOpacity.value = withTiming(1, { duration: 100 });
                isDropIndicatorVisible.current = true;
            } else if (prevTargetInsertIndex.current !== targetInsertIndex) {
                // 位置が変わった場合のみアニメーション
                dropIndicatorX.value = withTiming(pos.x, { duration: dropAnimationDuration, easing: Easing.out(Easing.cubic) });
                dropIndicatorY.value = withTiming(pos.y, { duration: dropAnimationDuration, easing: Easing.out(Easing.cubic) });
                dropIndicatorWidth.value = withTiming(pos.width, { duration: dropAnimationDuration });
                dropIndicatorHeight.value = withTiming(pos.height, { duration: dropAnimationDuration });
            }
        }
        prevTargetInsertIndex.current = targetInsertIndex;
    }, [layout.positions, activeDragId, targetInsertIndex, showDropIndicator, dropAnimationDuration]);

    const layoutWithoutDraggedRef = useRef<ColumnLayout | null>(null);

    const handleLayout = (e: LayoutChangeEvent) => {
        setContainerWidth(e.nativeEvent.layout.width);
    };

    // --- Scroll Tracking ---
    const scrollViewRef = useAnimatedRef<Animated.ScrollView>();
    const scrollOffset = useScrollViewOffset(scrollViewRef);

    const isDraggingShared = useSharedValue(false);
    const dragY = useSharedValue(0);
    const dragStartScrollY = useSharedValue(0);
    const totalContentHeight = useSharedValue(0);
    // オートスクロールゾーンに入った時の画面Y座標（-1 = ゾーン外）
    const autoScrollZoneEntryY = useSharedValue(-1);

    // ScrollViewのNativeViewGesture（PanGestureとの競合解消用）
    const scrollGesture = useMemo(() => Gesture.Native().runOnJS(true), []);

    useEffect(() => {
        totalContentHeight.value = layout.totalHeight;
    }, [layout.totalHeight]);

    // 仮想化用: スクロール位置をJS側で追跡
    const updateScrollY = useCallback((y: number) => {
        setCurrentScrollY(y);
    }, []);

    const onScrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            if (virtualizationEnabled) {
                runOnJS(updateScrollY)(event.contentOffset.y);
            }
        },
    });

    // --- Auto-scroll ---
    // 約60fpsを想定したフレーム時間
    const FRAME_TIME = 1 / 60;

    // オートスクロール開始時の最大速度を保持（-1 = 未設定）
    const lockedMaxSpeed = useSharedValue(-1);
    // 現在のオートスクロール方向（0 = なし、-1 = 上、1 = 下）
    const autoScrollDirection = useSharedValue(0);

    const frameCallback = useFrameCallback(() => {
        'worklet';
        if (!isDraggingShared.value || !autoScrollEnabled) {
            // オートスクロール終了時にリセット
            lockedMaxSpeed.value = -1;
            autoScrollDirection.value = 0;
            autoScrollZoneEntryY.value = -1;
            return;
        }

        const screenY = dragY.value;
        const currentScroll = scrollOffset.value;
        let scrollDelta = 0;

        if (screenY < topThreshold && screenY > 0) {
            // 上端ゾーンに進入
            // ゾーン進入位置を記録（初回のみ）
            if (autoScrollZoneEntryY.value < 0) {
                autoScrollZoneEntryY.value = screenY;
            }

            // 閾値チェック: ゾーン端方向（上方向）への侵入距離が閾値未満ならスキップ
            if (autoScrollDragThreshold > 0) {
                const penetration = autoScrollZoneEntryY.value - screenY;
                if (penetration < autoScrollDragThreshold) {
                    return;
                }
            }

            // 方向が変わったらリセット
            if (autoScrollDirection.value !== -1) {
                lockedMaxSpeed.value = -1;
                autoScrollDirection.value = -1;
            }

            // 最初のフレームで最大速度を計算・固定
            if (lockedMaxSpeed.value < 0) {
                const distanceToEdge = currentScroll;
                const dynamicMaxSpeed = (distanceToEdge / autoScrollTargetDuration) * FRAME_TIME;
                lockedMaxSpeed.value = Math.min(dynamicMaxSpeed, autoScrollMaxSpeed);
            }

            const effectiveMaxSpeed = lockedMaxSpeed.value;

            // 端に近づくにつれて速くなるロジック（従来通り）
            const intensity = (topThreshold - screenY) / topThreshold;
            const speed = autoScrollMinSpeed + (effectiveMaxSpeed - autoScrollMinSpeed) * Math.pow(intensity, autoScrollAcceleration);
            scrollDelta = -speed;
        }
        else if (screenY > windowHeight - bottomThreshold) {
            // 下端ゾーンに進入
            // ゾーン進入位置を記録（初回のみ）
            if (autoScrollZoneEntryY.value < 0) {
                autoScrollZoneEntryY.value = screenY;
            }

            // 閾値チェック: ゾーン端方向（下方向）への侵入距離が閾値未満ならスキップ
            if (autoScrollDragThreshold > 0) {
                const penetration = screenY - autoScrollZoneEntryY.value;
                if (penetration < autoScrollDragThreshold) {
                    return;
                }
            }

            // 方向が変わったらリセット
            if (autoScrollDirection.value !== 1) {
                lockedMaxSpeed.value = -1;
                autoScrollDirection.value = 1;
            }

            // 最初のフレームで最大速度を計算・固定
            if (lockedMaxSpeed.value < 0) {
                // ScrollViewの最大スクロール位置を動的に計算
                // totalContentHeightはcontentContainerStyleと同じ高さ
                const maxScroll = totalContentHeight.value;
                const distanceToEdge = Math.max(0, maxScroll - currentScroll);
                const dynamicMaxSpeed = distanceToEdge > 0
                    ? (distanceToEdge / autoScrollTargetDuration) * FRAME_TIME
                    : autoScrollMinSpeed;
                lockedMaxSpeed.value = Math.max(autoScrollMinSpeed, Math.min(dynamicMaxSpeed, autoScrollMaxSpeed));
            }

            const effectiveMaxSpeed = lockedMaxSpeed.value;

            // 端に近づくにつれて速くなるロジック（従来通り）
            const intensity = (screenY - (windowHeight - bottomThreshold)) / bottomThreshold;
            const speed = autoScrollMinSpeed + (effectiveMaxSpeed - autoScrollMinSpeed) * Math.pow(intensity, autoScrollAcceleration);
            scrollDelta = speed;
        }
        else {
            // オートスクロール領域を離れたらリセット
            lockedMaxSpeed.value = -1;
            autoScrollDirection.value = 0;
            autoScrollZoneEntryY.value = -1;
        }

        if (Math.abs(scrollDelta) > 0.5) {
            // ScrollViewの最大スクロール位置（ScrollViewがこれ以上スクロールしないで制限してくれる）
            const maxScroll = totalContentHeight.value;
            const nextScroll = Math.min(Math.max(0, currentScroll + scrollDelta), maxScroll);
            scrollTo(scrollViewRef, 0, nextScroll, false);
            // ドラッグ中は仮想化を停止しているので、runOnJSによる更新は不要
        }
    }, false);

    useEffect(() => {
        if (activeDragId !== null && sortEnabled) {
            frameCallback.setActive(true);
        } else {
            frameCallback.setActive(false);
        }
    }, [activeDragId, frameCallback, sortEnabled]);

    // --- Drag Handlers ---
    const handleDragStart = useCallback((id: string) => {
        if (!sortEnabled) return;

        setActiveDragId(id);
        isDraggingShared.value = true;

        const withoutDragged = orderedDataRef.current.filter(item => keyExtractor(item) !== id);
        if (containerWidth > 0) {
            layoutWithoutDraggedRef.current = calculateLayout(
                withoutDragged, numColumns, containerWidth, rowGap, columnGap, keyExtractor
            );
        }

        const currentIndex = orderedDataRef.current.findIndex(item => keyExtractor(item) === id);
        dragStartIndexRef.current = currentIndex;
        const indexInFiltered = orderedDataRef.current
            .slice(0, currentIndex)
            .filter(item => keyExtractor(item) !== id).length;
        setTargetInsertIndex(indexInFiltered);

        // ドロップインジケーターを即座に表示（ドラッグ中アイテムの元の位置）
        if (showDropIndicator) {
            const draggedItem = orderedDataRef.current.find(item => keyExtractor(item) === id);
            if (draggedItem) {
                // 元の位置でのレイアウトを計算
                const tempData = [...withoutDragged];
                tempData.splice(indexInFiltered, 0, draggedItem);
                const tempLayout = calculateLayout(tempData, numColumns, containerWidth, rowGap, columnGap, keyExtractor);
                const pos = tempLayout.positions[id];
                if (pos) {
                    dropIndicatorX.value = pos.x;
                    dropIndicatorY.value = pos.y;
                    dropIndicatorWidth.value = pos.width;
                    dropIndicatorHeight.value = pos.height;
                    dropIndicatorOpacity.value = 1; // 即座に表示
                    isDropIndicatorVisible.current = true;
                }
            }
        }

        // コールバック
        if (onDragStart) {
            onDragStart({ key: id, fromIndex: currentIndex });
        }
    }, [keyExtractor, numColumns, containerWidth, rowGap, columnGap, sortEnabled, onDragStart, showDropIndicator]);

    const handleDragEnd = useCallback((id: string) => {
        if (!sortEnabled) return;

        const fromIndex = dragStartIndexRef.current;
        let toIndex = targetInsertIndex;

        if (activeDragId && targetInsertIndex >= 0) {
            const draggedItem = orderedDataRef.current.find(item => keyExtractor(item) === activeDragId);
            if (draggedItem) {
                const withoutDragged = orderedDataRef.current.filter(item => keyExtractor(item) !== activeDragId);
                const newData = [...withoutDragged];
                newData.splice(targetInsertIndex, 0, draggedItem);

                // toIndexを元の配列でのインデックスに変換
                toIndex = newData.findIndex(item => keyExtractor(item) === activeDragId);

                orderedDataRef.current = newData;
                setOrderedData(newData);

                // コールバック
                if (onDragEnd) {
                    onDragEnd({
                        key: id,
                        fromIndex,
                        toIndex,
                        data: newData,
                    });
                }

                if (onOrderChange && fromIndex !== toIndex) {
                    onOrderChange({
                        key: id,
                        fromIndex,
                        toIndex,
                    });
                }
            }
        }

        setActiveDragId(null);
        isDraggingShared.value = false;
        setTargetInsertIndex(-1);
        // ドロップ後に仮想化が再開されるので、現在のスクロール位置を同期
        setCurrentScrollY(scrollOffset.value);
        // ドロップアニメーション中は仮想化を停止し続ける（フラッシュ防止）
        setIsDropAnimating(true);
        setTimeout(() => {
            setIsDropAnimating(false);
        }, dropAnimationDuration + 50); // 余裕を持たせる
        // ドロップインジケーターは遅延してフェードアウト（useEffect内で処理）
        layoutWithoutDraggedRef.current = null;
        dragStartIndexRef.current = -1;
    }, [activeDragId, targetInsertIndex, keyExtractor, sortEnabled, onDragEnd, onOrderChange, scrollOffset, dropAnimationDuration]);

    const handleDragChange = useCallback((id: string, x: number, y: number, screenY: number) => {
        if (!sortEnabled || !layoutWithoutDraggedRef.current) return;

        const draggedItem = orderedDataRef.current.find(item => keyExtractor(item) === id);
        if (!draggedItem) return;

        const columnWidth = (containerWidth - (numColumns - 1) * columnGap) / numColumns;
        const withoutDragged = orderedDataRef.current.filter(item => keyExtractor(item) !== id);

        const newTargetIndex = findInsertIndex(
            x, y, columnWidth, draggedItem.height,
            withoutDragged,
            layoutWithoutDraggedRef.current.positions,
            keyExtractor,
            id,
            targetInsertIndex,
            numColumns,
            columnGap
        );

        if (newTargetIndex !== targetInsertIndex) {
            setTargetInsertIndex(newTargetIndex);
            // ドロップインジケータの位置更新はuseEffect内で行う（他のアイテムと同じタイミングで）
        }
    }, [containerWidth, numColumns, rowGap, columnGap, keyExtractor, targetInsertIndex, sortEnabled]);

    return (
        <View onLayout={handleLayout} style={{ flex: 1 }}>
            <GestureDetector gesture={scrollGesture}>
                <Animated.ScrollView
                    ref={scrollViewRef}
                    onScroll={virtualizationEnabled ? onScrollHandler : undefined}
                    scrollEventThrottle={16}
                    scrollEnabled={!activeDragId}
                    bounces={!activeDragId}
                    contentContainerStyle={[{ height: layout.totalHeight + 100 }, contentContainerStyle]}
                >
                    {/* ドロップインジケーター（アニメーション付き） */}
                    {showDropIndicator && (
                        <DropIndicator
                            x={dropIndicatorX}
                            y={dropIndicatorY}
                            width={dropIndicatorWidth}
                            height={dropIndicatorHeight}
                            opacity={dropIndicatorOpacity}
                            style={dropIndicatorStyle}
                        />
                    )}

                    {visibleItems.map((item) => {
                        const pos = layout.positions[keyExtractor(item)];
                        if (!pos) return null;

                        const originalIndex = displayData.findIndex(d => keyExtractor(d) === keyExtractor(item));
                        const isDragging = activeDragId === keyExtractor(item);

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
                                isDragging={isDragging}
                                scrollOffset={scrollOffset}
                                dragY={dragY}
                                dragStartScrollY={dragStartScrollY}
                                sortEnabled={sortEnabled}
                                dragActivationDelay={dragActivationDelay}
                                activationAnimationDuration={activationAnimationDuration}
                                dropAnimationDuration={dropAnimationDuration}
                                overDrag={overDrag}
                                containerWidth={containerWidth}
                                containerHeight={layout.totalHeight}
                                activeItemScale={isDragging ? activeItemScale : (activeDragId !== null ? inactiveItemScale : 1)}
                                activeItemOpacity={isDragging ? activeItemOpacity : (activeDragId !== null ? inactiveItemOpacity : 1)}
                                activeItemShadowOpacity={activeItemShadowOpacity}
                                isAnyDragging={activeDragId !== null}
                                isNewItem={newItemIds.current.has(keyExtractor(item))}
                                itemEntering={newItemIds.current.has(keyExtractor(item)) ? itemEntering : undefined}
                                itemExiting={itemExiting}
                                scrollGesture={scrollGesture}
                            >
                                {renderItem({ item, index: originalIndex })}
                            </MasonryItem>
                        );
                    })}
                </Animated.ScrollView>
            </GestureDetector>
        </View>
    );
}

const styles = StyleSheet.create({
    dropIndicator: {
        position: 'absolute',
        backgroundColor: 'rgba(0, 122, 255, 0.2)',
        borderWidth: 2,
        borderColor: 'rgba(0, 122, 255, 0.5)',
        borderStyle: 'dashed',
        borderRadius: 8,
    },
});

export default DraggableMasonryList;
