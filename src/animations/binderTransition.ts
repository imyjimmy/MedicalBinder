import { Animated, Dimensions } from 'react-native';
import { StackCardInterpolationProps } from '@react-navigation/stack';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const binderExpandTransition = ({
  current,
  next,
  inverted,
  layouts: { screen },
}: StackCardInterpolationProps) => {
  const progress = Animated.add(
    current.progress,
    next ? next.progress : 0,
  );

  return {
    cardStyle: {
      transform: [
        {
          scale: current.progress.interpolate({
            inputRange: [0, 1],
            outputRange: [0.1, 1], // Start small (like the card size) and scale to full screen
            extrapolate: 'clamp',
          }),
        },
        {
          translateY: current.progress.interpolate({
            inputRange: [0, 1],
            outputRange: [screenHeight * 0.3, 0], // Start from roughly where the card would be positioned
            extrapolate: 'clamp',
          }),
        },
      ],
      opacity: current.progress.interpolate({
        inputRange: [0, 0.3, 1],
        outputRange: [0, 0.8, 1],
        extrapolate: 'clamp',
      }),
      backgroundColor: '#ffffff', // Match the card background
      borderRadius: current.progress.interpolate({
        inputRange: [0, 0.8, 1],
        outputRange: [12, 8, 0], // Start with card border radius, end with no radius
        extrapolate: 'clamp',
      }),
      borderColor: '#757575', // Match your card border color
    },
  };
};

// Alternative version with more dramatic scaling effect
export const binderExpandTransitionDramatic = ({
  current,
  next,
  inverted,
  layouts: { screen },
}: StackCardInterpolationProps) => {
  return {
    cardStyle: {
      transform: [
        {
          scale: current.progress.interpolate({
            inputRange: [0, 0.7, 1],
            outputRange: [0.05, 0.8, 1], // More dramatic initial scale
            extrapolate: 'clamp',
          }),
        },
        {
          translateY: current.progress.interpolate({
            inputRange: [0, 0.6, 1],
            outputRange: [screenHeight * 0.4, screenHeight * 0.1, 0],
            extrapolate: 'clamp',
          }),
        },
      ],
      opacity: current.progress.interpolate({
        inputRange: [0, 0.2, 1],
        outputRange: [0, 0.9, 1],
        extrapolate: 'clamp',
      }),
      backgroundColor: '#ffffff',
      borderRadius: current.progress.interpolate({
        inputRange: [0, 0.9, 1],
        outputRange: [12, 4, 0],
        extrapolate: 'clamp',
      }),
      borderColor: '#757575',
    },
  };
};

// Transition spec for timing control
export const binderTransitionSpec = {
  animation: 'timing' as const,
  config: {
    duration: 800, // Longer duration for smooth expansion
    useNativeDriver: true,
  },
};

// For the overlaying/covering effect, we can also create a special overlay transition
export const binderOverlayTransition = ({
  current,
  next,
  inverted,
  layouts: { screen },
}: StackCardInterpolationProps) => {
  return {
    cardStyle: {
      transform: [
        {
          scale: current.progress.interpolate({
            inputRange: [0, 0.4, 1],
            outputRange: [0.15, 0.9, 1],
            extrapolate: 'clamp',
          }),
        },
      ],
      opacity: current.progress,
      backgroundColor: '#ffffff',
      // This creates the "expanding border" effect by starting with a thick border
      borderRadius: current.progress.interpolate({
        inputRange: [0, 0.8, 1],
        outputRange: [12, 6, 0],
        extrapolate: 'clamp',
      }),
      borderColor: '#757575',
      // Shadow effect during transition
      shadowOpacity: current.progress.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0.1, 0.3, 0],
        extrapolate: 'clamp',
      }),
      shadowRadius: current.progress.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [2, 10, 0],
        extrapolate: 'clamp',
      }),
      elevation: current.progress.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [2, 8, 0],
        extrapolate: 'clamp',
      }),
    },
  };
};