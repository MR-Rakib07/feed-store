import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  Alert, ActivityIndicator
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

export default function EditProfile() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [farmName, setFarmName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email || '');

      const { data } = await supabase
        .from('profiles')
        .select('full_name, farm_name')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setFullName(data.full_name || '');
        setFarmName(data.farm_name || '');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName, farm_name: farmName })
        .eq('user_id', user.id);

      if (error) throw error;
      Toast.show({
        type: 'success',
        text1: 'সফল',
        text2: 'প্রোফাইল সফলভাবে আপডেট করা হয়েছে।'
      });
    } catch (err: any) {
      Alert.alert('ত্রুটি', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    Alert.alert("অ্যাকাউন্ট মুছে ফেলুন", "আপনি কি নিশ্চিত? এই কাজটি স্থায়ী এবং অপরিবর্তনীয়।", [
      { text: "বাতিল", style: "cancel" },
      {
        text: "মুছে ফেলুন",
        style: "destructive",
        onPress: async () => {
          try {
            const { error } = await supabase.rpc('delete_user');

            if (error) throw error;

            await supabase.auth.signOut();
            await AsyncStorage.clear();

            Alert.alert("সফল", "অ্যাকাউন্ট সফলভাবে মুছে ফেলা হয়েছে।");
            router.replace("/login");
          } catch (err: any) {
            console.error(err);
            Alert.alert("ত্রুটি", err.message || "অ্যাকাউন্ট মোছা সম্ভব হয়নি।");
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-50">
        <ActivityIndicator size="large" color="#059669" />
        <Text className="text-slate-400 font-bold mt-3 text-xs tracking-wider leading-4" numberOfLines={1}>লোড হচ্ছে...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <KeyboardAwareScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: 150 }}
        enableOnAndroid={true}
        extraScrollHeight={30}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View className="items-center mt-2 mb-6">
          <View className="w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-3xl items-center justify-center mb-3 shadow-xs">
            <Ionicons name="person-circle-outline" size={34} color="#059669" />
          </View>
          <Text className="text-2xl font-black text-slate-900 tracking-tight leading-8" numberOfLines={1}>প্রোফাইল সেটিংস</Text>
          <Text className="text-xs font-semibold text-slate-400 mt-1 leading-4" numberOfLines={1}>আপনার খামারের পরিচয় এবং তথ্য পরিচালনা করুন</Text>
        </View>

        {/* Form Card */}
        <View className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
          <View className="space-y-4">
            <View className="mb-4">
              <Text className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 leading-4" numberOfLines={1}>পূর্ণ নাম</Text>
              <View className="flex-row items-center bg-slate-50/70 px-4 h-12 rounded-2xl border border-slate-200 focus-within:border-emerald-500 focus-within:bg-emerald-50/20">
                <Ionicons name="person-outline" size={18} color="#94a3b8" className="shrink-0" />
                <TextInput 
                  value={fullName} 
                  onChangeText={setFullName} 
                  placeholder="আপনার নাম লিখুন"
                  placeholderTextColor="#94a3b8"
                  className="flex-1 ml-3 text-slate-900 text-sm font-semibold leading-5" 
                />
              </View>
            </View>

            <View className="mb-4">
              <Text className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 leading-4" numberOfLines={1}>ইমেল অ্যাড্রেস</Text>
              <View className="flex-row items-center bg-slate-100 px-4 h-12 rounded-2xl border border-slate-200 opacity-80">
                <Ionicons name="mail-outline" size={18} color="#94a3b8" className="shrink-0" />
                <TextInput 
                  value={email} 
                  editable={false} 
                  className="flex-1 ml-3 text-slate-400 text-sm font-medium leading-5" 
                />
              </View>
            </View>

            <View className="mb-1">
              <Text className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 leading-4" numberOfLines={1}>খামারের নাম</Text>
              <View className="flex-row items-center bg-slate-50/70 px-4 h-12 rounded-2xl border border-slate-200 focus-within:border-emerald-500 focus-within:bg-emerald-50/20">
                <Ionicons name="business-outline" size={18} color="#94a3b8" className="shrink-0" />
                <TextInput 
                  value={farmName} 
                  onChangeText={setFarmName} 
                  placeholder="আপনার খামারের নাম লিখুন"
                  placeholderTextColor="#94a3b8"
                  className="flex-1 ml-3 text-slate-900 text-sm font-semibold leading-5" 
                />
              </View>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View className="mt-6 space-y-3">
          <TouchableOpacity 
            onPress={handleSaveProfile} 
            disabled={saving} 
            className="bg-emerald-600 h-14 rounded-2xl items-center justify-center shadow-md shadow-emerald-200 active:bg-emerald-700"
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text className="text-white font-black text-sm uppercase tracking-wider leading-5" numberOfLines={1}>
                পরিবর্তন সংরক্ষণ করুন
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={handleDeleteAccount} 
            className="h-14 mt-3 rounded-2xl items-center justify-center border border-rose-100 bg-rose-50/40 active:bg-rose-100/50"
            activeOpacity={0.8}
          >
            <Text className="text-rose-600 font-bold text-xs uppercase tracking-wider leading-4" numberOfLines={1}>
              অ্যাকাউন্ট মুছে ফেলুন
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}