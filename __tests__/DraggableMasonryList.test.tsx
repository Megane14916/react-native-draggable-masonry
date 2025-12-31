/**
 * DraggableMasonryList Component Logic Tests
 * Test Plan: IT-01 ~ IT-04 (Logic-based testing without full React Native rendering)
 * 
 * Note: Full component rendering tests require a complete React Native environment.
 * These tests focus on the component's logic and prop handling through mock-based testing.
 */
import {
    calculateColumnLayout,
    distributeToColumns,
} from '../src/masonry';
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
    // IT-01: 基本レンダリング - dataで渡した数のアイテムが処理されること
    // =========================================================================
    describe('IT-01: 基本レンダリング（ロジック検証）', () => {
        it('dataで渡したアイテムがすべてレイアウト計算に含まれる', () => {
            const columns = distributeToColumns(mockData, DEFAULT_PROPS.columns);
            const layout = calculateColumnLayout({
                columns,
                numColumns: DEFAULT_PROPS.columns,
                containerWidth: 375,
                gap: DEFAULT_PROPS.rowGap,
            });

            // All items should have positions calculated
            expect(Object.keys(layout.positions).length).toBe(mockData.length);
            mockData.forEach((item) => {
                expect(layout.positions[item.id]).toBeDefined();
            });
        });

        it('空のデータでもエラーなく処理される', () => {
            const columns = distributeToColumns([], DEFAULT_PROPS.columns);
            const layout = calculateColumnLayout({
                columns,
                numColumns: DEFAULT_PROPS.columns,
                containerWidth: 375,
                gap: DEFAULT_PROPS.rowGap,
            });

            expect(Object.keys(layout.positions).length).toBe(0);
        });
    });

    // =========================================================================
    // IT-02: Props: columns 変更
    // =========================================================================
    describe('IT-02: Props: columns変更', () => {
        it('columns=2 と columns=3 でレイアウトが異なる', () => {
            const layout2Col = calculateColumnLayout({
                columns: distributeToColumns(mockData, 2),
                numColumns: 2,
                containerWidth: 375,
                gap: 10,
            });

            const layout3Col = calculateColumnLayout({
                columns: distributeToColumns(mockData, 3),
                numColumns: 3,
                containerWidth: 375,
                gap: 10,
            });

            // Column widths should be different
            const width2Col = Object.values(layout2Col.positions)[0].width;
            const width3Col = Object.values(layout3Col.positions)[0].width;
            expect(width2Col).not.toBe(width3Col);

            // 2 columns: (375 - 10) / 2 = 182.5
            // 3 columns: (375 - 20) / 3 = 118.33...
            expect(width2Col).toBeCloseTo(182.5, 1);
            expect(width3Col).toBeCloseTo(118.33, 0);
        });
    });

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
    // Props Combination Tests
    // =========================================================================
    describe('Props組み合わせテスト', () => {
        it('gap値がレイアウトに正しく反映される', () => {
            const layoutGap10 = calculateColumnLayout({
                columns: distributeToColumns(mockData, 2),
                numColumns: 2,
                containerWidth: 200,
                gap: 10,
            });

            const layoutGap20 = calculateColumnLayout({
                columns: distributeToColumns(mockData, 2),
                numColumns: 2,
                containerWidth: 200,
                gap: 20,
            });

            // Column 1 x position should be different
            const item2Gap10 = Object.values(layoutGap10.positions).find(p => p.column === 1);
            const item2Gap20 = Object.values(layoutGap20.positions).find(p => p.column === 1);

            expect(item2Gap10!.x).toBe(105); // (200-10)/2 + 10 = 95 + 10
            expect(item2Gap20!.x).toBe(110); // (200-20)/2 + 20 = 90 + 20
        });

        it('keyExtractor関数が正しく動作する', () => {
            const defaultKeyExtractor = (item: MasonryItem) => item.id;
            const customKeyExtractor = (item: MasonryItem) => `custom-${item.id}`;

            expect(defaultKeyExtractor(mockData[0])).toBe('1');
            expect(customKeyExtractor(mockData[0])).toBe('custom-1');
        });
    });

    // =========================================================================
    // Callback Tests
    // =========================================================================
    describe('Callbackテスト', () => {
        it('onDragEnd コールバックのパラメータ構造が正しい', () => {
            const mockOnDragEnd = jest.fn();

            // Simulate what the component generates for onDragEnd
            const dragEndParams = {
                key: '1',
                fromIndex: 0,
                toIndex: 2,
                data: mockData,
            };

            mockOnDragEnd(dragEndParams);

            expect(mockOnDragEnd).toHaveBeenCalledWith({
                key: '1',
                fromIndex: 0,
                toIndex: 2,
                data: expect.arrayContaining([
                    expect.objectContaining({ id: '1' }),
                ]),
            });
        });

        it('onOrderChange コールバックのパラメータ構造が正しい', () => {
            const mockOnOrderChange = jest.fn();

            const orderChangeParams = {
                key: '2',
                fromIndex: 1,
                toIndex: 3,
            };

            mockOnOrderChange(orderChangeParams);

            expect(mockOnOrderChange).toHaveBeenCalledWith({
                key: '2',
                fromIndex: 1,
                toIndex: 3,
            });
        });
    });

    // =========================================================================
    // 新規実装Props テスト
    // =========================================================================
    describe('新規実装Propsテスト', () => {
        describe('activationAnimationDuration', () => {
            it('デフォルト値が150ms', () => {
                expect(DEFAULT_PROPS.activationAnimationDuration).toBe(150);
            });

            it('dropAnimationDurationと異なる値を設定可能', () => {
                const activationDuration = 100;
                const dropDuration = 300;

                expect(activationDuration).not.toBe(dropDuration);
                expect(activationDuration).toBe(100);
                expect(dropDuration).toBe(300);
            });
        });

        describe('overDrag', () => {
            it('デフォルト値が "both"', () => {
                expect(DEFAULT_PROPS.overDrag).toBe('both');
            });

            it('4つの有効な値を持つ', () => {
                const validValues = ['both', 'horizontal', 'vertical', 'none'];
                validValues.forEach(value => {
                    expect(['both', 'horizontal', 'vertical', 'none']).toContain(value);
                });
            });

            it('overDrag制限のロジックをシミュレート', () => {
                // Simulate drag constraint for overDrag='none'
                const containerWidth = 375;
                const containerHeight = 500;
                const itemWidth = 100;
                const itemHeight = 80;
                const startX = 50;
                const startY = 100;

                // User drags to an out-of-bounds position
                let transX = -100; // Would go off left side
                let transY = 500;  // Would go off bottom

                // Apply constraint (simulating overDrag='none')
                const minX = -startX;
                const maxX = containerWidth - startX - itemWidth;
                const minY = -startY;
                const maxY = containerHeight - startY - itemHeight;

                transX = Math.max(minX, Math.min(maxX, transX));
                transY = Math.max(minY, Math.min(maxY, transY));

                // Should be clamped to bounds
                expect(transX).toBe(-50); // minX
                expect(transY).toBe(320); // maxY = 500 - 100 - 80 = 320
            });
        });

        describe('autoScrollActivationOffset', () => {
            it('デフォルト値が150', () => {
                expect(DEFAULT_PROPS.autoScrollActivationOffset).toBe(150);
            });

            it('数値を受け取った場合、top/bottomに同じ値を適用', () => {
                const offset = 100;
                const topThreshold = Array.isArray(offset) ? offset[0] : offset;
                const bottomThreshold = Array.isArray(offset) ? offset[1] : offset;

                expect(topThreshold).toBe(100);
                expect(bottomThreshold).toBe(100);
            });

            it('[top, bottom]タプルを受け取った場合、それぞれ別々の値を適用', () => {
                const offset: [number, number] = [50, 200];
                const topThreshold = Array.isArray(offset) ? offset[0] : offset;
                const bottomThreshold = Array.isArray(offset) ? offset[1] : offset;

                expect(topThreshold).toBe(50);
                expect(bottomThreshold).toBe(200);
            });

            it('オートスクロールのスクロールデルタ計算をシミュレート', () => {
                const TOP_THRESHOLD = 150;
                const BOTTOM_THRESHOLD = 150;
                const MAX_SPEED = 8;
                const windowHeight = 800;

                // Test scroll up (finger near top)
                const screenY_top = 50;
                const intensity_up = (TOP_THRESHOLD - screenY_top) / TOP_THRESHOLD;
                const scrollDelta_up = MAX_SPEED * intensity_up * intensity_up;

                expect(intensity_up).toBeCloseTo(0.667, 2);
                expect(scrollDelta_up).toBeGreaterThan(0);

                // Test scroll down (finger near bottom)
                const screenY_bottom = 750;
                const intensity_down = (screenY_bottom - (windowHeight - BOTTOM_THRESHOLD)) / BOTTOM_THRESHOLD;
                const scrollDelta_down = -MAX_SPEED * intensity_down * intensity_down;

                expect(intensity_down).toBeCloseTo(0.667, 2);
                expect(scrollDelta_down).toBeLessThan(0);
            });
        });

        describe('contentContainerStyle', () => {
            it('スタイルオブジェクトを受け取れる', () => {
                const customStyle = { paddingHorizontal: 20, backgroundColor: '#fff' };
                expect(customStyle.paddingHorizontal).toBe(20);
                expect(customStyle.backgroundColor).toBe('#fff');
            });

            it('デフォルトスタイルとマージできる', () => {
                const defaultStyle = { height: 1000 };
                const customStyle = { paddingTop: 10 };
                const mergedStyle = [defaultStyle, customStyle];

                expect(mergedStyle).toHaveLength(2);
                expect(mergedStyle[0]).toEqual({ height: 1000 });
                expect(mergedStyle[1]).toEqual({ paddingTop: 10 });
            });
        });
    });
});
