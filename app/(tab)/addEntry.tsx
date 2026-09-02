import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  ScrollView, 
  TouchableOpacity, 
  Platform,
  Alert,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import DateTimePicker from '@react-native-community/datetimepicker';
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
  price: string; 
  weight: string; 
}

interface SelectedSubCategoryItem {
  subCategory: SubCategory;
  bags: string;
}

interface MultiSelectProps<T> {
  label: string;
  placeholder: string;
  selectedItems: T[];
  options: T[];
  getLabel: (opt: T) => string;
  onToggleSelect: (option: T) => void;
  disabled?: boolean;
}

const cleanToEnglishNumber = (input: string | number): string => {
  if (input === null || input === undefined) return '';
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  
  let converted = String(input).replace(/[০-৯]/g, (match) => banglaDigits.indexOf(match).toString());
  
  converted = converted.replace(/,/g, '');
  converted = converted.replace(/[^0-9.]/g, '');

  const parts = converted.split('.');
  if (parts.length > 2) {
    converted = parts[0] + '.' + parts.slice(1).join('');
  }

  return converted;
};

function MultiSelect<T extends { id: string }>({ 
  label, 
  placeholder, 
  selectedItems, 
  options, 
  getLabel, 
  onToggleSelect, 
  disabled = false 
}: MultiSelectProps<T>) {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const isSelected = (item: T) => selectedItems.some(s => s.id === item.id);

  return (
    <View className="mb-4">
      <Text className="text-slate-700 font-bold mb-1.5 text-xs uppercase tracking-wider">{label}</Text>
      <TouchableOpacity 
        onPress={() => {
          if (!disabled) setIsOpen(!isOpen);
        }} 
        disabled={disabled}
        className={`flex-row justify-between items-center bg-white border ${isOpen ? 'border-emerald-500' : 'border-slate-200'} rounded-xl p-3.5 min-h-[50px] ${disabled ? 'bg-slate-100 opacity-60' : ''}`}
        activeOpacity={0.7}
      >
        <Text className={`text-sm font-medium flex-1 pr-2 ${selectedItems.length > 0 ? 'text-slate-900' : 'text-slate-400'}`} numberOfLines={1}>
          {selectedItems.length > 0 
            ? `${selectedItems.length} টি সাবক্যাটাগরি নির্বাচিত` 
            : placeholder}
        </Text>
        <Text className="text-emerald-600 font-bold text-xs">{isOpen ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      
      {isOpen && options.length > 0 && (
        <View className="bg-white border border-emerald-100 rounded-xl mt-2.5 overflow-hidden shadow-lg shadow-emerald-100/50">
          <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 220 }} keyboardShouldPersistTaps="handled">
            {options.map((opt: T, index: number) => {
              const selected = isSelected(opt);
              const isLast = index === options.length - 1;
              return (
                <TouchableOpacity 
                  key={opt.id} 
                  className={`p-3.5 flex-row justify-between items-center ${selected ? 'bg-emerald-50' : ''} ${isLast ? '' : 'border-b border-slate-50'}`}
                  onPress={() => onToggleSelect(opt)}
                >
                  <Text className={`text-sm font-medium flex-1 pr-2 ${selected ? 'text-emerald-800 font-bold' : 'text-slate-700'}`}>
                    {getLabel(opt)}
                  </Text>
                  <Text className="text-emerald-600 font-bold text-sm">
                    {selected ? '✓' : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

export default function FeedEntryForm() {
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [filteredSubCategories, setFilteredSubCategories] = useState<SubCategory[]>([]);

  const [date, setDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  
  const [selectedSubCategoryItems, setSelectedSubCategoryItems] = useState<SelectedSubCategoryItem[]>([]);
  
  const [transportCost, setTransportCost] = useState<string>(''); 
  const [paidAmount, setPaidAmount] = useState<string>(''); 
  const [note, setNote] = useState<string>('');

  const [totalBags, setTotalBags] = useState<number>(0);
  const [calculatedKg, setCalculatedKg] = useState<number>(0);
  const [totalPrice, setTotalPrice] = useState<number>(0);
  const [grandTotal, setGrandTotal] = useState<number>(0);
  const [dueAmount, setDueAmount] = useState<number>(0);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    let bagsSum = 0;
    let kgSum = 0;
    let priceSum = 0;

    selectedSubCategoryItems.forEach(item => {
      const quantity = parseFloat(cleanToEnglishNumber(item.bags)) || 0;
      const weight = parseFloat(cleanToEnglishNumber(item.subCategory.weight)) || 0;
      const price = parseFloat(cleanToEnglishNumber(item.subCategory.price)) || 0;

      const totalKgForItem = quantity * weight;
      const bagEquivalent = totalKgForItem / 50;

      bagsSum += bagEquivalent;
      kgSum += totalKgForItem;
      priceSum += quantity * price;
    });

    const transport = parseFloat(cleanToEnglishNumber(transportCost)) || 0;
    const paid = parseFloat(cleanToEnglishNumber(paidAmount)) || 0;
    const grand = priceSum + transport;
    const due = grand - paid;

    setTotalBags(parseFloat(bagsSum.toFixed(2)));
    setCalculatedKg(kgSum);
    setTotalPrice(priceSum);
    setGrandTotal(grand);
    setDueAmount(due);
  }, [selectedSubCategoryItems, transportCost, paidAmount]);

  const fetchInitialData = async (isRefreshing = false) => {
    try {
      if (isRefreshing) setRefreshing(true);
      else setLoading(true);
      
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
      Toast.show({
        type: 'error',
        text1: 'ডাটাবেস ত্রুটি',
        text2: error.message 
      });
      Alert.alert('ডাটাবেস ত্রুটি', error.message || 'রেকর্ড সংগ্রহ করা সম্ভব হয়নি।');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category);
    setSelectedSubCategoryItems([]);
    const filtered = subCategories.filter(sub => sub.categoryId === category.id);
    setFilteredSubCategories(filtered);
  };

  const handleToggleSubCategory = (subCat: SubCategory) => {
    setSelectedSubCategoryItems(prev => {
      const exists = prev.some(item => item.subCategory.id === subCat.id);
      if (exists) {
        return prev.filter(item => item.subCategory.id !== subCat.id);
      } else {
        return [...prev, { subCategory: subCat, bags: '' }];
      }
    });
  };

  const handleBagChange = (subCatId: string, text: string) => {
    const cleanedText = cleanToEnglishNumber(text);
    setSelectedSubCategoryItems(prev =>
      prev.map(item =>
        item.subCategory.id === subCatId ? { ...item, bags: cleanedText } : item
      )
    );
  };

  const onDateValueChange = (event: any, selectedDate?: Date): void => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(num));
  };

  const handleSave = async (): Promise<void> => {
    if (!selectedCategory) {
      Toast.show({
        type: 'error',
        text1: 'যাচাইকরণ ত্রুটি',
        text2: 'দয়া করে একটি মূল ক্যাটাগরি নির্বাচন করুন।'
      });
      return;
    }
    if (selectedSubCategoryItems.length === 0) {
      Toast.show({
        type: 'error',
        text1: 'যাচাইকরণ ত্রুটি',
        text2: 'দয়া করে অন্তত একটি সাবক্যাটাগরি বা খাদ্যের ধরন নির্বাচন করুন।'
      });
      return;
    }

    const hasInvalidBag = selectedSubCategoryItems.some(
      item => !item.bags.trim() || isNaN(Number(cleanToEnglishNumber(item.bags))) || Number(cleanToEnglishNumber(item.bags)) <= 0
    );

    if (hasInvalidBag) {
      Toast.show({
        type: 'error',
        text1: 'যাচাইকরণ ত্রুটি',
        text2: 'নির্বাচিত সকল খাদ্যের জন্য সঠিক পরিমাণ লিখুন।'
      });
      return;
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;

    const parseId = (id: string) => {
      const parsed = parseInt(id, 10);
      return isNaN(parsed) ? id : parsed;
    };

    try {
      setSubmitting(true);
      
      const { data: { user } } = await supabase.auth.getUser();

      const itemsSummary = selectedSubCategoryItems.map(item => {
        const qty = parseFloat(cleanToEnglishNumber(item.bags));
        const weight = parseFloat(cleanToEnglishNumber(item.subCategory.weight));
        const price = parseFloat(cleanToEnglishNumber(item.subCategory.price));
        const totalKgForItem = qty * weight;
        
        return {
          subcategory_id: parseId(item.subCategory.id),
          name: item.subCategory.name,
          input_quantity: qty,
          unit_weight_kg: weight,
          price_per_unit: price,
          total_kg: totalKgForItem,
          standard_50kg_bags: parseFloat((totalKgForItem / 50).toFixed(2)),
          sub_total: qty * price
        };
      });

      const paid = parseFloat(cleanToEnglishNumber(paidAmount)) || 0;
      const transport = parseFloat(cleanToEnglishNumber(transportCost)) || 0;
      const firstSubCat = selectedSubCategoryItems[0].subCategory;

      const { error } = await supabase
        .from('entries')
        .insert([
          {
            user_id: user?.id,
            entry_date: formattedDate,
            category_id: parseId(selectedCategory.id),
            subcategory_id: parseId(firstSubCat.id),
            total_bag: totalBags,
            bag_weight: parseFloat(cleanToEnglishNumber(firstSubCat.weight)) || 0,
            bag_price: parseFloat(cleanToEnglishNumber(firstSubCat.price)) || 0,
            total_kg: calculatedKg,
            total_price: totalPrice,
            transport_cost: transport,
            grand_total: grandTotal,
            paid_amount: paid,
            due_amount: dueAmount,
            items_json: itemsSummary,
            note: note.trim() || null
          }
        ]);

      if (error) throw error;

      Toast.show({
        type: 'success',
        text1: 'সফল',
        text2: 'হিসাব সফলভাবে সংরক্ষণ করা হয়েছে!'
      });

      setSelectedCategory(null);
      setSelectedSubCategoryItems([]);
      setTransportCost('');
      setPaidAmount('');
      setNote('');
      setDate(new Date());

    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'ডাটাবেস সংযোগ ত্রুটি',
        text2: error.message
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaProvider>
        <SafeAreaView className="flex-1 bg-slate-50 justify-center items-center">
          <ActivityIndicator size="large" color="#059669" />
          <Text className="text-emerald-700 mt-4 font-semibold text-sm">কনফিগারেশন লোড হচ্ছে...</Text>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView className="flex-1 bg-slate-50">
        <KeyboardAwareScrollView 
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 200 }}
          className="px-4 py-5"
          enableOnAndroid={true}
          extraScrollHeight={30}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={() => fetchInitialData(true)} 
              tintColor="#059669"
              colors={['#059669']}
            />
          }
        >
          <View className="mb-5 px-1">
            <Text className="text-xl font-black text-slate-900 tracking-tight">নতুন খাদ্য হিসাব এন্ট্রি</Text>
            <Text className="text-xs text-slate-500 mt-1 font-medium leading-4">
              দৈনিক গবাদি পশুর খাদ্য ব্যবহার এবং ব্যয়ের হিসাব যুক্ত করুন।
            </Text>
          </View>

          <View className="mb-4">
            <Text className="text-slate-700 font-bold mb-1.5 text-xs uppercase tracking-wider">তারিখ</Text>
            <TouchableOpacity 
              onPress={() => setShowDatePicker(true)}
              className="flex-row justify-between items-center bg-white border border-slate-200 rounded-xl p-3.5 min-h-[48px]"
              activeOpacity={0.7}
            >
              <Text className="text-slate-800 text-sm font-semibold flex-1 pr-2">
                {date.toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>
              <Text className="text-emerald-600 text-sm">📅</Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display="default"
                onValueChange={onDateValueChange}      
              />
            )}
          </View>

          <View className="mb-4">
            <Text className="text-slate-700 font-bold mb-1.5 text-xs uppercase tracking-wider">মূল ক্যাটাগরি</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
              {categories.map((c) => {
                const isSelected = selectedCategory?.id === c.id;
                return (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => handleCategorySelect(c)}
                    className={`px-3.5 py-2.5 rounded-xl border ${isSelected ? 'bg-emerald-600 border-emerald-600' : 'bg-white border-slate-200'}`}
                  >
                    <Text className={`font-semibold text-sm ${isSelected ? 'text-white' : 'text-slate-700'}`}>
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <MultiSelect 
            label="সাবক্যাটাগরি (খাদ্যের নাম)" 
            placeholder={selectedCategory ? "এক বা একাধিক খাদ্যের ধরন বেছে নিন" : "প্রথমে মূল ক্যাটাগরি নির্বাচন করুন"}
            selectedItems={selectedSubCategoryItems.map(item => item.subCategory)}
            options={filteredSubCategories}
            getLabel={(sc) => `${sc.name} (${sc.weight} কেজি - ৳${sc.price})`}
            onToggleSelect={handleToggleSubCategory}
            disabled={!selectedCategory}
          />

          {selectedSubCategoryItems.length > 0 && (
            <View className="mb-4 bg-white border border-slate-200 rounded-2xl p-3.5 gap-3">
              <Text className="text-slate-800 font-bold text-xs uppercase">পরিমাণ প্রদান করুন</Text>
              {selectedSubCategoryItems.map((item) => (
                <View key={item.subCategory.id} className="flex-row items-center justify-between border-b border-slate-100 pb-3">
                  <View className="flex-1 pr-2">
                    <Text className="text-slate-900 font-bold text-sm leading-5">{item.subCategory.name}</Text>
                    <Text className="text-slate-400 text-[11px] font-semibold mt-0.5">
                      {item.subCategory.weight} কেজি/ইউনিট • ৳{item.subCategory.price}
                    </Text>
                  </View>
                  <View className="w-24">
                    <TextInput
                      keyboardType="numeric"
                      placeholder="পরিমাণ"
                      placeholderTextColor="#94a3b8"
                      value={item.bags}
                      onChangeText={(text) => handleBagChange(item.subCategory.id, text)}
                      className="bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-2.5 py-2 text-slate-800 text-sm font-semibold text-center"
                    />
                  </View>
                </View>
              ))}
            </View>
          )}

          <View className="flex-row gap-3 mb-4">
            <View className="flex-1">
              <Text className="text-slate-700 font-bold mb-1.5 text-xs uppercase tracking-wider" numberOfLines={1}>
                পরিবহন খরচ (৳)
              </Text>
              <TextInput
                keyboardType="numeric"
                placeholder="০.০০"
                placeholderTextColor="#94a3b8"
                value={transportCost}
                onChangeText={(text) => setTransportCost(cleanToEnglishNumber(text))}
                className="bg-white border border-slate-200 focus:border-emerald-500 rounded-xl p-3 text-slate-800 text-sm font-semibold"
              />
            </View>
            <View className="flex-1">
              <Text className="text-slate-700 font-bold mb-1.5 text-xs uppercase tracking-wider" numberOfLines={1}>
                পরিশোধিত টাকা (৳)
              </Text>
              <TextInput
                keyboardType="numeric"
                placeholder="০.০০"
                placeholderTextColor="#94a3b8"
                value={paidAmount}
                onChangeText={(text) => setPaidAmount(cleanToEnglishNumber(text))}
                className="bg-white border border-slate-200 focus:border-emerald-500 rounded-xl p-3 text-slate-800 text-sm font-semibold"
              />
            </View>
          </View>

          <View className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-4 mb-4 gap-2.5">
            <View className="flex-row justify-between items-center pb-2 border-b border-emerald-100/50">
              <Text className="text-slate-500 font-bold text-[11px] uppercase flex-1 pr-2">৫০ কেজি স্ট্যান্ডার্ড বস্তা</Text>
              <Text className="text-slate-900 font-bold text-base">{totalBags} বস্তা</Text>
            </View>
            <View className="flex-row justify-between items-center pb-2 border-b border-emerald-100/50">
              <Text className="text-slate-500 font-bold text-[11px] uppercase flex-1 pr-2">মোট গণনা করা ওজন</Text>
              <Text className="text-emerald-950 font-black text-base">
                {calculatedKg >= 1000 ? `${parseFloat((calculatedKg / 1000).toFixed(3))} টন` : `${calculatedKg} কেজি`}
              </Text>
            </View>
            <View className="flex-row justify-between items-center pb-2 border-b border-emerald-100/50">
              <Text className="text-slate-500 font-bold text-[11px] uppercase flex-1 pr-2">খাদ্যের উপমোট মূল্য</Text>
              <Text className="text-slate-900 font-bold text-base">৳ {formatNumber(totalPrice)}</Text>
            </View>
            <View className="flex-row justify-between items-center pb-2 border-b border-emerald-100/50">
              <Text className="text-slate-500 font-bold text-[11px] uppercase flex-1 pr-2">সর্বমোট খরচ</Text>
              <Text className="text-emerald-950 font-black text-lg">৳ {formatNumber(grandTotal)}</Text>
            </View>
            <View className="flex-row justify-between items-center pb-2 border-b border-emerald-100/50">
              <Text className="text-slate-500 font-bold text-[11px] uppercase flex-1 pr-2">পরিশোধিত পরিমাণ</Text>
              <Text className="text-emerald-700 font-bold text-base">৳ {formatNumber(parseFloat(paidAmount) || 0)}</Text>
            </View>
            
            <View className="flex-row justify-between items-center pt-1">
              <Text className={`${dueAmount < 0 ? 'text-blue-800' : 'text-rose-800'} font-bold text-xs uppercase flex-1 pr-2`}>
                {dueAmount < 0 ? 'অগ্রিম জমা' : 'বাকি বকেয়া'}
              </Text>
              <Text className={`${dueAmount < 0 ? 'text-blue-600' : 'text-rose-600'} font-black text-xl`}>
                {dueAmount < 0 ? `+ ৳ ${formatNumber(dueAmount)}` : `৳ ${formatNumber(dueAmount)}`}
              </Text>
            </View>
          </View>

          <View className="mb-5">
            <Text className="text-slate-700 font-bold mb-1.5 text-xs uppercase tracking-wider">মন্তব্য (ঐচ্ছিক)</Text>
            <TextInput
              multiline
              numberOfLines={3}
              placeholder="অতিরিক্ত তথ্য বা বিবরণ এখানে লিখুন..."
              placeholderTextColor="#94a3b8"
              value={note}
              onChangeText={setNote}
              className="bg-white border border-slate-200 focus:border-emerald-500 rounded-xl p-3.5 text-slate-800 text-sm min-h-[80px]"
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity 
            onPress={handleSave}
            disabled={submitting}
            className="bg-emerald-600 h-12 rounded-xl items-center justify-center shadow-lg shadow-emerald-200 active:bg-emerald-700"
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text className="text-white font-black text-sm tracking-wide uppercase">সংরক্ষণ করুন</Text>
            )}
          </TouchableOpacity>

        </KeyboardAwareScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}