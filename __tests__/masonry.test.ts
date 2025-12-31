import {
    calculateColumnLayout,
    distributeToColumns,
    MasonryItem,
    reorderItems,
} from '../src/masonry';

describe('masonry.ts', () => {
    // =========================================================================
    // calculateColumnLayout Tests
    // =========================================================================
    describe('calculateColumnLayout', () => {
        it('UT-01: 2カラムで正しくレイアウトを計算する', () => {
            const columns: MasonryItem[][] = [
                [{ id: '1', height: 100 }, { id: '2', height: 150 }],
                [{ id: '3', height: 120 }],
            ];
            const result = calculateColumnLayout({
                columns,
                numColumns: 2,
                containerWidth: 200,
                gap: 10,
            });

            // Column width = (200 - 10) / 2 = 95
            expect(result.positions['1']).toEqual({
                id: '1',
                x: 0,
                y: 0,
                width: 95,
                height: 100,
                column: 0,
            });
            expect(result.positions['2']).toEqual({
                id: '2',
                x: 0,
                y: 110, // 100 + gap(10)
                width: 95,
                height: 150,
                column: 0,
            });
            expect(result.positions['3']).toEqual({
                id: '3',
                x: 105, // 95 + gap(10)
                y: 0,
                width: 95,
                height: 120,
                column: 1,
            });
        });

        it('UT-02: gapが正しく反映される', () => {
            const columns: MasonryItem[][] = [
                [{ id: '1', height: 100 }],
                [{ id: '2', height: 100 }],
            ];
            const result = calculateColumnLayout({
                columns,
                numColumns: 2,
                containerWidth: 220,
                gap: 20,
            });

            // Column width = (220 - 20) / 2 = 100
            expect(result.positions['1'].x).toBe(0);
            expect(result.positions['2'].x).toBe(120); // 100 + gap(20)
        });

        it('UT-03: 空のデータ配列で空のpositionsを返す', () => {
            const columns: MasonryItem[][] = [[], []];
            const result = calculateColumnLayout({
                columns,
                numColumns: 2,
                containerWidth: 200,
                gap: 10,
            });

            expect(result.positions).toEqual({});
            expect(result.totalHeight).toBe(0);
        });

        it('totalHeightが最も高いカラムの高さになる', () => {
            const columns: MasonryItem[][] = [
                [{ id: '1', height: 100 }],
                [{ id: '2', height: 200 }, { id: '3', height: 50 }],
            ];
            const result = calculateColumnLayout({
                columns,
                numColumns: 2,
                containerWidth: 200,
                gap: 10,
            });

            // Column 1 height: 200 + 10 + 50 + 10 = 270
            expect(result.totalHeight).toBe(270);
        });
    });

    // =========================================================================
    // distributeToColumns Tests
    // =========================================================================
    describe('distributeToColumns', () => {
        it('UT-04: アイテムが複数カラムに分散される', () => {
            const items: MasonryItem[] = [
                { id: '1', height: 100 },
                { id: '2', height: 100 },
                { id: '3', height: 100 },
                { id: '4', height: 100 },
            ];
            const result = distributeToColumns(items, 2);

            expect(result.length).toBe(2);
            // All items should be distributed
            const allIds = result.flat().map((item) => item.id);
            expect(allIds).toContain('1');
            expect(allIds).toContain('2');
            expect(allIds).toContain('3');
            expect(allIds).toContain('4');
        });

        it('UT-05: データ数 < カラム数でもエラーにならない', () => {
            const items: MasonryItem[] = [{ id: '1', height: 100 }];
            const result = distributeToColumns(items, 3);

            expect(result.length).toBe(3);
            expect(result.flat().length).toBe(1);
        });

        it('UT-06: 最も短いカラムにアイテムが追加される', () => {
            const items: MasonryItem[] = [
                { id: '1', height: 200 }, // Goes to column 0
                { id: '2', height: 100 }, // Goes to column 1 (shorter)
                { id: '3', height: 50 },  // Goes to column 1 (100 < 200)
            ];
            const result = distributeToColumns(items, 2);

            // Column 0 should have item 1 (height 200)
            // Column 1 should have items 2, 3 (heights 100, 50)
            expect(result[0].map((i) => i.id)).toContain('1');
            expect(result[1].map((i) => i.id)).toContain('2');
            expect(result[1].map((i) => i.id)).toContain('3');
        });
    });

    // =========================================================================
    // reorderItems Tests
    // =========================================================================
    describe('reorderItems', () => {
        it('アイテムを前方に移動できる', () => {
            const items = ['a', 'b', 'c', 'd'];
            const result = reorderItems(items, 3, 1); // Move 'd' to index 1

            expect(result).toEqual(['a', 'd', 'b', 'c']);
        });

        it('アイテムを後方に移動できる', () => {
            const items = ['a', 'b', 'c', 'd'];
            const result = reorderItems(items, 0, 2); // Move 'a' to index 2

            expect(result).toEqual(['b', 'c', 'a', 'd']);
        });

        it('元の配列を変更しない', () => {
            const items = ['a', 'b', 'c'];
            reorderItems(items, 0, 2);

            expect(items).toEqual(['a', 'b', 'c']);
        });
    });
});
