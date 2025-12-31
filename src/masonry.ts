

export type MasonryItem = {
    id: string;
    height: number;
    [key: string]: any;
};

export type PositionedItem = {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    column: number;
};

/**
 * Calculates positions based on explicit column buckets.
 * This is stable: an item in column 0 will stay in column 0 unless moved.
 */
export const calculateColumnLayout = ({
    columns,
    numColumns,
    containerWidth,
    gap = 10,
}: {
    columns: MasonryItem[][];
    numColumns: number;
    containerWidth: number;
    gap?: number;
}): { positions: Record<string, PositionedItem>; columnHeights: number[], totalHeight: number } => {
    const columnWidth = (containerWidth - (numColumns - 1) * gap) / numColumns;
    const positions: Record<string, PositionedItem> = {};
    const columnHeights = new Array(numColumns).fill(0);

    columns.forEach((colItems, colIndex) => {
        colItems.forEach((item) => {
            const x = colIndex * (columnWidth + gap);
            const y = columnHeights[colIndex];

            positions[item.id] = {
                id: item.id,
                x,
                y,
                width: columnWidth,
                height: item.height,
                column: colIndex,
            };

            columnHeights[colIndex] += item.height + gap;
        });
    });

    return {
        positions,
        columnHeights,
        totalHeight: Math.max(...columnHeights),
    };
};

/**
 * Distributes flat items into columns using a "Shortest Column" greedy approach
 * used only for INITIALIZATION to create a balanced start.
 */
export const distributeToColumns = (items: MasonryItem[], numColumns: number): MasonryItem[][] => {
    const columnHeights = new Array(numColumns).fill(0);
    const columns: MasonryItem[][] = Array.from({ length: numColumns }, () => []);

    items.forEach((item) => {
        let shortest = 0;
        for (let i = 1; i < numColumns; i++) {
            if (columnHeights[i] < columnHeights[shortest]) {
                shortest = i;
            }
        }
        columns[shortest].push(item);
        columnHeights[shortest] += item.height; // approximate height check
    });

    return columns;
};

export const reorderItems = <T>(items: T[], fromIndex: number, toIndex: number): T[] => {
    const result = Array.from(items);
    const [removed] = result.splice(fromIndex, 1);
    result.splice(toIndex, 0, removed);
    return result;
};
