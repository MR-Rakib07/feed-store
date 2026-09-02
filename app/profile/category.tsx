import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import Toast from 'react-native-toast-message';

interface Category {
  id: string;
  name: string;
}

interface SubCategory {
  id: string;
  categoryId: string; 
  name: string;       
  price: string | number; 
  weight: string | number; 
}

const convertBanglaToEnglishNumber = (input: string | number): string => {
  if (!input && input !== 0) return '';
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  
  let result = String(input).replace(/[০-৯]/g, (digit) => banglaDigits.indexOf(digit).toString());
  result = result.replace(/,/g, '');
  result = result.replace(/[^0-9.]/g, '');

  const parts = result.split('.');
  if (parts.length > 2) {
    result = parts[0] + '.' + parts.slice(1).join('');
  }

  return result;
};

export default function CategoryManagement() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [subCategoryInput, setSubCategoryInput] = useState<string>('');
  const [priceInput, setPriceInput] = useState<string>('');
  const [weightInput, setWeightInput] = useState<string>('');
  const [editingSubCategoryId, setEditingSubCategoryId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const { data: catData, error: catError } = await supabase
        .from('categories')
        .select('id, name');

      if (catError) throw catError;
      setCategories(catData || []);

      const { data: subData, error: subError } = await supabase
        .from('subcategories')
        .select('id, categoryId:category_id, name, price, weight');

      if (subError) throw subError;
      setSubCategories(subData || []);

    } catch (error: any) {
      Alert.alert('ত্রুটি', error.message || 'ডাটাবেস থেকে তথ্য সংগ্রহ করা সম্ভব হয়নি।');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCategory = (category: Category): void => {
    setSelectedCategory(category);
    setIsDropdownOpen(false);
    setSubCategoryInput('');
    setPriceInput('');
    setWeightInput('');
    setEditingSubCategoryId(null);
  };

  const handleAddOrUpdateSubCategory = async (): Promise<void> => {
    if (!selectedCategory) {
      Toast.show({
        type: 'error',
        text1: 'ত্রুটি',
        text2: 'দয়া করে ড্রপডাউন থেকে প্রথমে একটি মূল ক্যাটাগরি বেছে নিন।'
      });
      return;
    }
    if (!subCategoryInput.trim()) {
      Toast.show({
        type: 'error',
        text1: 'ত্রুটি',
        text2: 'দয়া করে সাবক্যাটাগরি বা খাদ্যের নাম লিখুন।'
      });
      return;
    }

    const cleanWeight = convertBanglaToEnglishNumber(weightInput);
    const cleanPrice = convertBanglaToEnglishNumber(priceInput);

    if (!cleanWeight.trim() || isNaN(Number(cleanWeight)) || Number(cleanWeight) <= 0) {
      Toast.show({
        type: 'error',
        text1: 'ত্রুটি',
        text2: 'দয়া করে সঠিক ওজন প্রদান করুন।'
      });
      return;
    }
    if (!cleanPrice.trim() || isNaN(Number(cleanPrice)) || Number(cleanPrice) < 0) {
      Toast.show({
        type: 'error',
        text1: 'ত্রুটি',
        text2: 'দয়া করে সঠিক মূল্য প্রদান করুন।'
      });
      return;
    }

    try {
      if (editingSubCategoryId) {
        const { error } = await supabase
          .from('subcategories')
          .update({
            name: subCategoryInput.trim(),
            price: cleanPrice,
            weight: cleanWeight
          })
          .eq('id', editingSubCategoryId);

        if (error) throw error;

        setSubCategories(prev =>
          prev.map(sub =>
            sub.id === editingSubCategoryId
              ? { 
                  ...sub, 
                  name: subCategoryInput.trim(), 
                  price: cleanPrice, 
                  weight: cleanWeight 
                }
              : sub
          )
        );
        setEditingSubCategoryId(null);
        Toast.show({
          type: 'success',
          text1: 'সফল',
          text2: 'সাবক্যাটাগরি সফলভাবে আপডেট করা হয়েছে!'
        });
      } else {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        const { data, error } = await supabase
          .from('subcategories')
          .insert([
            {
              category_id: selectedCategory.id,
              user_id: user?.id,
              name: subCategoryInput.trim(),
              price: cleanPrice,
              weight: cleanWeight,
            }
          ])
          .select('id, category_id, user_id, name, price, weight')
          .single();

        if (error) throw error;

        if (data) {
          const newSubCategory: SubCategory = {
            id: data.id,
            categoryId: data.category_id,
            name: data.name,
            price: data.price,
            weight: data.weight
          };

          setSubCategories(prev => [...prev, newSubCategory]);
          Toast.show({
            type: 'success',
            text1: 'সফল',
            text2: 'নতুন সাবক্যাটাগরি সফলভাবে যুক্ত করা হয়েছে!'
          });
        }
      }

      setSubCategoryInput('');
      setPriceInput('');
      setWeightInput('');
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'ত্রুটি',
        text2: error.message
      });
    }
  };

  const handleEditSubCategory = (subCat: SubCategory): void => {
    setSubCategoryInput(subCat.name);
    setPriceInput(subCat.price !== null && subCat.price !== undefined ? convertBanglaToEnglishNumber(subCat.price) : '');
    setWeightInput(subCat.weight !== null && subCat.weight !== undefined ? convertBanglaToEnglishNumber(subCat.weight) : '');
    
    setEditingSubCategoryId(subCat.id);
  };

  const activeSubCategories = selectedCategory
    ? subCategories.filter(sub => sub.categoryId === selectedCategory.id)
    : [];

  if (loading) {
    return (
      <SafeAreaProvider>
        <SafeAreaView className="flex-1 bg-slate-50 justify-center items-center">
          <ActivityIndicator size="large" color="#059669" />
          <Text className="text-emerald-700 mt-3 font-bold text-xs leading-5">ডাটাবেস লোড হচ্ছে...</Text>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView className="flex-1 bg-slate-50">
        <KeyboardAwareScrollView 
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 100 }}
          enableOnAndroid={true}
          extraScrollHeight={30}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View className="mb-4">
            <Text className="text-xl font-black text-slate-900 leading-7" numberOfLines={1}>
              খাদ্য ব্যবস্থাপনা
            </Text>
            <Text className="text-xs text-slate-500 mt-1 font-semibold leading-5" numberOfLines={1}>
              গবাদি পশুর বিভিন্ন খাদ্য মডেল তৈরি, সম্পাদন ও কনফিগার করুন।
            </Text>
          </View>

          {/* Main Category Dropdown Card */}
          <View className="mb-4 p-4 bg-white border border-slate-200 rounded-3xl shadow-xs">
            <Text className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 mb-2 leading-4">
              মূল ক্যাটাগরি নির্বাচন
            </Text>
            
            <TouchableOpacity 
              activeOpacity={0.7}
              onPress={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full h-12 px-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex-row items-center justify-between"
            >
              <Text className={`text-sm font-bold flex-1 pr-2 leading-6 ${selectedCategory ? 'text-slate-900' : 'text-slate-400'}`} numberOfLines={1}>
                {selectedCategory ? selectedCategory.name : 'একটি ক্যাটাগরি বেছে নিন'}
              </Text>
              <Feather name={isDropdownOpen ? 'chevron-up' : 'chevron-down'} size={18} color="#059669" className="shrink-0" />
            </TouchableOpacity>

            {isDropdownOpen && (
              <View className="mt-2 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-md">
                <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 180 }} keyboardShouldPersistTaps="handled">
                  {categories.map((item, index) => (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => handleSelectCategory(item)}
                      className={`w-full px-4 py-3 flex-row items-center justify-between active:bg-emerald-50 ${
                        index !== categories.length - 1 ? 'border-b border-slate-100' : ''
                      }`}
                    >
                      <Text className="text-sm text-slate-800 font-bold leading-5" numberOfLines={1}>{item.name}</Text>
                      {selectedCategory?.id === item.id && (
                        <Feather name="check" size={16} color="#059669" className="shrink-0" />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Add / Edit Form Card */}
          {selectedCategory && (
            <View className="mb-4 p-4 bg-white border border-slate-200 rounded-3xl shadow-xs">
              <Text className="text-sm font-black text-slate-900 mb-3 leading-6" numberOfLines={1}>
                {editingSubCategoryId ? '✏️ খাদ্য মডেল সম্পাদনা করুন' : '➕ নতুন খাদ্য মডেল যুক্ত করুন'}
              </Text>
              
              <View className="mb-3">
                <Text className="text-[11px] font-extrabold text-slate-600 mb-1.5 uppercase tracking-wider leading-4" numberOfLines={1}>
                  সাবক্যাটাগরি (খাদ্যের নাম)
                </Text>
                <TextInput
                  placeholder="যেমন: ব্রয়লার স্টার্টার, গ্রোয়ার"
                  placeholderTextColor="#94a3b8"
                  value={subCategoryInput}
                  onChangeText={(text: string) => setSubCategoryInput(text)}
                  className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-2xl text-sm font-semibold text-slate-900 leading-5"
                />
              </View>

              <View className="flex-row gap-x-3 mb-4">
                <View className="flex-1 min-w-0">
                  <Text className="text-[11px] font-extrabold text-slate-600 mb-1.5 uppercase tracking-wider leading-4" numberOfLines={1}>
                    ওজন (কেজি)
                  </Text>
                  <TextInput
                    placeholder="যেমন: ৫০"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    value={weightInput}
                    onChangeText={(text: string) => setWeightInput(convertBanglaToEnglishNumber(text))}
                    className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-2xl text-sm font-semibold text-slate-900 leading-5"
                  />
                </View>

                <View className="flex-1 min-w-0">
                  <Text className="text-[11px] font-extrabold text-slate-600 mb-1.5 uppercase tracking-wider leading-4" numberOfLines={1}>
                    মূল্য প্রতি ইউনিট (৳)
                  </Text>
                  <TextInput
                    placeholder="০.০০"
                    placeholderTextColor="#94a3b8"
                    keyboardType="decimal-pad"
                    value={priceInput}
                    onChangeText={(text: string) => setPriceInput(convertBanglaToEnglishNumber(text))}
                    className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-2xl text-sm font-semibold text-slate-900 leading-5"
                  />
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleAddOrUpdateSubCategory}
                className="w-full h-12 bg-emerald-600 rounded-2xl justify-center items-center shadow-md shadow-emerald-200 active:bg-emerald-700"
              >
                <Text className="text-xs font-black text-white uppercase tracking-wider leading-5" numberOfLines={1}>
                  {editingSubCategoryId ? 'পরিবর্তন সংরক্ষণ করুন' : 'খাদ্য মডেল সংরক্ষণ করুন'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Subcategories List Container */}
          <View className="p-4 bg-white border border-slate-200 rounded-3xl shadow-xs">
            <View className="mb-3 pb-2.5 border-b border-slate-100">
              <Text className="text-sm font-black text-slate-900 leading-6" numberOfLines={1}>
                {selectedCategory ? `তালিকা: ${selectedCategory.name}` : 'সাবক্যাটাগরিসমূহ'}
              </Text>
              <Text className="text-[11px] text-slate-500 mt-0.5 font-semibold leading-4" numberOfLines={1}>
                {selectedCategory ? 'কনফিগার করা খাদ্য মডেলসমূহ' : 'প্রথমে ওপর থেকে একটি মূল ক্যাটাগরি বেছে নিন।'}
              </Text>
            </View>

            <View className="gap-y-2.5">
              {selectedCategory && activeSubCategories.map((item) => (
                <View 
                  key={item.id} 
                  className="flex-row items-center justify-between bg-slate-50/80 px-3.5 py-3 rounded-2xl border border-slate-100"
                >
                  <View className="flex-1 pr-3 min-w-0">
                    <Text className="text-sm text-slate-900 font-bold leading-5" numberOfLines={1}>
                      {item.name}
                    </Text>
                    <View className="flex-row items-center mt-1">
                      <Text className="text-[11px] text-slate-500 font-semibold leading-4" numberOfLines={1}>
                        ওজন: {item.weight} কেজি
                      </Text>
                      <Text className="text-xs text-slate-300 mx-2">•</Text>
                      <Text className="text-[11px] text-emerald-700 font-black leading-4" numberOfLines={1}>
                        ৳ {item.price}
                      </Text>
                    </View>
                  </View>
                  
                  <TouchableOpacity 
                    onPress={() => handleEditSubCategory(item)}
                    className="px-3.5 py-2 bg-emerald-50 active:bg-emerald-100 rounded-xl shrink-0"
                    activeOpacity={0.7}
                  >
                    <Text className="text-[11px] font-black text-emerald-700 uppercase leading-4">সম্পাদনা</Text>
                  </TouchableOpacity>
                </View>
              ))}

              {selectedCategory && activeSubCategories.length === 0 && (
                <View className="py-8 bg-slate-50 border border-dashed border-slate-200 rounded-2xl items-center justify-center">
                  <MaterialCommunityIcons name="clipboard-text-outline" size={26} color="#94a3b8" />
                  <Text className="text-xs text-slate-400 font-semibold text-center px-4 mt-1.5 leading-5">
                    কোনো খাদ্য মডেল নেই। ওপরে নতুন মডেল যুক্ত করুন!
                  </Text>
                </View>
              )}

              {!selectedCategory && (
                <View className="py-8 bg-slate-50 border border-dashed border-slate-200 rounded-2xl items-center justify-center">
                  <Feather name="layers" size={26} color="#94a3b8" />
                  <Text className="text-xs text-slate-400 font-semibold text-center px-4 mt-1.5 leading-5">
                    ওপরের ড্রপডাউন থেকে একটি মূল ক্যাটাগরি বেছে নিন।
                  </Text>
                </View>
              )}
            </View>
          </View>

        </KeyboardAwareScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}