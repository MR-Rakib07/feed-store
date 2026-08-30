import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import Toast from 'react-native-toast-message';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      Toast.show({
        type: "error",
        text1: "Missing Information",
        text2: "Please enter your email and password.",
      });
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      Toast.show({
        type: "error",
        text1: "Login Failed",
        text2: error.message,
      });
      return;
    }

    Toast.show({
      type: "success",
      text1: "Welcome 👋",
      text2: "Login successful",
    });

    setTimeout(() => {
      router.replace("/(tab)/home");
    }, 1000);
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAwareScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        enableOnAndroid={true}
        extraScrollHeight={30}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="px-6 py-10">
          <View className="items-center mb-8">
            <View className="border-4 border-green-700 rounded-2xl p-4 mb-3">
              <Ionicons name="leaf" size={50} color="#15803d" />
            </View>
            <Text className="text-2xl font-bold text-green-700">Feed Store</Text>
          </View>

          <View className="space-y-4">
            <View>
              <Text className="text-gray-600 font-medium mb-2">Email</Text>
              <TextInput 
                className="w-full border text-black border-gray-200 rounded-xl px-4 py-3.5 bg-gray-50 mb-3" 
                placeholder="Enter email" 
                placeholderTextColor="#9ca3af"
                value={email} 
                onChangeText={setEmail} 
                autoCapitalize="none" 
                keyboardType="email-address"
              />
            </View>
            
            <View>
              <Text className="text-gray-600 font-medium mb-2">Password</Text>
              <View className="w-full border text-black border-gray-200 rounded-xl px-4 py-3.5 bg-gray-50 flex-row items-center justify-between">
                <TextInput 
                  className="flex-1 text-black" 
                  placeholder="Enter password" 
                  placeholderTextColor="#9ca3af"
                  secureTextEntry={!showPassword} 
                  value={password} 
                  onChangeText={setPassword} 
                  autoCapitalize="none" 
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#6b7280" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <TouchableOpacity 
            className="w-full bg-green-600 py-4 rounded-xl items-center mt-8" 
            onPress={handleLogin} 
            disabled={loading}
          >
            <Text className="text-white font-bold text-lg">{loading ? "Logging in..." : "Login"}</Text>
          </TouchableOpacity>

          <View className="flex-row justify-center mt-8">
            <Text className="text-gray-500">Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/register')}>
              <Text className="text-green-700 font-semibold">Register</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}