import React, { useEffect, useState } from 'react';
import { StatusBar } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import Toast from 'react-native-toast-message';
import store, { persistor } from './src/redux/store';
import RootNavigator from './src/navigation/RootNavigator';
import { LoadingSpinner } from './src/components/ui';
import { func } from './src/constants';

/**
 * Main App Component
 * Sets up Redux Provider, Navigation, and Toast notifications
 */
const App = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function prepare() {
      try {
        // Keep splash screen visible while assets are cached
        await SplashScreen.preventAutoHideAsync();

        // Pre-load/cache assets: images, fonts, and videos
        await func.loadAssetsAsync();
      } catch (e) {
        console.warn('Error loading assets:', e);
      } finally {
        // Loading is complete
        setIsLoading(false);
      }
    }

    prepare();
  }, []);

  useEffect(() => {
    // When loading is complete
    if (isLoading === false) {
      // Hide splash screen to show app
      const hideSplash = async () => SplashScreen.hideAsync();
      hideSplash();
    }
  }, [isLoading]);

  if (isLoading) {
    return null;
  }

  return (
    <Provider store={store}>
      <PersistGate loading={<LoadingSpinner />} persistor={persistor}>
        <StatusBar barStyle="dark-content" />
        <RootNavigator />
        <Toast />
      </PersistGate>
    </Provider>
  );
};

export default App;
