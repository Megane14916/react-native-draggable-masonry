import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type NoteCardProps = {
    title: string;
    content: string;
    color: string;
    height: number;
};

export default function NoteCard({ title, content, color, height }: NoteCardProps) {
    return (
        <View style={[styles.card, { backgroundColor: color, height: height, overflow: 'hidden' }]}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.content}>{content}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 8,
        padding: 12,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#333',
    },
    content: {
        fontSize: 14,
        color: '#555',
        lineHeight: 20,
    },
});
