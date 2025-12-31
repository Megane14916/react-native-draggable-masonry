import NoteCard from '@/components/NoteCard';
import { MEMOS } from '@/constants/memos';
import React from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';
import { DraggableMasonryList } from 'react-native-draggable-masonry';

export default function HomeScreen() {
  const renderItem = React.useCallback(({ item }: { item: any }) => (
    <View style={{ padding: 0 }}>
      <NoteCard
        title={item.title}
        content={item.content}
        color={item.color}
        height={item.height}
      />
    </View>
  ), []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {/* Placeholder for header */}
      </View>
      <DraggableMasonryList
        data={MEMOS}
        columns={2}
        renderItem={renderItem}
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
