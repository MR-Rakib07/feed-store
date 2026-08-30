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
        text1: 'Success',
        text2: 'Profile updated successfully'
      });
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    Alert.alert("Delete Account", "Are you sure? This action is permanent.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const { error } = await supabase.rpc('delete_user');

            if (error) throw error;

            await supabase.auth.signOut();
            await AsyncStorage.clear();

            Alert.alert("Success", "Account deleted successfully.");
            router.replace("/login");
          } catch (err: any) {
            console.error(err);
            Alert.alert("Error", err.message || "Could not delete account.");
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <KeyboardAwareScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: 150 }}
        enableOnAndroid={true}
        extraScrollHeight={30}
        keyboardShouldPersistTaps="handled"
      >
        <View className="items-center mt-4 mb-8">
          <Text className="text-2xl font-black text-gray-800 tracking-tight">Edit Profile</Text>
          <Text className="text-gray-400 text-sm mt-1">Manage your farm identity</Text>
        </View>

        <View className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <View className="space-y-6">
            <View>
              <Text className="text-gray-400 font-bold text-xs uppercase mb-2 ml-1">Full Name</Text>
              <View className="flex-row items-center bg-gray-50 px-4 py-3 rounded-xl border border-gray-100 focus-within:border-green-500 focus-within:bg-green-50/20">
                <Ionicons name="person-outline" size={20} color="#94a3b8" />
                <TextInput value={fullName} onChangeText={setFullName} className="flex-1 ml-3 text-gray-800 font-semibold" />
              </View>
            </View>

            <View>
              <Text className="text-gray-400 font-bold text-xs uppercase mb-2 ml-1">Email</Text>
              <View className="flex-row items-center bg-gray-100 px-4 py-3 rounded-xl border border-gray-100">
                <Ionicons name="mail-outline" size={20} color="#94a3b8" />
                <TextInput value={email} editable={false} className="flex-1 ml-3 text-gray-400 font-medium" />
              </View>
            </View>

            <View>
              <Text className="text-gray-400 font-bold text-xs uppercase mb-2 ml-1">Farm Name</Text>
              <View className="flex-row items-center bg-gray-50 px-4 py-3 rounded-xl border border-gray-100 focus-within:border-green-500 focus-within:bg-green-50/20">
                <Ionicons name="business-outline" size={20} color="#94a3b8" />
                <TextInput value={farmName} onChangeText={setFarmName} className="flex-1 ml-3 text-gray-800 font-semibold" />
              </View>
            </View>
          </View>
        </View>

        <View className="mt-8 space-y-4">
          <TouchableOpacity onPress={handleSaveProfile} disabled={saving} className="bg-green-600 py-4 rounded-2xl items-center shadow-lg shadow-green-200">
            <Text className="text-white font-bold text-lg">{saving ? 'Saving...' : 'Update Profile'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleDeleteAccount} className="py-4 mt-4 rounded-2xl items-center border border-red-100 bg-red-50/30">
            <Text className="text-red-500 font-bold">Delete My Account</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}