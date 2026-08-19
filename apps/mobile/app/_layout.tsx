import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useAuthStore } from "../store/auth-store";
import { COLORS } from "../constants";
import { fetchCurrentUser } from "../services/auth";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60 * 1000,
    },
  },
});

export default function RootLayout() {
  const hydrate = useAuthStore((state) => state.hydrate);
  const setUser = useAuthStore((state) => state.setUser);
  useEffect(() => {
    hydrate().then(async () => {
      if (useAuthStore.getState().accessToken) {
        const user = await fetchCurrentUser().catch(() => null);
        if (user) setUser(user);
      }
    });
  }, [hydrate, setUser]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: COLORS.background },
              headerStyle: { backgroundColor: COLORS.surface },
              headerTintColor: COLORS.text,
              headerTitleStyle: { color: COLORS.text },
              headerShadowVisible: false,
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="listing/[id]"
              options={{ headerShown: true, title: "Listing" }}
            />
            <Stack.Screen
              name="agent/[id]"
              options={{ headerShown: true, title: "Agent" }}
            />
            <Stack.Screen
              name="auth/login"
              options={{
                headerShown: true,
                title: "Log in",
                presentation: "modal",
              }}
            />
            <Stack.Screen
              name="auth/register"
              options={{
                headerShown: true,
                title: "Create account",
                presentation: "modal",
              }}
            />
            <Stack.Screen
              name="auth/reset"
              options={{
                headerShown: true,
                title: "Reset password",
                presentation: "modal",
              }}
            />
            <Stack.Screen
              name="search/index"
              options={{ headerShown: true, title: "Search" }}
            />
            <Stack.Screen
              name="filters/index"
              options={{
                headerShown: true,
                title: "Filters",
                presentation: "modal",
              }}
            />
            <Stack.Screen
              name="profile/index"
              options={{ headerShown: true, title: "Profile" }}
            />
            <Stack.Screen
              name="create/index"
              options={{ headerShown: true, title: "Create listing" }}
            />
            <Stack.Screen
              name="my-listings/index"
              options={{ headerShown: true, title: "My listings" }}
            />
            <Stack.Screen
              name="location/index"
              options={{ headerShown: true, title: "Location" }}
            />
            <Stack.Screen
              name="saved/index"
              options={{ headerShown: true, title: "Saved listings" }}
            />
            <Stack.Screen
              name="agent-profile/index"
              options={{ headerShown: true, title: "Agent profile" }}
            />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
