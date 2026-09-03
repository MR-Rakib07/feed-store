import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
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

  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      try {
        // ১. সুপাবেসের লোকাল স্টোরেজ থেকে সেশন চেক করা
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (session && isMounted) {
          setCheckingSession(false);
          return;
        }

        // ২. যদি সরাসরি সেশন না থাকে, তবে অথ স্টেট চেঞ্জ লিসনারের জন্য অপেক্ষা করা
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
          if ((event === 'PASSWORD_RECOVERY' || currentSession) && isMounted) {
            setCheckingSession(false);
          }
        });

        // ৩. ফால்ব্যাক: যদি ৩ সেকেন্ডের পরেও কোনো ইভেন্ট না আসে, তবুও ইউজারকে পাসওয়ার্ড দেওয়ার সুযোগ দেওয়া
        const timer = setTimeout(() => {
          if (isMounted) {
            setCheckingSession(false);
          }
        }, 3000);

        return () => {
          clearTimeout(timer);
          subscription.unsubscribe();
        };
      } catch (err) {
        if (isMounted) setCheckingSession(false);
      }
    };

    checkSession();

    return () => {
      isMounted = false;
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

    // পাসওয়ার্ড আপডেট করার সময় সুপাবেস বর্তমান active session ব্যবহার করবে
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setLoading(false);

    if (error) {
      Toast.show({
        type: 'error',
        text1: 'আপডেট ব্যর্থ হয়েছে',
        text2: error.message || 'সেশনের মেয়াদ শেষ হয়ে গেছে। অনুগ্রহ করে আবার ফরগোট পাসওয়ার্ড দিয়ে নতুন লিংক নিন।',
      });
      return;
    }

    Toast.show({
      type: 'success',
      text1: 'সফল',
      text2: 'আপনার পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!',
    });

    // পাসওয়ার্ড পরিবর্তনের পর সেশন সাইন আউট করে লগইন পেজে পাঠিয়ে দেওয়া নিরাপদ
    await supabase.auth.signOut();

    setTimeout(() => {
      router.replace('/login');
    }, 1500);
  };

  if (checkingSession) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 justify-center items-center">
        <ActivityIndicator size="large" color="#059669" />
        <Text className="text-slate-400 text-xs font-semibold mt-3">লিংক যাচাই করা হচ্ছে...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <KeyboardAwareScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
        enableOnAndroid={true}
        extraScrollHeight={30}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
          <View className="mb-6 items-center">
            <View className="w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-3xl items-center justify-center mb-3">
              <Ionicons name="key-outline" size={32} color="#059669" />
            </View>
            <Text className="text-2xl font-black text-slate-900 leading-8" numberOfLines={1}>নতুন পাসওয়ার্ড সেট করুন</Text>
            <Text className="text-xs text-slate-400 font-semibold mt-1 leading-4 text-center" numberOfLines={2}>
              আপনার অ্যাকাউন্টের জন্য নতুন একটি শক্তিশালী পাসওয়ার্ড দিন।
            </Text>
          </View>

          <View className="mb-4">
            <Text className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 leading-4" numberOfLines={1}>নতুন পাসওয়ার্ড</Text>
            <View className="w-full border border-slate-200 rounded-2xl px-4 h-12 bg-slate-50/70 flex-row items-center justify-between">
              <TextInput 
                className="flex-1 text-slate-900 text-sm font-semibold leading-5" 
                placeholder="কমপক্ষে ৬ অক্ষর" 
                placeholderTextColor="#94a3b8"
                secureTextEntry={!showPassword} 
                value={newPassword} 
                onChangeText={setNewPassword} 
                autoCapitalize="none" 
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} className="shrink-0 p-1">
                <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity 
            className="w-full bg-emerald-600 h-14 rounded-2xl items-center justify-center shadow-md shadow-emerald-200 active:bg-emerald-700 mt-2" 
            onPress={handleUpdatePassword} 
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text className="text-white font-black text-sm uppercase tracking-wider leading-5" numberOfLines={1}>
                পাসওয়ার্ড পরিবর্তন করুন
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}