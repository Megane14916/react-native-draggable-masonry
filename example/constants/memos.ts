export const MEMOS = Array.from({ length: 20 }).map((_, i) => ({
    id: `memo-${i}`,
    title: `Memo ${i + 1}`,
    content: `Content for memo ${i + 1}. ` + 'Lorem ipsum dolor sit amet. '.repeat(Math.random() * 5 + 1),
    height: 100 + Math.random() * 200, // Random height simulation
    color: ['#fbbc04', '#fff475', '#ccff90', '#a7ffeb', '#cbf0f8', '#aecbfa', '#d7aefb', '#fdcfe8', '#e6c9a8', '#e8eaed'][i % 10],
}));
