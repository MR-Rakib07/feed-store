import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const handleRegister = async () => {
    if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
      Toast.show({
        type: "error",
        text1: "তথ্য অসম্পূর্ণ",
        text2: "সকল ফিল্ড পূরণ করা বাধ্যতামূলক।",
      });
      return;
    }

    if (password.length < 6) {
      Toast.show({
        type: "error",
        text1: "দুর্বল পাসওয়ার্ড",
        text2: "পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।",
      });
      return;
    }

    if (password !== confirmPassword) {
      Toast.show({
        type: "error",
        text1: "পাসওয়ার্ড মিলছে না",
        text2: "পাসওয়ার্ড এবং কনফার্ম পাসওয়ার্ড এক হতে হবে।",
      });
      return;
    }

    setLoading(true);

    try {
      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      if (count && count > 0) {
        Toast.show({
          type: "error",
          text1: "অ্যাক্সেস নিষিদ্ধ",
          text2: "এই অ্যাপটিতে শুধুমাত্র একজন ব্যবহারকারী রেজিস্টার করতে পারবেন।",
        });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (error) {
        Toast.show({
          type: "error",
          text1: "রেজিস্ট্রেশন ব্যর্থ হয়েছে",
          text2: error.message,
        });
        setLoading(false);
        return;
      }

      if (data.user) {
        const { error: profileError } = await supabase
          .from("profiles")
          .insert([
            {
              user_id: data.user.id,
              full_name: "",
              farm_name: "",
              avatar: null,
            },
          ]);

        if (profileError) {
          Toast.show({
            type: "error",
            text1: "প্রোফাইল ত্রুটি",
            text2: profileError.message,
          });
          setLoading(false);
          return;
        }
      }

      await AsyncStorage.setItem("isRegistered", "true");

      Toast.show({
        type: "success",
        text1: "রেজিস্ট্রেশন সফল হয়েছে 🎉",
        text2: "আপনার অ্যাকাউন্ট তৈরি করা হয়েছে।",
      });

      setTimeout(() => {
        router.replace("/login");
      }, 1000);
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "অপ্রত্যাশিত ত্রুটি",
        text2: err.message || "কিছু ভুল হয়েছে।",
      });
    } finally {
      setLoading(false);
    }
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
          <View className="items-center mb-8">
            <View className="w-20 h-20 bg-emerald-50 border border-emerald-200 rounded-3xl items-center justify-center mb-4 shadow-xs">
              <Ionicons name="leaf" size={38} color="#059669" />
            </View>
            <Text className="text-3xl font-black text-slate-900 tracking-tight leading-9" numberOfLines={1}>Feed Store</Text>
            <Text className="text-xs font-semibold text-slate-400 mt-1.5 leading-4" numberOfLines={1}>নতুন অ্যাকাউন্ট তৈরি করুন</Text>
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

            <View className="mb-4">
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
            </View>

            <View className="mb-1">
              <Text className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 leading-4" numberOfLines={1}>কনফার্ম পাসওয়ার্ড</Text>
              <View className="w-full border text-slate-900 border-slate-200 rounded-2xl px-4 h-12 bg-slate-50/70 flex-row items-center justify-between">
                <TextInput
                  className="flex-1 text-slate-900 text-sm font-semibold leading-5"
                  placeholder="পুনরায় পাসওয়ার্ড লিখুন"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} className="shrink-0 p-1">
                  <Ionicons name={showConfirmPassword ? "eye-off" : "eye"} size={20} color="#64748b" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Register Button */}
          <TouchableOpacity
            className="w-full bg-emerald-600 h-14 rounded-2xl items-center justify-center shadow-md shadow-emerald-200 active:bg-emerald-700"
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text className="text-white font-black text-sm uppercase tracking-wider leading-5" numberOfLines={1}>
                রেজিস্টার করুন (Register)
              </Text>
            )}
          </TouchableOpacity>

          {/* Login Footer */}
          <View className="flex-row justify-center items-center mt-8">
            <Text className="text-slate-500 font-semibold text-xs leading-4" numberOfLines={1}>ইতিমধ্যে অ্যাকাউন্ট আছে? </Text>
            <TouchableOpacity onPress={() => router.push('/login')} className="shrink-0" activeOpacity={0.7}>
              <Text className="text-emerald-700 font-bold text-xs leading-4" numberOfLines={1}>লগইন করুন</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}