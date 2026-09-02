import { Stack } from 'expo-router';

export default function ProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#15803d" },
        headerTintColor: "#fff",
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="category" 
        options={{ 
          title: "Category Management"
        }} 
      />

      <Stack.Screen 
        name="edit-profile" 
        options={{ 
          title: "Edit Profile"
        }} 
      />
      <Stack.Screen 
        name="balance" 
        options={{ 
          title: "Balance"
        }} 
      />

      <Stack.Screen 
        name="change-password" 
        options={{ 
          title: "Change Password"
        }} 
      />
    </Stack>
  );
}