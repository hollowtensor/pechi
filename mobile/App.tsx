// LiveKit globals must be registered before any other imports
import { registerGlobals } from '@livekit/react-native';
registerGlobals();

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';
import { HomeScreen } from './src/screens/HomeScreen';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';

function ThemedStatusBar() {
  const { mode } = useTheme();
  return <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />;
}

export default function App() {
  return (
    <ThemeProvider>
      <GestureHandlerRootView style={styles.root}>
        <SafeAreaProvider>
          <ThemedStatusBar />
          <HomeScreen />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
