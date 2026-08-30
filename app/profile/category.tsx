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
      Alert.alert('Error', error.message || 'Failed to fetch data from database.');
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
        type:'error',
        text1:'Error',
        text2:'Please select a Category first from the dropdown.'
      })
      return;
    }
    if (!subCategoryInput.trim()) {
      Toast.show({
        type:'error',
        text1:'Error',
        text2:'Please enter a Subcategory (Feed Type) name.'
      })
      return;
    }
    if (!weightInput.trim() || isNaN(Number(weightInput))) {
      Toast.show({
        type:'error',
        text1:'Error',
        text2:'Please enter a valid weight.'
      })
      return;
    }
    if (!priceInput.trim() || isNaN(Number(priceInput))) {
      Toast.show({
        type:'error',
        text1:'Error',
        text2:'Please enter a valid price.'
      })
      return;
    }

    try {
      if (editingSubCategoryId) {
        const { error } = await supabase
          .from('subcategories')
          .update({
            name: subCategoryInput.trim(),
            price: priceInput.trim(),
            weight: weightInput.trim()
          })
          .eq('id', editingSubCategoryId);

        if (error) throw error;

        setSubCategories(prev =>
          prev.map(sub =>
            sub.id === editingSubCategoryId
              ? { 
                  ...sub, 
                  name: subCategoryInput.trim(), 
                  price: priceInput.trim(), 
                  weight: weightInput.trim() 
                }
              : sub
          )
        );
        setEditingSubCategoryId(null);
        Toast.show({
          type:'success',
          text1:'Success',
          text2:'Subcategory updated successfully!'
        }) 
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
              price: priceInput.trim(),
              weight: weightInput.trim(),
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
            type:'success',
            text1:'Success',
            text2:'Subcategory added successfully!'
          }) 
        }
      }

      setSubCategoryInput('');
      setPriceInput('');
      setWeightInput('');
    } catch (error: any) {
      Toast.show({
        type:'error',
        text1:'Error',
        text2:error.message
      }) 
    }
  };

  const handleEditSubCategory = (subCat: SubCategory): void => {
    setSubCategoryInput(subCat.name);
    setPriceInput(subCat.price !== null && subCat.price !== undefined ? subCat.price.toString() : '');
    setWeightInput(subCat.weight !== null && subCat.weight !== undefined ? subCat.weight.toString() : '');
    
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
          <Text className="text-emerald-700 mt-4 font-semibold text-base">Loading Database...</Text>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView className="flex-1 bg-slate-50">
        <KeyboardAwareScrollView 
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
          className="p-5"
          enableOnAndroid={true}
          extraScrollHeight={30}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="mb-6 mt-3 px-1">
            <Text className="text-2xl font-black text-slate-900 tracking-tight">Feed Management</Text>
            <Text className="text-sm text-slate-500 mt-1.5 font-medium">
              Create, update and configure dynamic feed models for livestock.
            </Text>
          </View>

          <View className="mb-5 p-5 bg-white border border-emerald-100 rounded-2xl shadow-sm relative" style={{ zIndex: 999 }}>
            <Text className="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-2">Main Category</Text>
            
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full h-12 px-4 bg-emerald-50/40 border border-emerald-100 rounded-xl flex-row items-center justify-between"
            >
              <Text className={`text-base font-semibold ${selectedCategory ? 'text-slate-900' : 'text-slate-400'}`}>
                {selectedCategory ? selectedCategory.name : 'Select a Category'}
              </Text>
              <Text className="text-emerald-600 font-bold text-xs">{isDropdownOpen ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {isDropdownOpen && (
              <View className="absolute top-[86px] left-5 right-5 bg-white border border-emerald-100 rounded-xl shadow-xl overflow-hidden" style={{ zIndex: 1000 }}>
                <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 200 }} keyboardShouldPersistTaps="handled">
                  {categories.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => handleSelectCategory(item)}
                      className="w-full px-4 py-3.5 border-b border-slate-50 active:bg-emerald-50"
                    >
                      <Text className="text-base text-slate-700 font-medium">{item.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {selectedCategory ? (
            <View className="mb-5 p-5 bg-white border border-slate-100 rounded-2xl shadow-sm">
              <Text className="text-lg font-extrabold text-slate-900 mb-4">
                {editingSubCategoryId ? `✏️ Edit Model` : `➕ Add New Feed Model`}
              </Text>
              
              <View className="mb-4">
                <Text className="text-xs font-bold text-slate-600 mb-1.5">Subcategory (Feed Name)</Text>
                <TextInput
                  placeholder="e.g. Broiler Starter, Grower"
                  placeholderTextColor="#94a3b8"
                  value={subCategoryInput}
                  onChangeText={(text: string) => setSubCategoryInput(text)}
                  className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-base text-slate-900 focus:border-emerald-500"
                />
              </View>

              <View className="mb-4">
                <Text className="text-xs font-bold text-slate-600 mb-1.5">Weight (kg)</Text>
                <TextInput
                  placeholder="e.g. 50"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  value={weightInput}
                  onChangeText={(text: string) => setWeightInput(text)}
                  className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-base text-slate-900 focus:border-emerald-500"
                />
              </View>

              <View className="mb-5">
                <Text className="text-xs font-bold text-slate-600 mb-1.5">Price per Unit (৳)</Text>
                <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-xl px-4 h-11 focus:border-emerald-500">
                  <Text className="text-base text-slate-500 font-bold mr-1.5">৳</Text>
                  <TextInput
                    placeholder="0.00"
                    placeholderTextColor="#94a3b8"
                    keyboardType="decimal-pad"
                    value={priceInput}
                    onChangeText={(text: string) => setPriceInput(text)}
                    className="flex-1 h-full text-base text-slate-900 font-medium"
                  />
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleAddOrUpdateSubCategory}
                className="w-full h-12 bg-green-600 rounded-xl justify-center items-center shadow-md shadow-emerald-200 active:bg-emerald-700"
              >
                <Text className="text-base font-bold text-white">
                  {editingSubCategoryId ? 'Update Changes' : 'Save Feed Model'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <View className="p-5 bg-emerald-50/50 border border-emerald-100 rounded-2xl">
            <View className="mb-4">
              <Text className="text-base font-extrabold text-slate-900">
                {selectedCategory ? `List: ${selectedCategory.name}` : 'Subcategories'}
              </Text>
              <Text className="text-xs text-slate-500 mt-0.5">
                {selectedCategory ? 'Manage configured models for this category' : 'Select a main category to manage subcategories.'}
              </Text>
            </View>

            <View style={{ gap: 10 }}>
              {selectedCategory && activeSubCategories.map((item) => (
                <View 
                  key={item.id} 
                  className="flex-row items-center justify-between bg-white px-4 py-3.5 rounded-xl border border-slate-100 shadow-sm relative overflow-hidden"
                >
                  <View className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
                  
                  <View className="flex-1 pl-1 pr-2">
                    <Text className="text-base text-slate-900 font-bold">{item.name}</Text>
                    <View className="flex-row items-center mt-1">
                      <View className="bg-slate-100 px-2 py-0.5 rounded-md">
                        <Text className="text-xs text-slate-600 font-bold">Wt: {item.weight} kg</Text>
                      </View>
                      <Text className="text-xs text-slate-300 mx-2">|</Text>
                      <Text className="text-sm text-emerald-700 font-extrabold">৳ {item.price}</Text>
                    </View>
                  </View>
                  
                  <View className="flex-row">
                    <TouchableOpacity 
                      onPress={() => handleEditSubCategory(item)}
                      className="px-4 py-2 bg-emerald-50 active:bg-emerald-100 rounded-xl"
                      activeOpacity={0.7}
                    >
                      <Text className="text-xs font-black text-emerald-700 uppercase tracking-wider">Edit</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {selectedCategory && activeSubCategories.length === 0 && (
                <View className="py-8 bg-white/80 border border-dashed border-emerald-200 rounded-xl items-center justify-center">
                  <Text className="text-sm text-emerald-700 font-medium text-center">
                    No models yet. Add your first model above!
                  </Text>
                </View>
              )}

              {!selectedCategory && (
                <View className="py-8 bg-white/80 border border-dashed border-slate-200 rounded-xl items-center justify-center">
                  <Text className="text-sm text-slate-400 font-medium text-center">
                    Choose a main category from dropdown above.
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