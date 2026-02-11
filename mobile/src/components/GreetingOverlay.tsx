import React, { useCallback, useRef } from 'react';
import { Animated, StyleSheet, TouchableOpacity } from 'react-native';
import { Video, ResizeMode, type AVPlaybackStatus } from 'expo-av';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  onDone: () => void;
}

export function GreetingOverlay({ onDone }: Props) {
  const { colors } = useTheme();
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const fadeOut = useCallback(() => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
    }).start(() => onDone());
  }, [fadeAnim, onDone]);

  const handlePlaybackStatus = useCallback(
    (status: AVPlaybackStatus) => {
      if (status.isLoaded && status.didJustFinish) {
        fadeOut();
      }
    },
    [fadeOut],
  );

  return (
    <Animated.View
      style={[
        styles.overlay,
        { backgroundColor: colors.background, opacity: fadeAnim },
      ]}
    >
      <TouchableOpacity
        style={styles.touchArea}
        activeOpacity={1}
        onPress={fadeOut}
      >
        <Video
          source={require('../../assets/pechi-greeting.mp4')}
          style={styles.video}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay
          isLooping={false}
          onPlaybackStatusUpdate={handlePlaybackStatus}
        />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  touchArea: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    ...StyleSheet.absoluteFillObject,
  },
});
