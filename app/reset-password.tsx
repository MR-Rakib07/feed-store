import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
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
    const handleDeepLink = async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        
        if (initialUrl) {
          await processUrl(initialUrl);
        } else {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            setCheckingSession(false);
            return;
          }
        }

        const timer = setTimeout(() => {
          setCheckingSession(false);
        }, 3000);

        return () => clearTimeout(timer);
      } catch (err) {
        setCheckingSession(false);
      }
    };

    handleDeepLink();

    const subscription = Linking.addEventListener('url', async (event) => {
      await processUrl(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const processUrl = async (url: string) => {
    try {
      if (url.includes('access_token=') || url.includes('refresh_token=')) {
        const parsed = Linking.parse(url);
        const accessToken = parsed.queryParams?.access_token as string;
        const refreshToken = parsed.queryParams?.refresh_token as string;

        let accToken = accessToken;
        let refToken = refreshToken;

        if (!accToken && url.includes('#')) {
          const hashPart = url.split('#')[1];
          const hashParams = new URLSearchParams(hashPart);
          accToken = hashParams.get('access_token') || '';
          refToken = hashParams.get('refresh_token') || '';
        }

        if (accToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accToken,
            refresh_token: refToken || '',
          });

          if (!error) {
            setCheckingSession(false);
            return;
          }
        }
      }

      if (url.includes('token_hash=')) {
        const parsed = Linking.parse(url);
        const tokenHash = parsed.queryParams?.token_hash as string;
        const type = parsed.queryParams?.type as string || 'recovery';

        if (tokenHash) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as any,
          });

          if (!error) {
            setCheckingSession(false);
            return;
          }
        }
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setCheckingSession(false);
      } else {
        setCheckingSession(false);
      }
    } catch (e) {
      setCheckingSession(false);
    }
  };

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
        text2: error.message || 'সেশনের মেয়াদ শেষ হয়ে গেছে। অনুগ্রহ করে আবার লিংক নিন।',
      });
      return;
    }

    Toast.show({
      type: 'success',
      text1: 'সফল',
      text2: 'আপনার পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!',
    });

    await supabase.auth.signOut();

    setTimeout(() => {
      router.replace('/login');
    }, 1500);
  };

  if (checkingSession) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 justify-center items-center">
        <ActivityIndicator size="large" color="#059669" />
        <Text className="text-slate-400 text-xs font-semibold mt-3">রিসেট লিংক যাচাই করা হচ্ছে...</Text>
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