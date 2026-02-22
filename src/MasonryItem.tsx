import React, { memo } from 'react';
import { Gesture, GestureDetector, type GestureType } from 'react-native-gesture-handler';
import Animated, {
    cancelAnimation,
    Easing,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
    type SharedValue,
} from 'react-native-reanimated';
import type { EntryAnimationType, ExitAnimationType, OverDragType } from './types';

interface MasonryItemProps {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    children: React.ReactNode;
    onDragStart: (id: string) => void;
    onDragEnd: (id: string) => void;
    onDragChange: (id: string, x: number, y: number, screenY: number) => void;
    isDragging: boolean;
    scrollOffset: SharedValue<number>;
    dragY: SharedValue<number>;
    dragStartScrollY: SharedValue<number>;
    // New props
    sortEnabled: boolean;
    dragActivationDelay: number;
    activationAnimationDuration: number;
    dropAnimationDuration: number;
    overDrag: OverDragType;
    containerWidth: number;
    containerHeight: number;
    activeItemScale: number;
    activeItemOpacity: number;
    activeItemShadowOpacity: number;
    isAnyDragging: boolean;
    isNewItem: boolean; // 新規追加アイテムかどうか
    itemEntering?: EntryAnimationType;
    itemExiting?: ExitAnimationType;
    scrollGesture: GestureType;
}

const MasonryItemComponent = ({
    id,
    x,
    y,
    width,
    height,
    children,
    onDragStart,
    onDragEnd,
    onDragChange,
    isDragging,
    scrollOffset,
    dragY,
    dragStartScrollY,
    sortEnabled,
    dragActivationDelay,
    activationAnimationDuration,
    dropAnimationDuration,
    overDrag,
    containerWidth,
    containerHeight,
    activeItemScale,
    activeItemOpacity,
    activeItemShadowOpacity,
    isAnyDragging,
    isNewItem,
    itemEntering,
    itemExiting,
    scrollGesture,
}: MasonryItemProps) => {
    const startX = useSharedValue(0);
    const startY = useSharedValue(0);
    const translationX = useSharedValue(0);
    const translationY = useSharedValue(0);

    const targetX = useSharedValue(x);
    const targetY = useSharedValue(y);

    const animatedX = useSharedValue(x);
    const animatedY = useSharedValue(y);

    // 新規アイテムかつentering animationがある場合のみ、マウント後にフラグを立てる
    const isMounted = useSharedValue(!(isNewItem && itemEntering));

    React.useEffect(() => {
        if (isNewItem && itemEntering) {
            // 新規アイテム＆entering animationがある場合は遅延
            const timer = setTimeout(() => {
                isMounted.value = true;
            }, 400); // entering animation完了を待つ
            return () => clearTimeout(timer);
        } else {
            isMounted.value = true;
        }
    }, []);

    // ドロップ直後フラグ（古い位置へのアニメーションを防止）
    const wasJustDropping = React.useRef(false);
    const prevIsDragging = React.useRef(isDragging);
    const prevX = React.useRef(x);
    const prevY = React.useRef(y);

    // propsが変わったら目標位置を更新（ドラッグ中以外）
    React.useEffect(() => {
        targetX.value = x;
        targetY.value = y;

        // ドラッグ終了を検出
        const justDropped = prevIsDragging.current && !isDragging;
        if (justDropped) {
            wasJustDropping.current = true;
        }
        prevIsDragging.current = isDragging;

        if (!isDragging) {
            // ドロップ直後の場合
            if (wasJustDropping.current) {
                // x,yが変わっていない場合（並び替えなし）でも
                // 現在のドラッグ位置から元の位置へアニメーションが必要
                // ただし、ドロップ直後でx,yがまだ更新されていない場合は
                // 次のレンダリングを待つ
                if (!justDropped && prevX.current === x && prevY.current === y) {
                    // 2回目以降のレンダリングでx,yが同じ場合はスキップ
                    return;
                }
                // フラグをクリアしてアニメーション開始
                wasJustDropping.current = false;
            } else {
                // 通常の位置更新（ドロップ直後でない）
                if (prevX.current === x && prevY.current === y) {
                    // 位置が変わっていなければスキップ
                    return;
                }
            }

            prevX.current = x;
            prevY.current = y;

            cancelAnimation(animatedX);
            cancelAnimation(animatedY);
            animatedX.value = withTiming(x, {
                duration: dropAnimationDuration,
                easing: Easing.out(Easing.cubic),
            });
            animatedY.value = withTiming(y, {
                duration: dropAnimationDuration,
                easing: Easing.out(Easing.cubic),
            });
        }
    }, [x, y, isDragging, dropAnimationDuration]);

    const lastUpdateTime = useSharedValue(0);
    const THROTTLE_MS = 100; // パフォーマンス改善: 50ms→100ms

    const panGesture = Gesture.Pan()
        .enabled(sortEnabled)
        .activateAfterLongPress(dragActivationDelay)
        .simultaneousWithExternalGesture(scrollGesture)
        .onStart((e) => {
            startX.value = targetX.value;
            startY.value = targetY.value;

            cancelAnimation(animatedX);
            cancelAnimation(animatedY);
            animatedX.value = targetX.value;
            animatedY.value = targetY.value;

            dragStartScrollY.value = scrollOffset.value;
            dragY.value = e.absoluteY;
            lastUpdateTime.value = 0;
            runOnJS(onDragStart)(id);
        })
        .onUpdate((e) => {
            let transX = e.translationX;
            let transY = e.translationY;

            // overDrag制限を適用
            if (overDrag !== 'both') {
                const currentX = startX.value + transX;
                const currentY = startY.value + transY;
                const scrollDelta = scrollOffset.value - dragStartScrollY.value;
                const absoluteY = currentY + scrollDelta;

                if (overDrag === 'none' || overDrag === 'vertical') {
                    // 水平方向の制限
                    const minX = 0;
                    const maxX = containerWidth - width;
                    const clampedX = Math.max(minX, Math.min(maxX, currentX));
                    transX = clampedX - startX.value;
                }

                if (overDrag === 'none' || overDrag === 'horizontal') {
                    // 垂直方向の制限
                    const minY = 0;
                    const maxY = containerHeight - height;
                    const clampedY = Math.max(minY, Math.min(maxY, absoluteY));
                    transY = clampedY - startY.value - scrollDelta;
                }
            }

            translationX.value = transX;
            translationY.value = transY;
            dragY.value = e.absoluteY;

            const now = Date.now();
            if (now - lastUpdateTime.value < THROTTLE_MS) {
                return;
            }
            lastUpdateTime.value = now;

            const scrollDelta = scrollOffset.value - dragStartScrollY.value;
            const absoluteX = startX.value + transX;
            const absoluteY = startY.value + transY + scrollDelta;

            runOnJS(onDragChange)(id, absoluteX, absoluteY, e.absoluteY);
        })
        .onEnd(() => {
            // ドラッグ終了時の位置を保存
            // startX/YにはscrollDeltaを含まない（animatedStyleで別途加算されるため二重加算を防止）
            const finalX = startX.value + translationX.value;
            const finalY = startY.value + translationY.value;

            startX.value = finalX;
            startY.value = finalY;
            translationX.value = 0;
            translationY.value = 0;

            // animatedX/YにはscrollDeltaを含む（isDragging=falseになった時に正しい位置を表示）
            const scrollDelta = scrollOffset.value - dragStartScrollY.value;
            animatedX.value = finalX;
            animatedY.value = finalY + scrollDelta;

            runOnJS(onDragEnd)(id);
        });


    // レイアウトアニメーション用のスタイル（外側のラッパー）
    const wrapperStyle = useAnimatedStyle(() => {
        const isActive = isDragging;
        const scrollDelta = isActive ? (scrollOffset.value - dragStartScrollY.value) : 0;

        const translateX = isActive ? startX.value + translationX.value : animatedX.value;
        const translateY = isActive
            ? startY.value + translationY.value + scrollDelta
            : animatedY.value;

        return {
            position: 'absolute' as const,
            left: translateX,
            top: translateY,
            width: width,
            height: height,
            zIndex: isActive ? 999 : 1,
        };
    });

    // transformを使うスタイル（内側のView）
    const innerStyle = useAnimatedStyle(() => {
        const isActive = isDragging;

        let scale: number;
        let opacity: number;

        if (!isMounted.value) {
            scale = 1;
            opacity = 1;
        } else if (isActive) {
            scale = withTiming(activeItemScale, { duration: activationAnimationDuration });
            opacity = withTiming(activeItemOpacity, { duration: activationAnimationDuration });
        } else if (isAnyDragging) {
            scale = withTiming(activeItemScale, { duration: activationAnimationDuration });
            opacity = withTiming(activeItemOpacity, { duration: activationAnimationDuration });
        } else {
            scale = withTiming(1, { duration: activationAnimationDuration });
            opacity = withTiming(1, { duration: activationAnimationDuration });
        }

        return {
            flex: 1,
            transform: [{ scale }],
            opacity,
            shadowOpacity: withTiming(isActive ? activeItemShadowOpacity : 0, { duration: activationAnimationDuration }),
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 5 },
            elevation: isActive ? 5 : 0,
        };
    });

    // entering/exitingアニメーション
    const enteringAnimation = itemEntering;
    const exitingAnimation = itemExiting;

    return (
        <GestureDetector gesture={panGesture}>
            {/* 外側: 位置とentering/exitingアニメーション */}
            <Animated.View
                style={wrapperStyle}
                entering={enteringAnimation}
                exiting={exitingAnimation}
            >
                {/* 内側: transformアニメーション */}
                <Animated.View style={innerStyle}>
                    {children}
                </Animated.View>
            </Animated.View>
        </GestureDetector>
    );
};

const arePropsEqual = (prev: MasonryItemProps, next: MasonryItemProps) => {
    if (prev.x !== next.x || prev.y !== next.y ||
        prev.width !== next.width || prev.height !== next.height) {
        return false;
    }
    if (prev.isDragging !== next.isDragging) {
        return false;
    }
    if (prev.isAnyDragging !== next.isAnyDragging) {
        return false;
    }
    if (prev.id !== next.id) {
        return false;
    }
    if (prev.sortEnabled !== next.sortEnabled) {
        return false;
    }
    if (prev.activeItemScale !== next.activeItemScale ||
        prev.activeItemOpacity !== next.activeItemOpacity) {
        return false;
    }
    if (prev.isNewItem !== next.isNewItem) {
        return false;
    }
    return true;
};

export default memo(MasonryItemComponent, arePropsEqual);
