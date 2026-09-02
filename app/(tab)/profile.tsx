import React, { useEffect, useState } from 'react';
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useRouter, Href } from 'expo-router';
import { supabase } from '../../lib/supabase';

interface MenuItem {
  id: string;
  title: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  isLogout?: boolean;
  path?: Href;
}

export default function ProfileScreen() {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [farmName, setFarmName] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const menuItems: MenuItem[] = [
    {
      id: '1',
      title: 'Edit Profile',
      icon: 'account-outline',
      path: '/profile/edit-profile',
    },
    {
      id: '2',
      title: 'Balance',
      icon: 'wallet-outline',
      path: '/profile/balance',
    },
    {
      id: '3',
      title: 'Change Password',
      icon: 'lock-outline',
      path: '/profile/change-password',
    },
    {
      id: '4',
      title: 'Category Management',
      icon: 'clipboard-text-outline',
      path: '/profile/category',
    },
    {
      id: '5',
      title: 'Logout',
      icon: 'logout',
      isLogout: true,
    },
  ];

  const loadProfile = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        // নেভিগেশন স্টেট রেডি হতে ১০০ms সময় দেওয়া হচ্ছে যাতে ক্র্যাশ না করে
        setTimeout(() => {
          router.replace('/login');
        }, 100);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, farm_name')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.log(error.message);
        return;
      }

      setFullName(data?.full_name || 'User');
      setFarmName(data?.farm_name || '');
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.auth.signOut({ scope: 'local' });

            if (error) {
              Alert.alert('Error', error.message);
              return;
            }
            router.replace('/login');
          },
        },
      ]
    );
  };

  if (loading && !refreshing) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-50">
        <ActivityIndicator size="large" color="#059669" />
        <Text className="text-slate-500 font-semibold mt-3 text-xs">Loading Profile...</Text>
      </View>
    );
  }

  // নামের প্রথম বড় হাতের অক্ষর বের করার লজিক
  const initialLetter = fullName.trim() ? fullName.trim().charAt(0).toUpperCase() : 'U';

  return (
    <SafeAreaProvider>
      <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
        <ScrollView
          className="flex-1 bg-slate-50"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#059669"
              colors={['#059669']}
            />
          }
        >
          {/* Header Title */}
          <View className="px-6 pt-4 pb-2">
            <Text className="text-2xl font-black text-slate-900 tracking-tight">
              Profile
            </Text>
            <Text className="text-xs font-semibold text-slate-400 mt-0.5">
              Manage account & farm preferences
            </Text>
          </View>

          {/* Profile Header Info Card */}
          <View className="mx-5 my-4 p-5 bg-white rounded-3xl border border-slate-200/80 shadow-sm flex-row items-center">
            {/* Letter Badge Avatar */}
            <View className="w-16 h-16 rounded-2xl bg-emerald-100/80 justify-center items-center mr-4 border border-emerald-200">
              <Text className="text-2xl font-black text-emerald-700">
                {initialLetter}
              </Text>
            </View>

            <View className="flex-1">
              <Text className="text-lg font-black text-slate-900 capitalize" numberOfLines={1}>
                {fullName}
              </Text>
              <View className="flex-row items-center mt-1">
                <Text className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md uppercase mr-2">
                  Owner
                </Text>
                {farmName ? (
                  <Text className="text-xs text-slate-500 font-semibold capitalize" numberOfLines={1}>
                    {farmName}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>

          {/* Menu Items Section */}
          <View className="px-5 py-2">
            <View className="bg-white rounded-3xl p-2 border border-slate-200/80 shadow-sm gap-1">
              {menuItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.7}
                  className="flex-row items-center justify-between p-3.5 rounded-2xl active:bg-slate-50"
                  onPress={() => {
                    if (item.isLogout) {
                      handleLogout();
                    } else if (item.path) {
                      router.push(item.path);
                    }
                  }}
                >
                  <View className="flex-row items-center">
                    <View className={`w-9 h-9 rounded-xl items-center justify-center mr-3.5 ${
                      item.isLogout ? 'bg-rose-50' : 'bg-slate-100'
                    }`}>
                      <MaterialCommunityIcons
                        name={item.icon}
                        size={20}
                        color={item.isLogout ? '#ef4444' : '#334155'}
                      />
                    </View>
                    <Text
                      className={`text-sm font-bold ${
                        item.isLogout ? 'text-rose-600' : 'text-slate-800'
                      }`}
                    >
                      {item.title}
                    </Text>
                  </View>

                  {!item.isLogout && (
                    <Feather
                      name="chevron-right"
                      size={18}
                      color="#94a3b8"
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}