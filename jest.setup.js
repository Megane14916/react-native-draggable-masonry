// Jest setup file - Minimal configuration
// Suppress console warnings during tests
global.console = {
    ...console,
    warn: jest.fn(),
    error: jest.fn(),
};

// Mock Dimensions
jest.mock('react-native/Libraries/Utilities/Dimensions', () => ({
    get: jest.fn().mockReturnValue({ width: 375, height: 812 }),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
}));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
    const View = require('react-native').View;
    return {
        default: {
            ScrollView: View,
            View: View,
            call: () => { },
        },
        useSharedValue: (initialValue) => ({ value: initialValue }),
        useAnimatedStyle: () => ({}),
        useDerivedValue: (fn) => ({ value: typeof fn === 'function' ? fn() : fn }),
        useAnimatedScrollHandler: () => ({}),
        useAnimatedRef: () => ({ current: null }),
        useScrollViewOffset: () => ({ value: 0 }),
        useFrameCallback: () => ({ setActive: jest.fn() }),
        withTiming: (value) => value,
        withSpring: (value) => value,
        runOnJS: (fn) => fn,
        Easing: {
            linear: (t) => t,
            ease: (t) => t,
        },
    };
});

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => {
    const View = require('react-native').View;
    return {
        Swipeable: View,
        DrawerLayout: View,
        State: {},
        ScrollView: View,
        GestureDetector: ({ children }) => children,
        Gesture: {
            Pan: () => ({
                enabled: () => ({
                    activateAfterLongPress: () => ({
                        onStart: () => ({
                            onUpdate: () => ({
                                onEnd: () => ({}),
                            }),
                        }),
                    }),
                }),
            }),
        },
    };
});
