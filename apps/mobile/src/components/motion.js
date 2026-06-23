import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';

import { animation, colors, radius } from '../theme';

export function FadeInView({ children, delay = 0, style, from = 'down' }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(from === 'up' ? -16 : 16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        delay,
        damping: animation.spring.damping,
        stiffness: animation.spring.stiffness,
        mass: animation.spring.mass,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay, from, opacity, translateY]);

  return (
    <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>
      {children}
    </Animated.View>
  );
}

export function FadeInScreen({ children, style }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [opacity]);

  return <Animated.View style={[{ flex: 1, opacity }, style]}>{children}</Animated.View>;
}

export function ScalePressable({
  children,
  onPress,
  style,
  disabled,
  scaleTo = 0.97,
}) {
  const scale = useRef(new Animated.Value(1)).current;

  function pressIn() {
    Animated.spring(scale, {
      toValue: scaleTo,
      damping: animation.springSnappy.damping,
      stiffness: animation.springSnappy.stiffness,
      useNativeDriver: true,
    }).start();
  }

  function pressOut() {
    Animated.spring(scale, {
      toValue: 1,
      damping: animation.spring.damping,
      stiffness: animation.spring.stiffness,
      useNativeDriver: true,
    }).start();
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={pressIn}
      onPressOut={pressOut}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

export function AnimatedProgressBar({
  percent = 0,
  color = colors.primary,
  trackColor = colors.surfaceAlt,
  height = 8,
  delay = 0,
  style,
}) {
  const progress = useRef(new Animated.Value(0)).current;
  const clamped = Math.min(100, Math.max(0, percent));

  useEffect(() => {
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: clamped,
      duration: 900,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [clamped, delay, progress]);

  const width = progress.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.track, { height, backgroundColor: trackColor }, style]}>
      <Animated.View
        style={[styles.fill, { backgroundColor: color, height, width }]}
      />
    </View>
  );
}

export function TabIconAnimated({ icon, focused, color }) {
  const scale = useRef(new Animated.Value(focused ? 1.12 : 1)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: focused ? 1.12 : 1,
      damping: animation.springSnappy.damping,
      stiffness: animation.springSnappy.stiffness,
      useNativeDriver: true,
    }).start();
  }, [focused, scale]);

  return (
    <Animated.Text style={{ fontSize: 22, color, transform: [{ scale }] }}>
      {icon}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  track: {
    borderRadius: radius.pill,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    borderRadius: radius.pill,
  },
});
