import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  useWindowDimensions,
} from 'react-native';

export type HomeStatHintAnchor = {
  x: number;
  y: number;
  w: number;
  h: number;
};

type Props = {
  visible: boolean;
  text: string;
  anchor: HomeStatHintAnchor | null;
  onDismiss: () => void;
};

const AUTO_DISMISS_MS = 3000;

export default function HomeStatHintOverlay({ visible, text, anchor, onDismiss }: Props) {
  const { width: winW, height: winH } = useWindowDimensions();

  useEffect(() => {
    if (!visible) return;
    const tmr = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(tmr);
  }, [visible, text, anchor, onDismiss]);

  if (!visible || !anchor) return null;

  const bubbleW = Math.min(winW - 32, 300);
  const margin = 12;
  const estBubbleH = 120;

  let top = anchor.y + anchor.h + margin;
  if (top + estBubbleH > winH - 32) {
    top = Math.max(48, anchor.y - estBubbleH - margin);
  }

  let left = anchor.x + anchor.w / 2 - bubbleW / 2;
  left = Math.max(16, Math.min(winW - bubbleW - 16, left));

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onDismiss}>
      <Pressable style={styles.fill} onPress={onDismiss}>
        <View style={[styles.bubble, { top, left, width: bubbleW }]} pointerEvents="none">
          <Text style={styles.bubbleText}>{text}</Text>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.38)',
  },
  bubble: {
    position: 'absolute',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(22,22,30,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.35)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  bubbleText: {
    color: '#e8e8ee',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
});
