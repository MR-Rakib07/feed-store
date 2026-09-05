import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ActivityIndicator, Platform } from 'react-native';
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
  
  // Forgot Password States
  const [forgotModalVisible, setForgotModalVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const router = useRouter();

  // জিমেইল ভ্যালিডেশন চেক করার ফাংশন
  const isValidGmail = (emailInput: string) => {
    const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/i;
    return gmailRegex.test(emailInput.trim());
  };

  const handleLogin = async () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      Toast.show({
        type: "error",
        text1: "তথ্য অসম্পূর্ণ",
        text2: "দয়া করে ইমেল এবং পাসওয়ার্ড লিখুন।",
      });
      return;
    }

    if (!isValidGmail(trimmedEmail)) {
      Toast.show({
        type: "error",
        text1: "ভুল জিমেইল অ্যাড্রেস",
        text2: "দয়া করে একটি সঠিক জিমেইল দিন (যেমন: example@gmail.com)।",
      });
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail.toLowerCase(),
      password,
    });

    setLoading(false);

    if (error) {
      Toast.show({
        type: "error",
        text1: "লগইন ব্যর্থ হয়েছে",
        text2: error.message,
      });
      return;
    }

    Toast.show({
      type: "success",
      text1: "স্বাগতম 👋",
      text2: "লগইন সফল হয়েছে",
    });

    setTimeout(() => {
      router.replace("/(tab)/home");
    }, 1000);
  };

  const handlePasswordReset = async () => {
    const trimmedResetEmail = resetEmail.trim();

    if (!trimmedResetEmail) {
      Toast.show({
        type: "error",
        text1: "ইমেল প্রয়োজন",
        text2: "দয়া করে আপনার রেজিস্টার্ড ইমেলটি লিখুন।",
      });
      return;
    }

    if (!isValidGmail(trimmedResetEmail)) {
      Toast.show({
        type: "error",
        text1: "ভুল জিমেইল অ্যাড্রেস",
        text2: "সঠিক জিমেইল অ্যাড্রেস লিখুন (যেমন: example@gmail.com)।",
      });
      return;
    }

    setResetLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(trimmedResetEmail.toLowerCase());

    setResetLoading(false);

    if (error) {
      Toast.show({
        type: "error",
        text1: "ব্যর্থ হয়েছে",
        text2: error.message,
      });
      return;
    }

    Toast.show({
      type: "success",
      text1: "কোড পাঠানো হয়েছে",
      text2: "আপনার ইমেলে ৬ সংখ্যার ওটিপি কোড পাঠানো হয়েছে।",
    });

    const targetEmail = trimmedResetEmail.toLowerCase();
    setForgotModalVisible(false);
    setResetEmail('');

    router.push({
      pathname: '/reset-password',
      params: { email: targetEmail },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <KeyboardAwareScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        enableOnAndroid={true}
        extraScrollHeight={30}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="px-6 py-8">
          {/* Header Logo & Title */}
          <View className="items-center mb-10">
            <View className="w-20 h-20 bg-emerald-50 border border-emerald-200 rounded-3xl items-center justify-center mb-4 shadow-xs">
              <Ionicons name="leaf" size={38} color="#059669" />
            </View>
            <Text className="text-3xl font-black text-slate-900 tracking-tight leading-9" numberOfLines={1}>Feed Store</Text>
            <Text className="text-xs font-semibold text-slate-400 mt-1.5 leading-4" numberOfLines={1}>আপনার গবাদি পশুর খাদ্যের স্মার্ট হিসাব</Text>
          </View>

          {/* Form Card */}
          <View className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs mb-6">
            <View className="mb-4">
              <Text className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 leading-4" numberOfLines={1}>ইমেল অ্যাড্রেস</Text>
              <TextInput 
                className="w-full border text-slate-900 border-slate-200 rounded-2xl px-4 h-12 bg-slate-50/70 text-sm font-semibold leading-5" 
                placeholder="example@gmail.com" 
                placeholderTextColor="#94a3b8" 
                value={email} 
                onChangeText={setEmail} 
                autoCapitalize="none" 
                keyboardType="email-address"
              />
            </View>
            
            <View className="mb-1">
              <Text className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 leading-4" numberOfLines={1}>পাসওয়ার্ড</Text>
              <View className="w-full border text-slate-900 border-slate-200 rounded-2xl px-4 h-12 bg-slate-50/70 flex-row items-center justify-between">
                <TextInput 
                  className="flex-1 text-slate-900 text-sm font-semibold leading-5" 
                  placeholder="কমপক্ষে ৬ অক্ষর" 
                  placeholderTextColor="#94a3b8" 
                  secureTextEntry={!showPassword} 
                  value={password} 
                  onChangeText={setPassword} 
                  autoCapitalize="none" 
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} className="shrink-0 p-1">
                  <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#64748b" />
                </TouchableOpacity>
              </View>

              {/* Forgot Password Link */}
              <TouchableOpacity 
                onPress={() => setForgotModalVisible(true)} 
                className="items-end mt-2.5 mb-1"
                activeOpacity={0.7}
              >
                <Text className="text-emerald-700 font-bold text-xs leading-4">পাসওয়ার্ড ভুলে গেছেন?</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Login Button */}
          <TouchableOpacity 
            className="w-full bg-emerald-600 h-14 rounded-2xl items-center justify-center shadow-md shadow-emerald-200 active:bg-emerald-700" 
            onPress={handleLogin} 
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text className="text-white font-black text-sm uppercase tracking-wider leading-5" numberOfLines={1}>
                প্রবেশ করুন (Login)
              </Text>
            )}
          </TouchableOpacity>

          {/* Register Footer */}
          <View className="flex-row justify-center items-center mt-8">
            <Text className="text-slate-500 font-semibold text-xs leading-4" numberOfLines={1}>অ্যাকাউন্ট নেই? </Text>
            <TouchableOpacity onPress={() => router.push('/register')} className="shrink-0" activeOpacity={0.7}>
              <Text className="text-emerald-700 font-bold text-xs leading-4" numberOfLines={1}>নতুন রেজিস্টার করুন</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAwareScrollView>

      {/* Forgot Password Modal (Keyboard Safe) */}
      <Modal 
        transparent 
        visible={forgotModalVisible} 
        animationType="fade"
        onRequestClose={() => setForgotModalVisible(false)}
      >
        <KeyboardAwareScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}
          enableOnAndroid={true}
          enableAutomaticScroll={true}
          extraScrollHeight={Platform.OS === 'android' ? 60 : 20}
          keyboardShouldPersistTaps="handled"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
        >
          <View className="bg-white rounded-3xl p-6 w-full border border-slate-100 shadow-xl">
            <Text className="text-base font-black text-slate-900 mb-1 leading-6" numberOfLines={1}>
              পাসওয়ার্ড পুনরুদ্ধার
            </Text>
            <Text className="text-xs text-slate-500 font-medium mb-4 leading-5" numberOfLines={2}>
              আপনার রেজিস্টার্ড জিমেইলটি দিন। আমরা পাসওয়ার্ড রিসেট করার ৬ সংখ্যার কোড পাঠিয়ে দেব।
            </Text>

            <View className="mb-4">
              <Text className="text-xs font-bold text-slate-700 uppercase mb-1.5 tracking-wider leading-4" numberOfLines={1}>
                আপনার ইমেল অ্যাড্রেস
              </Text>
              <TextInput 
                className="w-full border text-slate-900 border-slate-200 rounded-2xl px-4 h-12 bg-slate-50 text-sm font-semibold leading-5"
                placeholder="example@gmail.com"
                placeholderTextColor="#94a3b8"
                value={resetEmail}
                onChangeText={setResetEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View className="flex-row gap-x-2.5">
              <TouchableOpacity 
                onPress={() => setForgotModalVisible(false)}
                className="w-[38%] bg-slate-100 h-11 rounded-xl items-center justify-center px-2 active:bg-slate-200 shrink-0"
                activeOpacity={0.8}
              >
                <Text numberOfLines={1} className="text-slate-700 font-bold text-xs leading-5">বাতিল</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={handlePasswordReset}
                disabled={resetLoading}
                className="flex-1 bg-emerald-600 h-11 rounded-xl items-center justify-center px-3 shadow-xs shadow-emerald-200 active:bg-emerald-700"
                activeOpacity={0.8}
              >
                {resetLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text numberOfLines={1} className="text-white font-black text-xs uppercase tracking-wider leading-5">
                    কোড পাঠান
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAwareScrollView>
      </Modal>
    </SafeAreaView>
  );
}