import React, { createContext, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet, View, Text, TouchableOpacity, ImageBackground, Image, BackHandler } from 'react-native';
import OwnerLoginScreen from './components/OwnerLoginScreen';
import OwnerRegisterScreen from './components/OwnerRegisterScreen';
import LoadingScreen from './components/LoadingScreen';
import OwnerInterface from './components/OwnerInterface';
import ProfileInterface from './components/ProfileInterface';
import { AppProvider } from './AppContext';

export default function App() {
  return (
			<NavigationContainer>
				<AppProvider>
					<MainNavigator />
				</AppProvider>
			</NavigationContainer>
  );
}

const Stack = createNativeStackNavigator();

function MainNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Loading Screen */}
      <Stack.Screen name="Loading" component={LoadingScreen} />
      {/* Owner Screens */}
      <Stack.Screen name="OwnerLoginScreen" component={OwnerLoginScreen} />
      <Stack.Screen name="OwnerRegisterScreen" component={OwnerRegisterScreen} />
      <Stack.Screen name="OwnerInterface" component={OwnerInterface} />
      <Stack.Screen name="ProfileInterface" component={ProfileInterface} />
    </Stack.Navigator>
  );
}
