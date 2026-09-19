import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import SplashScreen from '../src/screens/SplashScreen';
import TapToStartScreen from '../src/screens/TapToStartScreen';

// Both screens only ever call `replace`, so a real NavigationContainer isn't
// needed - a stub with that one method is enough to observe where they send
// the player next.
function fakeNavigation() {
  return { replace: jest.fn() };
}

describe('SplashScreen', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('moves on to Tap to Start on its own after a beat', () => {
    const navigation = fakeNavigation();
    render(<SplashScreen navigation={navigation as never} route={{} as never} />);

    expect(navigation.replace).not.toHaveBeenCalled();
    jest.runAllTimers();
    expect(navigation.replace).toHaveBeenCalledWith('TapToStart');
  });

  it('cancels the pending transition if unmounted first', () => {
    const navigation = fakeNavigation();
    const { unmount } = render(<SplashScreen navigation={navigation as never} route={{} as never} />);
    unmount();
    jest.runAllTimers();
    expect(navigation.replace).not.toHaveBeenCalled();
  });
});

describe('TapToStartScreen', () => {
  it('enters the levels wall on tap', () => {
    const navigation = fakeNavigation();
    render(<TapToStartScreen navigation={navigation as never} route={{} as never} />);

    fireEvent.press(screen.getByLabelText('Tap to start'));
    expect(navigation.replace).toHaveBeenCalledWith('Levels');
  });
});
