import React, { memo } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useDerivedValue,
    useSharedValue,
    withTiming,
    type SharedValue
} from 'react-native-reanimated';

type MasonryItemProps = {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    children: React.ReactNode;
    onDragStart: (id: string, startScrollY: number, initialScreenY: number) => void;
    onDragEnd: (id: string) => void;
    onDragChange: (id: string, x: number, y: number, screenY: number) => void;
    isDragging: boolean;
    scrollY: SharedValue<number>;
    dragY: SharedValue<number>;
    dragStartScrollY: SharedValue<number>;
    autoScrollOffset: SharedValue<number>;
    // New props for customization
    sortEnabled?: boolean;
    dragActivationDelay?: number;
    activationAnimationDuration?: number;
    dropAnimationDuration?: number;
    overDrag?: 'both' | 'horizontal' | 'vertical' | 'none';
    activeItemScale?: number;
    activeItemOpacity?: number;
    activeItemShadowOpacity?: number;
    inactiveItemOpacity?: number;
    inactiveItemScale?: number;
    // Layout animation props
    itemEntering?: any;
    itemExiting?: any;
    // Container bounds for overDrag
    containerWidth?: number;
    containerHeight?: number;
};

const MasonryItem = ({
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
    scrollY,
    dragY,
    dragStartScrollY,
    autoScrollOffset,
    // New props with defaults
    sortEnabled = true,
    dragActivationDelay = 300,
    activationAnimationDuration = 150,
    dropAnimationDuration = 200,
    overDrag = 'both',
    activeItemScale = 1.03,
    activeItemOpacity = 1,
    activeItemShadowOpacity = 0.2,
    inactiveItemOpacity = 1,
    inactiveItemScale = 1,
    // Layout animation props
    itemEntering,
    itemExiting,
    // Container bounds
    containerWidth = 0,
    containerHeight = 0,
}: MasonryItemProps) => {
    // We need to track where the drag started to apply translation correctly
    const startX = useSharedValue(0);
    const startY = useSharedValue(0);
    const translationX = useSharedValue(0);
    const translationY = useSharedValue(0);

    // Track if component has finished initial entering animation
    // Start as true if no entering animation, false otherwise
    const hasRendered = useSharedValue(!itemEntering);

    // Enable animations after entering animation completes
    React.useEffect(() => {
        if (itemEntering) {
            const timer = setTimeout(() => {
                hasRendered.value = true;
            }, 350); // Slightly longer than entering animation duration (300ms)
            return () => clearTimeout(timer);
        }
    }, []);

    // We use a local tracking of "current assigned position" to animate to it
    const currentX = useSharedValue(x);
    const currentY = useSharedValue(y);

    // Sync props to shared values when NOT dragging (for layout animations)
    useDerivedValue(() => {
        if (!isDragging) {
            // Use withTiming for smooth non-bouncing animation
            currentX.value = withTiming(x, { duration: 200 });
            currentY.value = withTiming(y, { duration: 200 });
        }
    }, [x, y, isDragging]);

    const panGesture = Gesture.Pan()
        .enabled(sortEnabled)
        .activateAfterLongPress(dragActivationDelay)
        .onStart((e) => {
            startX.value = currentX.value;
            startY.value = currentY.value;
            dragStartScrollY.value = scrollY.value; // Capture scroll start
            dragY.value = e.absoluteY;
            runOnJS(onDragStart)(id, scrollY.value, e.absoluteY);
        })
        .onUpdate((e) => {
            // Apply overDrag constraint
            let transX = e.translationX;
            let transY = e.translationY;

            if (overDrag === 'none' || overDrag === 'vertical') {
                // Restrict horizontal movement
                const minX = -startX.value;
                const maxX = containerWidth - startX.value - width;
                transX = Math.max(minX, Math.min(maxX, transX));
            }
            if (overDrag === 'none' || overDrag === 'horizontal') {
                // Restrict vertical movement
                const minY = -startY.value;
                const maxY = containerHeight - startY.value - height;
                transY = Math.max(minY, Math.min(maxY, transY));
            }

            translationX.value = transX;
            translationY.value = transY;
            dragY.value = e.absoluteY;

            // Calculate absolute position for drag logic
            // Note: We use scrollY.value to account for CURRENT scroll position
            const currentScrollDelta = scrollY.value - dragStartScrollY.value;
            const absoluteX = startX.value + e.translationX;
            // The item visually moves with the scroll (translateY + delta).
            // But for logical position (where the item IS in the list), we need:
            // StartY + dragDelta + scrollDelta.
            const absoluteY = startY.value + e.translationY + currentScrollDelta;

            // Pass absoluteY (screen coordinate) as 4th arg for auto-scrolling
            runOnJS(onDragChange)(id, absoluteX, absoluteY, e.absoluteY);
        })
        .onEnd(() => {
            // Capture final position (visual)
            const currentScrollDelta = scrollY.value - dragStartScrollY.value;

            // Account for pseudo-scroll offset that will be reset after drop
            // autoScrollOffset will become 0, so we need to adjust our position
            const pseudoScrollAdjustment = autoScrollOffset.value;

            const finalX = startX.value + translationX.value;
            // Subtract autoScrollOffset because it will be reset to 0 after drop
            const finalY = startY.value + translationY.value + currentScrollDelta - pseudoScrollAdjustment;

            // Update start values to 'hold' the item where it is 
            startX.value = finalX;
            startY.value = finalY;
            translationX.value = 0;
            translationY.value = 0;

            // Also sync current values to ensure no jump when isDragging flips
            currentX.value = finalX;
            currentY.value = finalY;

            runOnJS(onDragEnd)(id);
        });

    const animatedStyle = useAnimatedStyle(() => {
        const isActive = isDragging;

        const scrollDelta = isActive ? (scrollY.value - dragStartScrollY.value) : 0;

        // For non-dragging items, apply autoScrollOffset (pseudo-scroll)
        const pseudoScroll = isActive ? 0 : autoScrollOffset.value;

        const translateX = isActive ? startX.value + translationX.value : currentX.value;
        const translateY = isActive
            ? startY.value + translationY.value + scrollDelta
            : currentY.value + pseudoScroll;

        // Use props for decoration
        const scale = isActive ? activeItemScale : inactiveItemScale;
        const opacity = isActive ? activeItemOpacity : inactiveItemOpacity;
        const shadowOpacity = isActive ? activeItemShadowOpacity : 0;

        // Use different durations for activation vs drop
        const animDuration = isActive ? activationAnimationDuration : dropAnimationDuration;

        // Only use timing animations after initial render to avoid conflict with entering animation
        const shouldAnimate = hasRendered.value;
        const finalScale = shouldAnimate ? withTiming(scale, { duration: animDuration }) : scale;
        const finalOpacity = shouldAnimate ? withTiming(opacity, { duration: animDuration }) : opacity;
        const finalShadow = shouldAnimate ? withTiming(shadowOpacity, { duration: animDuration }) : shadowOpacity;

        return {
            position: 'absolute',
            left: translateX,
            top: translateY,
            width: width,
            height: height,
            opacity: finalOpacity,
            transform: [
                { scale: finalScale },
            ],
            zIndex: isActive ? 999 : 1,
            shadowOpacity: finalShadow,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 5 },
            elevation: isActive ? 5 : 0,
        };
    });

    return (
        <GestureDetector gesture={panGesture}>
            <Animated.View
                style={animatedStyle}
                entering={itemEntering}
                exiting={itemExiting}
            >
                {children}
            </Animated.View>
        </GestureDetector>
    );
};

export default memo(MasonryItem);
