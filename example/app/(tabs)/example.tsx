import React, { useCallback, useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import type { DragEndParams, DragStartParams, MasonryItem, OrderChangeParams } from 'react-native-draggable-masonry';
import { DraggableMasonryList } from 'react-native-draggable-masonry';
import { FadeIn, FadeOut, SlideInLeft, SlideOutRight, ZoomIn, ZoomOut } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

// Sample data with various heights and colors
const generateSampleData = (count: number): MasonryItem[] => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];
    return Array.from({ length: count }, (_, i) => ({
        id: `item-${Date.now()}-${i}`,
        height: 80 + Math.floor(Math.random() * 120),
        title: `Item ${i + 1}`,
        color: colors[i % colors.length],
    }));
};

// Animation presets
const ENTERING_ANIMATIONS = {
    'None': undefined,
    'FadeIn': FadeIn.duration(300),
    'ZoomIn': ZoomIn.duration(300),
    'SlideIn': SlideInLeft.duration(300),
};

const EXITING_ANIMATIONS = {
    'None': undefined,
    'FadeOut': FadeOut.duration(200),
    'ZoomOut': ZoomOut.duration(200),
    'SlideOut': SlideOutRight.duration(200),
};

export default function ExampleScreen() {
    // Data state
    const [data, setData] = useState<MasonryItem[]>(() => generateSampleData(12));

    // ===== All Props =====
    // Base
    const [sortEnabled, setSortEnabled] = useState(true);

    // Layout
    const [columns, setColumns] = useState(2);
    const [rowGap, setRowGap] = useState(10);
    const [columnGap, setColumnGap] = useState(10);

    // Item Drag
    const [dragActivationDelay, setDragActivationDelay] = useState(300);
    const [activationAnimationDuration, setActivationAnimationDuration] = useState(150);
    const [dropAnimationDuration, setDropAnimationDuration] = useState(200);
    const [overDrag, setOverDrag] = useState<'both' | 'horizontal' | 'vertical' | 'none'>('both');

    // Active Item Decoration
    const [activeItemScale, setActiveItemScale] = useState(1.03);
    const [activeItemOpacity, setActiveItemOpacity] = useState(1);
    const [activeItemShadowOpacity, setActiveItemShadowOpacity] = useState(0.2);
    const [inactiveItemOpacity, setInactiveItemOpacity] = useState(1);
    const [inactiveItemScale, setInactiveItemScale] = useState(1);

    // Auto Scroll
    const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
    const [autoScrollActivationOffset, setAutoScrollActivationOffset] = useState(150);
    const [autoScrollSpeed, setAutoScrollSpeed] = useState(8);
    const [autoScrollMaxSpeed, setAutoScrollMaxSpeed] = useState(50);
    const [autoScrollMinSpeed, setAutoScrollMinSpeed] = useState(2);
    const [autoScrollAcceleration, setAutoScrollAcceleration] = useState(2.5);
    const [autoScrollTargetDuration, setAutoScrollTargetDuration] = useState(0.5);
    const [autoScrollDragThreshold, setAutoScrollDragThreshold] = useState(30);

    // Virtualization
    const [virtualizationEnabled, setVirtualizationEnabled] = useState(true);
    const [overscanCount, setOverscanCount] = useState(1);
    const [dragOverscanCount, setDragOverscanCount] = useState(3);

    // Drop Indicator
    const [showDropIndicator, setShowDropIndicator] = useState(true);

    // Layout Animations
    const [enteringAnim, setEnteringAnim] = useState<keyof typeof ENTERING_ANIMATIONS>('ZoomIn');
    const [exitingAnim, setExitingAnim] = useState<keyof typeof EXITING_ANIMATIONS>('ZoomOut');

    // Logs
    const [logs, setLogs] = useState<string[]>([]);

    const addLog = (message: string) => {
        setLogs(prev => [message, ...prev].slice(0, 10));
    };

    // Callbacks
    const handleDragStart = useCallback((params: DragStartParams) => {
        addLog(`🟢 DragStart: ${params.key}`);
    }, []);

    const handleDragEnd = useCallback((params: DragEndParams<MasonryItem>) => {
        addLog(`🔴 DragEnd: ${params.fromIndex}→${params.toIndex}`);
        setData(params.data);
    }, []);

    const handleOrderChange = useCallback((params: OrderChangeParams) => {
        // ログを出さない
    }, []);

    // Render item
    const renderItem = useCallback(({ item }: { item: MasonryItem }) => (
        <View style={[styles.card, { backgroundColor: (item as any).color, height: item.height }]}>
            <Text style={styles.cardTitle}>{(item as any).title}</Text>
            <Text style={styles.cardHeight}>{item.height}px</Text>
        </View>
    ), []);

    // Control Components
    const ControlButton = ({ title, onPress, active }: { title: string; onPress: () => void; active?: boolean }) => (
        <TouchableOpacity
            style={[styles.btn, active && styles.btnActive]}
            onPress={onPress}
        >
            <Text style={[styles.btnText, active && styles.btnTextActive]}>{title}</Text>
        </TouchableOpacity>
    );

    const ControlRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
        <View style={styles.controlRow}>
            <Text style={styles.label}>{label}</Text>
            <View style={styles.btns}>{children}</View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Controls Panel - Scrollable */}
            <ScrollView style={styles.controlsPanel} nestedScrollEnabled>
                <Text style={styles.sectionTitle}>📦 Base</Text>
                <ControlRow label="sortEnabled">
                    <Switch value={sortEnabled} onValueChange={setSortEnabled} />
                </ControlRow>

                <Text style={styles.sectionTitle}>📐 Layout</Text>
                <ControlRow label="columns">
                    {[2, 3, 4].map(n => (
                        <ControlButton key={n} title={`${n}`} onPress={() => setColumns(n)} active={columns === n} />
                    ))}
                </ControlRow>
                <ControlRow label="rowGap">
                    {[5, 10, 20].map(n => (
                        <ControlButton key={n} title={`${n}`} onPress={() => setRowGap(n)} active={rowGap === n} />
                    ))}
                </ControlRow>
                <ControlRow label="columnGap">
                    {[5, 10, 20].map(n => (
                        <ControlButton key={n} title={`${n}`} onPress={() => setColumnGap(n)} active={columnGap === n} />
                    ))}
                </ControlRow>

                <Text style={styles.sectionTitle}>✋ Item Drag</Text>
                <ControlRow label="dragDelay">
                    {[100, 300, 500].map(n => (
                        <ControlButton key={n} title={`${n}`} onPress={() => setDragActivationDelay(n)} active={dragActivationDelay === n} />
                    ))}
                </ControlRow>
                <ControlRow label="activeDur">
                    {[50, 150, 300].map(n => (
                        <ControlButton key={n} title={`${n}`} onPress={() => setActivationAnimationDuration(n)} active={activationAnimationDuration === n} />
                    ))}
                </ControlRow>
                <ControlRow label="dropDur">
                    {[100, 200, 400].map(n => (
                        <ControlButton key={n} title={`${n}`} onPress={() => setDropAnimationDuration(n)} active={dropAnimationDuration === n} />
                    ))}
                </ControlRow>
                <ControlRow label="overDrag">
                    {(['both', 'horizontal', 'vertical', 'none'] as const).map(v => (
                        <ControlButton key={v} title={v.slice(0, 4)} onPress={() => setOverDrag(v)} active={overDrag === v} />
                    ))}
                </ControlRow>

                <Text style={styles.sectionTitle}>🎨 Active Item</Text>
                <ControlRow label="scale">
                    {[1.0, 1.03, 1.1].map(n => (
                        <ControlButton key={n} title={`${n}`} onPress={() => setActiveItemScale(n)} active={activeItemScale === n} />
                    ))}
                </ControlRow>
                <ControlRow label="opacity">
                    {[0.7, 0.85, 1].map(n => (
                        <ControlButton key={n} title={`${n}`} onPress={() => setActiveItemOpacity(n)} active={activeItemOpacity === n} />
                    ))}
                </ControlRow>
                <ControlRow label="shadow">
                    {[0, 0.2, 0.5].map(n => (
                        <ControlButton key={n} title={`${n}`} onPress={() => setActiveItemShadowOpacity(n)} active={activeItemShadowOpacity === n} />
                    ))}
                </ControlRow>

                <Text style={styles.sectionTitle}>👻 Inactive Item</Text>
                <ControlRow label="opacity">
                    {[0.5, 0.7, 1].map(n => (
                        <ControlButton key={n} title={`${n}`} onPress={() => setInactiveItemOpacity(n)} active={inactiveItemOpacity === n} />
                    ))}
                </ControlRow>
                <ControlRow label="scale">
                    {[0.95, 0.98, 1].map(n => (
                        <ControlButton key={n} title={`${n}`} onPress={() => setInactiveItemScale(n)} active={inactiveItemScale === n} />
                    ))}
                </ControlRow>

                <Text style={styles.sectionTitle}>📜 Auto Scroll</Text>
                <ControlRow label="enabled">
                    <Switch value={autoScrollEnabled} onValueChange={setAutoScrollEnabled} />
                </ControlRow>
                <ControlRow label="offset">
                    {[50, 100, 150, 200].map(n => (
                        <ControlButton key={n} title={`${n}`} onPress={() => setAutoScrollActivationOffset(n)} active={autoScrollActivationOffset === n} />
                    ))}
                </ControlRow>
                <ControlRow label="maxSpeed">
                    {[25, 50, 75, 100].map(n => (
                        <ControlButton key={n} title={`${n}`} onPress={() => setAutoScrollMaxSpeed(n)} active={autoScrollMaxSpeed === n} />
                    ))}
                </ControlRow>
                <ControlRow label="minSpeed">
                    {[0, 2, 5, 10].map(n => (
                        <ControlButton key={n} title={`${n}`} onPress={() => setAutoScrollMinSpeed(n)} active={autoScrollMinSpeed === n} />
                    ))}
                </ControlRow>
                <ControlRow label="accel">
                    {[1.0, 1.5, 2.0, 2.5, 3.0].map(n => (
                        <ControlButton key={n} title={`${n}`} onPress={() => setAutoScrollAcceleration(n)} active={autoScrollAcceleration === n} />
                    ))}
                </ControlRow>
                <ControlRow label="duration">
                    {[0.3, 0.5, 0.8, 1.0, 2.0].map(n => (
                        <ControlButton key={n} title={`${n}s`} onPress={() => setAutoScrollTargetDuration(n)} active={autoScrollTargetDuration === n} />
                    ))}
                </ControlRow>
                <ControlRow label="dragThres">
                    {[0, 15, 30, 50].map(n => (
                        <ControlButton key={n} title={`${n}`} onPress={() => setAutoScrollDragThreshold(n)} active={autoScrollDragThreshold === n} />
                    ))}
                </ControlRow>

                <Text style={styles.sectionTitle}>🚀 Virtualization</Text>
                <ControlRow label="enabled">
                    <Switch value={virtualizationEnabled} onValueChange={setVirtualizationEnabled} />
                </ControlRow>
                <ControlRow label="overscan">
                    {[0, 1, 2, 3].map(n => (
                        <ControlButton key={n} title={`${n}`} onPress={() => setOverscanCount(n)} active={overscanCount === n} />
                    ))}
                </ControlRow>
                <ControlRow label="dragOverscan">
                    {[1, 2, 3, 5].map(n => (
                        <ControlButton key={n} title={`${n}`} onPress={() => setDragOverscanCount(n)} active={dragOverscanCount === n} />
                    ))}
                </ControlRow>

                <Text style={styles.sectionTitle}>📍 Drop Indicator</Text>
                <ControlRow label="show">
                    <Switch value={showDropIndicator} onValueChange={setShowDropIndicator} />
                </ControlRow>

                <Text style={styles.sectionTitle}>✨ Animations</Text>
                <ControlRow label="entering">
                    {Object.keys(ENTERING_ANIMATIONS).map(k => (
                        <ControlButton key={k} title={k} onPress={() => setEnteringAnim(k as any)} active={enteringAnim === k} />
                    ))}
                </ControlRow>
                <ControlRow label="exiting">
                    {Object.keys(EXITING_ANIMATIONS).map(k => (
                        <ControlButton key={k} title={k} onPress={() => setExitingAnim(k as any)} active={exitingAnim === k} />
                    ))}
                </ControlRow>
            </ScrollView>

            {/* Masonry List */}
            <View style={styles.listContainer}>
                <DraggableMasonryList
                    data={data}
                    renderItem={renderItem}
                    sortEnabled={sortEnabled}
                    columns={columns}
                    rowGap={rowGap}
                    columnGap={columnGap}
                    dragActivationDelay={dragActivationDelay}
                    activationAnimationDuration={activationAnimationDuration}
                    dropAnimationDuration={dropAnimationDuration}
                    overDrag={overDrag}
                    activeItemScale={activeItemScale}
                    activeItemOpacity={activeItemOpacity}
                    activeItemShadowOpacity={activeItemShadowOpacity}
                    inactiveItemOpacity={inactiveItemOpacity}
                    inactiveItemScale={inactiveItemScale}
                    autoScrollEnabled={autoScrollEnabled}
                    autoScrollActivationOffset={autoScrollActivationOffset}
                    autoScrollSpeed={autoScrollSpeed}
                    autoScrollMaxSpeed={autoScrollMaxSpeed}
                    autoScrollMinSpeed={autoScrollMinSpeed}
                    autoScrollAcceleration={autoScrollAcceleration}
                    autoScrollTargetDuration={autoScrollTargetDuration}
                    autoScrollDragThreshold={autoScrollDragThreshold}
                    virtualizationEnabled={virtualizationEnabled}
                    overscanCount={overscanCount}
                    dragOverscanCount={dragOverscanCount}
                    showDropIndicator={showDropIndicator}
                    dropIndicatorStyle={{ borderColor: '#e94560' }}
                    itemEntering={ENTERING_ANIMATIONS[enteringAnim]}
                    itemExiting={EXITING_ANIMATIONS[exitingAnim]}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onOrderChange={handleOrderChange}
                />
            </View>

            {/* Event Log */}
            <View style={styles.logPanel}>
                <View style={styles.logHeader}>
                    <Text style={styles.logTitle}>Log</Text>
                    <View style={styles.actionBtns}>
                        <TouchableOpacity style={styles.actionBtn} onPress={() => setData(generateSampleData(12))}>
                            <Text style={styles.actionBtnText}>Reset</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionBtn} onPress={() => setData(prev => [...prev, ...generateSampleData(2)])}>
                            <Text style={styles.actionBtnText}>+2</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionBtn} onPress={() => setData(prev => prev.slice(0, -2))}>
                            <Text style={styles.actionBtnText}>-2</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionBtn} onPress={() => setLogs([])}>
                            <Text style={styles.actionBtnText}>Clear</Text>
                        </TouchableOpacity>
                    </View>
                </View>
                <ScrollView style={styles.logScroll} horizontal>
                    <Text style={styles.logText}>{logs.join(' | ')}</Text>
                </ScrollView>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#1a1a2e' },
    controlsPanel: { maxHeight: 200, backgroundColor: '#16213e', padding: 8 },
    sectionTitle: { color: '#e94560', fontWeight: 'bold', fontSize: 11, marginTop: 8, marginBottom: 4 },
    controlRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    label: { color: '#888', fontSize: 10, width: 60 },
    btns: { flexDirection: 'row', flexWrap: 'wrap', flex: 1 },
    btn: { paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#0f3460', borderRadius: 4, marginRight: 4, marginBottom: 2 },
    btnActive: { backgroundColor: '#e94560' },
    btnText: { color: '#888', fontSize: 10 },
    btnTextActive: { color: '#fff', fontWeight: 'bold' },
    listContainer: { flex: 1, padding: 8 },
    card: { borderRadius: 10, padding: 10, justifyContent: 'space-between' },
    cardTitle: { color: '#fff', fontWeight: 'bold', fontSize: 14, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
    cardHeight: { color: 'rgba(255,255,255,0.7)', fontSize: 10 },
    logPanel: { backgroundColor: '#0f0f23', padding: 8 },
    logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    logTitle: { color: '#e94560', fontWeight: 'bold', fontSize: 11 },
    actionBtns: { flexDirection: 'row' },
    actionBtn: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#e94560', borderRadius: 4, marginLeft: 4 },
    actionBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 10 },
    logScroll: { maxHeight: 20 },
    logText: { color: '#7ec8e3', fontSize: 10, fontFamily: 'monospace' },
});
