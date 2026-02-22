import NoteCard from '@/components/NoteCard';
import { MEMOS } from '@/constants/memos';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { DraggableMasonryList } from 'react-native-draggable-masonry';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const [data, setData] = React.useState(MEMOS);

  const renderItem = React.useCallback(({ item, index }: { item: any; index: number }) => (
    <View style={{ padding: 0 }}>
      <NoteCard
        title={item.title}
        content={item.content}
        color={item.color}
        height={item.height}
      />
    </View>
  ), []);

  const handleOrderChange = React.useCallback((params: { key: string; fromIndex: number; toIndex: number }) => {
    // ログを出さない
  }, []);

  const handleDragEnd = React.useCallback((params: { key: string; fromIndex: number; toIndex: number; data: any[] }) => {
    setData(params.data);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {/* Placeholder for header */}
      </View>
      <DraggableMasonryList
        data={data}
        columns={2}
        renderItem={renderItem}
        onOrderChange={handleOrderChange}
        onDragEnd={handleDragEnd}
        virtualizationEnabled={true}
        overscanCount={1}
        showDropIndicator={false}
        autoScrollDragThreshold={30}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
