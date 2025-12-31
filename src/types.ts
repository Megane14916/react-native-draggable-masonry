import type { StyleProp, ViewStyle } from 'react-native';

// ============================================================================
// Base Types
// ============================================================================

/**
 * Base item type that must have an id and height property.
 * Users can extend this with additional properties.
 */
export interface MasonryItem {
    id: string;
    height: number;
    [key: string]: any;
}

/**
 * Positioned item with layout information
 */
export interface PositionedItem {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    column: number;
}

/**
 * Render item info passed to renderItem function
 */
export interface RenderItemInfo<T extends MasonryItem> {
    item: T;
    index: number;
}

// ============================================================================
// Animation Types
// ============================================================================

// Accept both custom animation functions and Reanimated built-in animations
export type EntryAnimationType = any;
export type ExitAnimationType = any;

export type OverDragType = 'both' | 'horizontal' | 'vertical' | 'none';

// ============================================================================
// Callback Types
// ============================================================================

export interface DragStartParams {
    key: string;
    fromIndex: number;
}

export interface DragEndParams<T extends MasonryItem> {
    key: string;
    fromIndex: number;
    toIndex: number;
    data: T[];
}

export interface OrderChangeParams {
    key: string;
    fromIndex: number;
    toIndex: number;
}

export type DragStartCallback = (params: DragStartParams) => void;
export type DragEndCallback<T extends MasonryItem> = (params: DragEndParams<T>) => void;
export type OrderChangeCallback = (params: OrderChangeParams) => void;

// ============================================================================
// Component Props
// ============================================================================

export interface DraggableMasonryListProps<T extends MasonryItem> {
    // ========== Base ==========
    /** Array of items to render */
    data: T[];
    /** Function to render each item */
    renderItem: (info: RenderItemInfo<T>) => React.ReactNode;
    /** Function to extract unique key from item. Defaults to item.id */
    keyExtractor?: (item: T) => string;
    /** Whether sorting/dragging is enabled. Defaults to true */
    sortEnabled?: boolean;

    // ========== Layout ==========
    /** Number of columns. Defaults to 2 */
    columns?: number;
    /** Gap between rows in pixels. Defaults to 10 */
    rowGap?: number;
    /** Gap between columns in pixels. Defaults to 10 */
    columnGap?: number;

    // ========== Item Drag ==========
    /** Delay in ms before drag activates. Defaults to 300 */
    dragActivationDelay?: number;
    /** Duration of activation animation in ms. Defaults to 150 */
    activationAnimationDuration?: number;
    /** Duration of drop animation in ms. Defaults to 200 */
    dropAnimationDuration?: number;
    /** Whether dragging outside grid is allowed. Defaults to 'both' */
    overDrag?: OverDragType;

    // ========== Active Item Decoration ==========
    /** Scale of active (dragged) item. Defaults to 1.03 */
    activeItemScale?: number;
    /** Opacity of active item. Defaults to 1 */
    activeItemOpacity?: number;
    /** Shadow opacity of active item (iOS only). Defaults to 0.2 */
    activeItemShadowOpacity?: number;
    /** Opacity of inactive items while dragging. Defaults to 1 */
    inactiveItemOpacity?: number;
    /** Scale of inactive items while dragging. Defaults to 1 */
    inactiveItemScale?: number;

    // ========== Auto Scroll ==========
    /** Whether auto scroll is enabled. Defaults to true */
    autoScrollEnabled?: boolean;
    /** Offset from edge to activate auto scroll. Defaults to 150 */
    autoScrollActivationOffset?: number | [number, number];
    /** Speed of auto scroll. Defaults to 8 */
    autoScrollSpeed?: number;

    // ========== Layout Animations ==========
    /** Animation when item enters */
    itemEntering?: EntryAnimationType;
    /** Animation when item exits */
    itemExiting?: ExitAnimationType;

    // ========== Callbacks ==========
    /** Called when drag starts */
    onDragStart?: DragStartCallback;
    /** Called when drag ends with new data order */
    onDragEnd?: DragEndCallback<T>;
    /** Called when order changes during drag */
    onOrderChange?: OrderChangeCallback;

    // ========== Style ==========
    /** Style for the scroll view content container */
    contentContainerStyle?: StyleProp<ViewStyle>;
}

// ============================================================================
// Default Values
// ============================================================================

export const DEFAULT_PROPS = {
    columns: 2,
    rowGap: 10,
    columnGap: 10,
    sortEnabled: true,
    dragActivationDelay: 300,
    activationAnimationDuration: 150,
    dropAnimationDuration: 200,
    overDrag: 'both' as OverDragType,
    activeItemScale: 1.03,
    activeItemOpacity: 1,
    activeItemShadowOpacity: 0.2,
    inactiveItemOpacity: 1,
    inactiveItemScale: 1,
    autoScrollEnabled: true,
    autoScrollActivationOffset: 150,
    autoScrollSpeed: 8,
} as const;
