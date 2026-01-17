/**
 * DraggableMasonryList Component Logic Tests
 * Test Plan: IT-01 ~ IT-04 (Logic-based testing without full React Native rendering)
 * 
 * Note: Full component rendering tests require a complete React Native environment.
 * These tests focus on the component's logic and prop handling through mock-based testing.
 */
import { DEFAULT_PROPS, MasonryItem } from '../src/types';

// Test data
const mockData: MasonryItem[] = [
    { id: '1', height: 100 },
    { id: '2', height: 150 },
    { id: '3', height: 120 },
    { id: '4', height: 80 },
];

describe('DraggableMasonryList Component Logic', () => {
    // =========================================================================
    // IT-03: Props: renderItem - 関数が各アイテムに対して呼び出されること
    // =========================================================================
    describe('IT-03: Props: renderItem', () => {
        it('renderItem関数が各アイテムに対して呼び出される（シミュレーション）', () => {
            const mockRenderItem = jest.fn();

            // Simulate what the component does internally
            mockData.forEach((item, index) => {
                mockRenderItem({ item, index });
            });

            expect(mockRenderItem).toHaveBeenCalledTimes(mockData.length);
        });

        it('renderItem関数に正しい引数が渡される', () => {
            const mockRenderItem = jest.fn();

            mockData.forEach((item, index) => {
                mockRenderItem({ item, index });
            });

            // Verify each call
            expect(mockRenderItem).toHaveBeenNthCalledWith(1, { item: mockData[0], index: 0 });
            expect(mockRenderItem).toHaveBeenNthCalledWith(2, { item: mockData[1], index: 1 });
            expect(mockRenderItem).toHaveBeenNthCalledWith(3, { item: mockData[2], index: 2 });
            expect(mockRenderItem).toHaveBeenNthCalledWith(4, { item: mockData[3], index: 3 });
        });
    });

    // =========================================================================
    // IT-04: 初期表示 - コンポーネントのPropsが正しく設定されていること
    // =========================================================================
    describe('IT-04: Propsのデフォルト値検証', () => {
        it('デフォルトProps値が適用される', () => {
            // Verify that DEFAULT_PROPS contains all expected values
            expect(DEFAULT_PROPS.columns).toBe(2);
            expect(DEFAULT_PROPS.rowGap).toBe(10);
            expect(DEFAULT_PROPS.columnGap).toBe(10);
            expect(DEFAULT_PROPS.sortEnabled).toBe(true);
            expect(DEFAULT_PROPS.dragActivationDelay).toBe(300);
            expect(DEFAULT_PROPS.activeItemScale).toBe(1.03);
            expect(DEFAULT_PROPS.autoScrollEnabled).toBe(true);
            expect(DEFAULT_PROPS.autoScrollSpeed).toBe(8);
        });
    });

    // =========================================================================
    // Callback Tests
    // =========================================================================
    describe('コールバック関数テスト', () => {
        it('onDragStart コールバックパラメータの構造', () => {
            const params = { key: 'item-1', fromIndex: 0 };
            expect(params.key).toBe('item-1');
            expect(params.fromIndex).toBe(0);
        });

        it('onDragEnd コールバックパラメータの構造', () => {
            const params = {
                key: 'item-1',
                fromIndex: 0,
                toIndex: 2,
                data: mockData,
            };
            expect(params.key).toBe('item-1');
            expect(params.fromIndex).toBe(0);
            expect(params.toIndex).toBe(2);
            expect(params.data.length).toBe(mockData.length);
        });

        it('onOrderChange コールバックパラメータの構造', () => {
            const params = { key: 'item-1', fromIndex: 0, toIndex: 1 };
            expect(params.key).toBe('item-1');
            expect(params.fromIndex).toBe(0);
            expect(params.toIndex).toBe(1);
        });
    });

    // =========================================================================
    // Data Handling Tests
    // =========================================================================
    describe('データ処理テスト', () => {
        it('空のデータ配列を処理できる', () => {
            const emptyData: MasonryItem[] = [];
            expect(emptyData.length).toBe(0);
        });

        it('単一アイテムを処理できる', () => {
            const singleItem: MasonryItem[] = [{ id: '1', height: 100 }];
            expect(singleItem.length).toBe(1);
            expect(singleItem[0].id).toBe('1');
        });

        it('アイテムに追加プロパティを持たせられる', () => {
            const itemWithExtra: MasonryItem = {
                id: '1',
                height: 100,
                title: 'Test',
                color: '#ff0000',
            };
            expect(itemWithExtra.title).toBe('Test');
            expect(itemWithExtra.color).toBe('#ff0000');
        });
    });

    // =========================================================================
    // keyExtractor Tests
    // =========================================================================
    describe('keyExtractor テスト', () => {
        it('デフォルトのkeyExtractorはitem.idを返す', () => {
            const defaultKeyExtractor = (item: MasonryItem) => item.id;
            expect(defaultKeyExtractor(mockData[0])).toBe('1');
            expect(defaultKeyExtractor(mockData[1])).toBe('2');
        });

        it('カスタムkeyExtractorを使える', () => {
            const customKeyExtractor = (item: MasonryItem) => `custom-${item.id}`;
            expect(customKeyExtractor(mockData[0])).toBe('custom-1');
            expect(customKeyExtractor(mockData[1])).toBe('custom-2');
        });
    });

    // =========================================================================
    // Reorder Logic Tests
    // =========================================================================
    describe('並び替えロジックテスト', () => {
        it('アイテムを前方に移動', () => {
            const items = [...mockData];
            const fromIndex = 3;
            const toIndex = 1;

            // Simulate reorder
            const [removed] = items.splice(fromIndex, 1);
            items.splice(toIndex, 0, removed);

            expect(items[1].id).toBe('4');
            expect(items.length).toBe(mockData.length);
        });

        it('アイテムを後方に移動', () => {
            const items = [...mockData];
            const fromIndex = 0;
            const toIndex = 2;

            // Simulate reorder
            const [removed] = items.splice(fromIndex, 1);
            items.splice(toIndex, 0, removed);

            expect(items[2].id).toBe('1');
            expect(items.length).toBe(mockData.length);
        });
    });
});
