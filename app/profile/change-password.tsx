import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Toast from 'react-native-toast-message';

export default function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async () => {
    if (
      !currentPassword.trim() ||
      !newPassword.trim() ||
      !confirmPassword.trim()
    ) {
      Toast.show({
        type: 'error',
        text1: 'ত্রুটি',
        text2: 'সকল ফিল্ড পূরণ করা বাধ্যতামূলক।'
      });
      return;
    }

    if (newPassword.length < 6) {
      Toast.show({
        type: 'error',
        text1: 'দুর্বল পাসওয়ার্ড',
        text2: 'নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।'
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      Toast.show({
        type: 'error',
        text1: 'পাসওয়ার্ড মিলছে না',
        text2: 'নতুন পাসওয়ার্ড এবং কনফার্ম পাসওয়ার্ড এক হতে হবে।'
      });
      return;
    }

    try {
      setLoading(true);
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        Toast.show({
          type: 'error',
          text1: 'ত্রুটি',
          text2: 'ব্যবহারকারী পাওয়া যায়নি। দয়া করে আবার লগইন করুন।'
        });
        return;
      }

      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: currentPassword
      });

      if (loginError) {
        Toast.show({
          type: 'error',
          text1: 'ত্রুটি',
          text2: 'বর্তমান পাসওয়ার্ডটি সঠিক নয়।'
        });
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        throw updateError;
      }

      Toast.show({
        type: 'success',
        text1: 'সফল',
        text2: 'পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!'
      });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'ত্রুটি',
        text2: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView className="flex-1 bg-slate-50">
        <KeyboardAwareScrollView
          contentContainerStyle={{
            flexGrow: 1,
            padding: 20,
            paddingBottom: 40
          }}
          enableOnAndroid={true}
          extraScrollHeight={30}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View className="items-center mt-2 mb-6">
            <View className="w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-3xl items-center justify-center mb-3 shadow-xs">
              <Ionicons name="lock-closed-outline" size={32} color="#059669" />
            </View>
            <Text className="text-2xl font-black text-slate-900 tracking-tight leading-8" numberOfLines={1}>
              পাসওয়ার্ড পরিবর্তন
            </Text>
            <Text className="text-xs font-semibold text-slate-400 mt-1 leading-4 text-center" numberOfLines={2}>
              আপনার অ্যাকাউন্ট সুরক্ষিত রাখতে একটি শক্তিশালী পাসওয়ার্ড বেছে নিন।
            </Text>
          </View>

          {/* Form Card */}
          <View className="bg-white border border-slate-200 rounded-3xl p-5 mb-6 shadow-xs space-y-4">
            <View className="mb-4">
              <Text className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 leading-4" numberOfLines={1}>
                বর্তমান পাসওয়ার্ড
              </Text>
              <View className="w-full border text-slate-900 border-slate-200 rounded-2xl px-4 h-12 bg-slate-50/70 flex-row items-center justify-between">
                <TextInput
                  placeholder="বর্তমান পাসওয়ার্ড দিন"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={!showCurrent}
                  autoCapitalize="none"
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  className="flex-1 text-slate-900 text-sm font-semibold leading-5"
                />
                <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)} className="shrink-0 p-1">
                  <Ionicons name={showCurrent ? "eye-off" : "eye"} size={20} color="#64748b" />
                </TouchableOpacity>
              </View>
            </View>

            <View className="mb-4">
              <Text className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 leading-4" numberOfLines={1}>
                নতুন পাসওয়ার্ড
              </Text>
              <View className="w-full border text-slate-900 border-slate-200 rounded-2xl px-4 h-12 bg-slate-50/70 flex-row items-center justify-between">
                <TextInput
                  placeholder="কমপক্ষে ৬ অক্ষরের নতুন পাসওয়ার্ড"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={!showNew}
                  autoCapitalize="none"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  className="flex-1 text-slate-900 text-sm font-semibold leading-5"
                />
                <TouchableOpacity onPress={() => setShowNew(!showNew)} className="shrink-0 p-1">
                  <Ionicons name={showNew ? "eye-off" : "eye"} size={20} color="#64748b" />
                </TouchableOpacity>
              </View>
            </View>

            <View className="mb-1">
              <Text className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 leading-4" numberOfLines={1}>
                কনফার্ম নতুন পাসওয়ার্ড
              </Text>
              <View className="w-full border text-slate-900 border-slate-200 rounded-2xl px-4 h-12 bg-slate-50/70 flex-row items-center justify-between">
                <TextInput
                  placeholder="পুনরায় নতুন পাসওয়ার্ড দিন"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={!showConfirm}
                  autoCapitalize="none"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  className="flex-1 text-slate-900 text-sm font-semibold leading-5"
                />
                <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} className="shrink-0 p-1">
                  <Ionicons name={showConfirm ? "eye-off" : "eye"} size={20} color="#64748b" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleChangePassword}
            disabled={loading}
            className="w-full h-14 bg-emerald-600 rounded-2xl justify-center items-center shadow-md shadow-emerald-200 active:bg-emerald-700"
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text className="text-white font-black text-sm uppercase tracking-wider leading-5" numberOfLines={1}>
                পাসওয়ার্ড আপডেট করুন
              </Text>
            )}
          </TouchableOpacity>
        </KeyboardAwareScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}