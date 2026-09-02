import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import Toast from 'react-native-toast-message';

export default function ResetPasswordScreen() {
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const router = useRouter();

  // পেজ ওপেন হওয়ার সাথে সাথে চেক করা ইউজার সঠিক রিকভারি টোকেন নিয়ে এসেছে কিনা
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setCheckingSession(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) {
        setCheckingSession(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleUpdatePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      Toast.show({
        type: 'error',
        text1: 'ত্রুটি',
        text2: 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।',
      });
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setLoading(false);

    if (error) {
      Toast.show({
        type: 'error',
        text1: 'আপডেট ব্যর্থ হয়েছে',
        text2: error.message,
      });
      return;
    }

    Toast.show({
      type: 'success',
      text1: 'সফল',
      text2: 'আপনার পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!',
    });

    setTimeout(() => {
      router.replace('/login');
    }, 1500);
  };

  // যদি সেশন চেক হতে একটু সময় নেয়, তবে লোডিং দেখাবে
  if (checkingSession) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#15803d" />
        <Text className="text-gray-500 text-xs font-semibold mt-3">যাচাই করা হচ্ছে...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white justify-center px-6">
      <View className="mb-6 items-center">
        <Text className="text-2xl font-black text-green-700 leading-8" numberOfLines={1}>নতুন পাসওয়ার্ড সেট করুন</Text>
        <Text className="text-xs text-gray-500 font-medium mt-1 leading-5 text-center">
          আপনার অ্যাকাউন্টের জন্য নতুন একটি শক্তিশালী পাসওয়ার্ড দিন।
        </Text>
      </View>

      <View className="mb-4">
        <Text className="text-gray-600 font-medium mb-2 leading-5" numberOfLines={1}>নতুন পাসওয়ার্ড</Text>
        <View className="w-full border border-gray-200 rounded-xl px-4 py-3.5 bg-gray-50 flex-row items-center justify-between">
          <TextInput 
            className="flex-1 text-black text-sm font-semibold leading-5" 
            placeholder="কমপক্ষে ৬ অক্ষর" 
            placeholderTextColor="#9ca3af"
            secureTextEntry={!showPassword} 
            value={newPassword} 
            onChangeText={setNewPassword} 
            autoCapitalize="none" 
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} className="shrink-0 p-1">
            <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity 
        className="w-full bg-green-600 py-4 rounded-xl items-center mt-2 shadow-xs active:bg-green-700" 
        onPress={handleUpdatePassword} 
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text className="text-white font-bold text-base leading-6" numberOfLines={1}>পাসওয়ার্ড পরিবর্তন করুন</Text>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
}