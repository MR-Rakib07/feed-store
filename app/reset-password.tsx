import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import Toast from 'react-native-toast-message';

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams();
  const [email, setEmail] = useState((params.email as string) || '');
  const [otpToken, setOtpToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleVerifyAndReset = async () => {
    if (!email.trim()) {
      Toast.show({ 
        type: 'error', 
        text1: 'ত্রুটি', 
        text2: 'ইমেল পাওয়া যায়নি। লগইন পেজ থেকে আবার চেষ্টা করুন।' 
      });
      return;
    }

    if (!otpToken.trim() || otpToken.trim().length < 6) {
      Toast.show({ 
        type: 'error', 
        text1: 'ত্রুটি', 
        text2: 'আপনার ইমেলে পাঠানো সঠিক ৬ সংখ্যার কোডটি লিখুন।' 
      });
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      Toast.show({ 
        type: 'error', 
        text1: 'ত্রুটি', 
        text2: 'নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।' 
      });
      return;
    }

    setLoading(true);

    try {
      const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otpToken.trim(),
        type: 'recovery',
      });

      if (verifyError) {
        throw verifyError;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw updateError;
      }

      Toast.show({
        type: 'success',
        text1: 'সফল',
        text2: 'পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!',
      });

      await supabase.auth.signOut();

      setTimeout(() => {
        router.replace('/login');
      }, 1500);

    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'ব্যর্থ হয়েছে',
        text2: error.message || 'কোডটি ভুল অথবা মেয়াদ শেষ হয়ে গেছে।',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingVertical: 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <View className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
              <View className="mb-6 items-center">
                <View className="w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-3xl items-center justify-center mb-3">
                  <Ionicons name="shield-checkmark-outline" size={32} color="#059669" />
                </View>
                <Text className="text-2xl font-black text-slate-900 leading-8 text-center">পাসওয়ার্ড রিসেট</Text>
                <Text className="text-xs text-slate-400 font-semibold mt-1 leading-4 text-center">
                  আপনার ইমেলে পাঠানো ৬ সংখ্যার কোড ও নতুন পাসওয়ার্ড লিখুন।
                </Text>
              </View>

              <View className="mb-4">
                <Text className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 leading-4">
                  ইমেল অ্যাড্রেস
                </Text>
                <TextInput 
                  className="w-full border border-slate-200 rounded-2xl px-4 h-12 bg-slate-100 text-slate-600 text-sm font-semibold" 
                  value={email} 
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View className="mb-4">
                <Text className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 leading-4">
                  ৬ সংখ্যার ওটিপি কোড (OTP)
                </Text>
                <TextInput 
                  className="w-full border border-slate-200 rounded-2xl px-4 h-12 bg-slate-50 text-slate-900 text-base font-bold tracking-widest text-center" 
                  placeholder="123456" 
                  placeholderTextColor="#94a3b8" 
                  value={otpToken} 
                  onChangeText={setOtpToken} 
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>

              <View className="mb-6">
                <Text className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 leading-4">
                  নতুন পাসওয়ার্ড
                </Text>
                <View className="w-full border border-slate-200 rounded-2xl px-4 h-12 bg-slate-50 flex-row items-center justify-between">
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
                className="w-full bg-emerald-600 h-14 rounded-2xl items-center justify-center shadow-md shadow-emerald-200 active:bg-emerald-700 px-3" 
                onPress={handleVerifyAndReset} 
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text 
                    className="text-white font-bold text-sm text-center"
                    adjustsFontSizeToFit
                    numberOfLines={1}
                  >
                    পাসওয়ার্ড পরিবর্তন করুন
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => router.replace('/login')}
                className="mt-4 items-center"
              >
                <Text numberOfLines={1} className="text-slate-500 font-bold text-xs">লগইন স্ক্রিনে ফিরে যান</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}