import {
    DEFAULT_PROPS,
    type DragEndParams,
    type DraggableMasonryListProps,
    type DragStartParams,
    type MasonryItem,
    type OrderChangeParams,
    type RenderItemInfo,
} from '../src/types';

describe('types.ts - Props and Types', () => {
    // =========================================================================
    // DEFAULT_PROPS Tests
    // =========================================================================
    describe('DEFAULT_PROPS', () => {
        it('columns のデフォルト値が 2', () => {
            expect(DEFAULT_PROPS.columns).toBe(2);
        });

        it('rowGap のデフォルト値が 10', () => {
            expect(DEFAULT_PROPS.rowGap).toBe(10);
        });

        it('columnGap のデフォルト値が 10', () => {
            expect(DEFAULT_PROPS.columnGap).toBe(10);
        });

        it('sortEnabled のデフォルト値が true', () => {
            expect(DEFAULT_PROPS.sortEnabled).toBe(true);
        });

        it('dragActivationDelay のデフォルト値が 300', () => {
            expect(DEFAULT_PROPS.dragActivationDelay).toBe(300);
        });

        it('activationAnimationDuration のデフォルト値が 150', () => {
            expect(DEFAULT_PROPS.activationAnimationDuration).toBe(150);
        });

        it('dropAnimationDuration のデフォルト値が 200', () => {
            expect(DEFAULT_PROPS.dropAnimationDuration).toBe(200);
        });

        it('overDrag のデフォルト値が "both"', () => {
            expect(DEFAULT_PROPS.overDrag).toBe('both');
        });

        it('activeItemScale のデフォルト値が 1.03', () => {
            expect(DEFAULT_PROPS.activeItemScale).toBe(1.03);
        });

        it('activeItemOpacity のデフォルト値が 1', () => {
            expect(DEFAULT_PROPS.activeItemOpacity).toBe(1);
        });

        it('activeItemShadowOpacity のデフォルト値が 0.2', () => {
            expect(DEFAULT_PROPS.activeItemShadowOpacity).toBe(0.2);
        });

        it('inactiveItemOpacity のデフォルト値が 1', () => {
            expect(DEFAULT_PROPS.inactiveItemOpacity).toBe(1);
        });

        it('inactiveItemScale のデフォルト値が 1', () => {
            expect(DEFAULT_PROPS.inactiveItemScale).toBe(1);
        });

        it('autoScrollEnabled のデフォルト値が true', () => {
            expect(DEFAULT_PROPS.autoScrollEnabled).toBe(true);
        });

        it('autoScrollActivationOffset のデフォルト値が 150', () => {
            expect(DEFAULT_PROPS.autoScrollActivationOffset).toBe(150);
        });

        it('autoScrollSpeed のデフォルト値が 8', () => {
            expect(DEFAULT_PROPS.autoScrollSpeed).toBe(8);
        });

        it('virtualizationEnabled のデフォルト値が true', () => {
            expect(DEFAULT_PROPS.virtualizationEnabled).toBe(true);
        });

        it('overscanCount のデフォルト値が 1', () => {
            expect(DEFAULT_PROPS.overscanCount).toBe(1);
        });

        it('dragOverscanCount のデフォルト値が 3', () => {
            expect(DEFAULT_PROPS.dragOverscanCount).toBe(3);
        });

        it('showDropIndicator のデフォルト値が true', () => {
            expect(DEFAULT_PROPS.showDropIndicator).toBe(true);
        });

        it('autoScrollMaxSpeed のデフォルト値が 50', () => {
            expect(DEFAULT_PROPS.autoScrollMaxSpeed).toBe(50);
        });

        it('autoScrollMinSpeed のデフォルト値が 2', () => {
            expect(DEFAULT_PROPS.autoScrollMinSpeed).toBe(2);
        });

        it('autoScrollAcceleration のデフォルト値が 2.5', () => {
            expect(DEFAULT_PROPS.autoScrollAcceleration).toBe(2.5);
        });

        it('autoScrollTargetDuration のデフォルト値が 0.5', () => {
            expect(DEFAULT_PROPS.autoScrollTargetDuration).toBe(0.5);
        });

        it('autoScrollDragThreshold のデフォルト値が 30', () => {
            expect(DEFAULT_PROPS.autoScrollDragThreshold).toBe(30);
        });

        it('swapMode のデフォルト値が false', () => {
            expect(DEFAULT_PROPS.swapMode).toBe(false);
        });

        it('全26個のデフォルト値が定義されている', () => {
            const propCount = Object.keys(DEFAULT_PROPS).length;
            expect(propCount).toBe(26);
        });
    });

    // =========================================================================
    // Type Structure Tests
    // =========================================================================
    describe('MasonryItem Type', () => {
        it('id と height が必須プロパティ', () => {
            const item: MasonryItem = {
                id: 'test-1',
                height: 100,
            };
            expect(item.id).toBe('test-1');
            expect(item.height).toBe(100);
        });

        it('追加プロパティを持てる', () => {
            const item: MasonryItem = {
                id: 'test-1',
                height: 100,
                title: 'Test Title',
                color: '#ff0000',
            };
            expect(item.title).toBe('Test Title');
            expect(item.color).toBe('#ff0000');
        });
    });

    describe('RenderItemInfo Type', () => {
        it('item と index を持つ', () => {
            const info: RenderItemInfo<MasonryItem> = {
                item: { id: 'test', height: 50 },
                index: 0,
            };
            expect(info.item.id).toBe('test');
            expect(info.index).toBe(0);
        });
    });

    describe('Callback Params Types', () => {
        it('DragStartParams が key と fromIndex を持つ', () => {
            const params: DragStartParams = {
                key: 'item-1',
                fromIndex: 2,
            };
            expect(params.key).toBe('item-1');
            expect(params.fromIndex).toBe(2);
        });

        it('DragEndParams が key, fromIndex, toIndex, data を持つ', () => {
            const params: DragEndParams<MasonryItem> = {
                key: 'item-1',
                fromIndex: 0,
                toIndex: 2,
                data: [{ id: 'item-1', height: 100 }],
            };
            expect(params.key).toBe('item-1');
            expect(params.fromIndex).toBe(0);
            expect(params.toIndex).toBe(2);
            expect(params.data.length).toBe(1);
        });

        it('OrderChangeParams が key, fromIndex, toIndex を持つ', () => {
            const params: OrderChangeParams = {
                key: 'item-1',
                fromIndex: 0,
                toIndex: 3,
            };
            expect(params.key).toBe('item-1');
            expect(params.fromIndex).toBe(0);
            expect(params.toIndex).toBe(3);
        });
    });

    // =========================================================================
    // Props Validation Tests
    // =========================================================================
    describe('DraggableMasonryListProps', () => {
        it('必須Props: data と renderItem が存在する', () => {
            // TypeScriptの型チェックにより、これらは必須
            const mockRenderItem = jest.fn();
            const props: Partial<DraggableMasonryListProps<MasonryItem>> = {
                data: [{ id: '1', height: 100 }],
                renderItem: mockRenderItem,
            };
            expect(props.data).toBeDefined();
            expect(props.renderItem).toBeDefined();
        });

        it('オプションProps にデフォルト値を適用できる', () => {
            const props: Partial<DraggableMasonryListProps<MasonryItem>> = {
                columns: DEFAULT_PROPS.columns,
                rowGap: DEFAULT_PROPS.rowGap,
                columnGap: DEFAULT_PROPS.columnGap,
                dragActivationDelay: DEFAULT_PROPS.dragActivationDelay,
                activeItemScale: DEFAULT_PROPS.activeItemScale,
                autoScrollSpeed: DEFAULT_PROPS.autoScrollSpeed,
            };

            expect(props.columns).toBe(2);
            expect(props.rowGap).toBe(10);
            expect(props.columnGap).toBe(10);
            expect(props.dragActivationDelay).toBe(300);
            expect(props.activeItemScale).toBe(1.03);
            expect(props.autoScrollSpeed).toBe(8);
        });

        it('keyExtractor がカスタム関数を受け取れる', () => {
            const customKeyExtractor = (item: MasonryItem) => `custom-${item.id}`;
            const item: MasonryItem = { id: 'test', height: 100 };

            expect(customKeyExtractor(item)).toBe('custom-test');
        });

        it('autoScrollActivationOffset が数値またはタプルを受け取れる', () => {
            const props1: Partial<DraggableMasonryListProps<MasonryItem>> = {
                autoScrollActivationOffset: 100,
            };
            const props2: Partial<DraggableMasonryListProps<MasonryItem>> = {
                autoScrollActivationOffset: [50, 150],
            };

            expect(props1.autoScrollActivationOffset).toBe(100);
            expect(props2.autoScrollActivationOffset).toEqual([50, 150]);
        });

        it('overDrag が有効な値のみ受け取る', () => {
            const validValues: Array<'both' | 'horizontal' | 'vertical' | 'none'> = [
                'both', 'horizontal', 'vertical', 'none'
            ];

            validValues.forEach((value) => {
                const props: Partial<DraggableMasonryListProps<MasonryItem>> = {
                    overDrag: value,
                };
                expect(props.overDrag).toBe(value);
            });
        });
    });
});
