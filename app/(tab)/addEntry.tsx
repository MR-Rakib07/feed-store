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
      <Text className="text-slate-700 font-bold mb-1.5 text-[14px] uppercase tracking-wider">{label}</Text>
      <TouchableOpacity 
        onPress={() => {
          if (!disabled) setIsOpen(!isOpen);
        }} 
        disabled={disabled}
        className={`flex-row justify-between items-center bg-white border ${isOpen ? 'border-emerald-500' : 'border-slate-200'} rounded-xl p-3.5 ${disabled ? 'bg-slate-100 opacity-60' : ''}`}
        activeOpacity={0.7}
      >
        <Text className={`text-base font-medium ${selectedItems.length > 0 ? 'text-slate-900' : 'text-slate-400'}`}>
          {selectedItems.length > 0 
            ? `${selectedItems.length} Subcategory selected` 
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
                  className={`p-4 flex-row justify-between items-center ${selected ? 'bg-emerald-50' : ''} ${isLast ? '' : 'border-b border-slate-50'}`}
                  onPress={() => onToggleSelect(opt)}
                >
                  <Text className={`text-base font-medium ${selected ? 'text-emerald-800 font-bold' : 'text-slate-700'}`}>
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
      const quantity = parseFloat(item.bags) || 0;
      const weight = parseFloat(item.subCategory.weight) || 0;
      const price = parseFloat(item.subCategory.price) || 0;

      const totalKgForItem = quantity * weight;
      
      // ৫০ কেজি = ১ বস্তা (কম হলে যেমন ২৫ কেজিতে ০.৫ বস্তা)
      const bagEquivalent = totalKgForItem / 50;

      bagsSum += bagEquivalent;
      kgSum += totalKgForItem;
      priceSum += quantity * price;
    });

    const transport = parseFloat(transportCost) || 0;
    const paid = parseFloat(paidAmount) || 0;
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
        text1: 'Database Fetch Error',
        text2: error.message 
      });
      Alert.alert('Database Fetch Error', error.message || 'Could not fetch records.');
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
    setSelectedSubCategoryItems(prev =>
      prev.map(item =>
        item.subCategory.id === subCatId ? { ...item, bags: text } : item
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
        text1: 'Validation Error',
        text2: 'Please select a main category.'
      });
      return;
    }
    if (selectedSubCategoryItems.length === 0) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please select at least one subcategory feed model.'
      });
      return;
    }

    const hasInvalidBag = selectedSubCategoryItems.some(
      item => !item.bags.trim() || isNaN(Number(item.bags)) || Number(item.bags) <= 0
    );

    if (hasInvalidBag) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please enter valid quantities for all selected feeds.'
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
        const qty = parseFloat(item.bags);
        const weight = parseFloat(item.subCategory.weight);
        const totalKgForItem = qty * weight;
        
        return {
          subcategory_id: parseId(item.subCategory.id),
          name: item.subCategory.name,
          input_quantity: qty,
          unit_weight_kg: weight,
          price_per_unit: parseFloat(item.subCategory.price),
          total_kg: totalKgForItem,
          standard_50kg_bags: parseFloat((totalKgForItem / 50).toFixed(2)),
          sub_total: qty * parseFloat(item.subCategory.price)
        };
      });

      const paid = parseFloat(paidAmount) || 0;
      const transport = parseFloat(transportCost) || 0;
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
            bag_weight: parseFloat(firstSubCat.weight) || 0,
            bag_price: parseFloat(firstSubCat.price) || 0,
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
        text1: 'Success',
        text2: 'Entry saved successfully!'
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
        text1: 'Database Connection Error',
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
          <Text className="text-emerald-700 mt-4 font-semibold text-base">Loading configuration...</Text>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView className="flex-1 bg-slate-50">
        <KeyboardAwareScrollView 
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 200 }}
          className="px-5 py-6"
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
          <View className="mb-6 px-1">
            <Text className="text-2xl font-black text-slate-900 tracking-tight">New Feed Entry</Text>
            <Text className="text-sm text-slate-500 mt-1 font-medium">
              Record daily livestock feed usage logs and expense summaries.
            </Text>
          </View>

          <View className="mb-4">
            <Text className="text-slate-700 font-bold mb-1.5 text-[14px] uppercase tracking-wider">Date</Text>
            <TouchableOpacity 
              onPress={() => setShowDatePicker(true)}
              className="flex-row justify-between items-center bg-white border border-slate-200 rounded-xl p-3.5"
              activeOpacity={0.7}
            >
              <Text className="text-slate-800 text-base font-semibold">
                {date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>
              <Text className="text-emerald-600 text-base">📅</Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display="default"
                maximumDate={new Date()} 
                onChange={onDateValueChange}      
              />
            )}
          </View>

          <View className="mb-4">
            <Text className="text-slate-700 font-bold mb-1.5 text-[14px] uppercase tracking-wider">Main Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
              {categories.map((c) => {
                const isSelected = selectedCategory?.id === c.id;
                return (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => handleCategorySelect(c)}
                    className={`px-4 py-3 rounded-xl border ${isSelected ? 'bg-emerald-600 border-emerald-600' : 'bg-white border-slate-200'}`}
                  >
                    <Text className={`font-semibold text-base ${isSelected ? 'text-white' : 'text-slate-700'}`}>
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <MultiSelect 
            label="Subcategories (Feed Names)" 
            placeholder={selectedCategory ? "Choose 1 or more feed models" : "Select main category first"}
            selectedItems={selectedSubCategoryItems.map(item => item.subCategory)}
            options={filteredSubCategories}
            getLabel={(sc) => `${sc.name} (${sc.weight} kg - ৳${sc.price})`}
            onToggleSelect={handleToggleSubCategory}
            disabled={!selectedCategory}
          />

          {selectedSubCategoryItems.length > 0 && (
            <View className="mb-5 bg-white border border-slate-200 rounded-2xl p-4 gap-3">
              <Text className="text-slate-800 font-bold text-sm uppercase">Enter Quantities</Text>
              {selectedSubCategoryItems.map((item) => (
                <View key={item.subCategory.id} className="flex-row items-center justify-between border-b border-slate-100 pb-3">
                  <View className="flex-1 pr-2">
                    <Text className="text-slate-900 font-bold text-base">{item.subCategory.name}</Text>
                    <Text className="text-slate-400 text-xs font-semibold">
                      {item.subCategory.weight} kg/unit • ৳{item.subCategory.price}
                    </Text>
                  </View>
                  <View className="w-28">
                    <TextInput
                      keyboardType="numeric"
                      placeholder="Qty"
                      placeholderTextColor="#94a3b8"
                      value={item.bags}
                      onChangeText={(text) => handleBagChange(item.subCategory.id, text)}
                      className="bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-3 py-2 text-slate-800 text-base font-semibold text-center"
                    />
                  </View>
                </View>
              ))}
            </View>
          )}

          <View className="flex-row gap-4 mb-4">
            <View className="flex-1">
              <Text className="text-slate-700 font-bold mb-1.5 text-[14px] uppercase tracking-wider">Transport (৳)</Text>
              <TextInput
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor="#94a3b8"
                value={transportCost}
                onChangeText={setTransportCost}
                className="bg-white border border-slate-200 focus:border-emerald-500 rounded-xl p-3.5 text-slate-800 text-base font-semibold"
              />
            </View>
            <View className="flex-1">
              <Text className="text-slate-700 font-bold mb-1.5 text-[14px] uppercase tracking-wider">Paid Amount (৳)</Text>
              <TextInput
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor="#94a3b8"
                value={paidAmount}
                onChangeText={setPaidAmount}
                className="bg-white border border-slate-200 focus:border-emerald-500 rounded-xl p-3.5 text-slate-800 text-base font-semibold"
              />
            </View>
          </View>

          <View className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-5 mb-5 gap-3">
            <View className="flex-row justify-between items-center pb-2 border-b border-emerald-100/50">
              <Text className="text-slate-500 font-bold text-xs uppercase">50KG Standard Bags</Text>
              <Text className="text-slate-900 font-bold text-lg">{totalBags} Bags</Text>
            </View>
            <View className="flex-row justify-between items-center pb-2 border-b border-emerald-100/50">
              <Text className="text-slate-500 font-bold text-xs uppercase">Calculated Weight (Total KG)</Text>
              <Text className="text-emerald-950 font-black text-lg">{calculatedKg >= 1000 ? `${parseFloat((calculatedKg / 1000).toFixed(3))} Ton` : `${calculatedKg} kg`}</Text>
            </View>
            <View className="flex-row justify-between items-center pb-2 border-b border-emerald-100/50">
              <Text className="text-slate-500 font-bold text-xs uppercase">Feed Sub-Total</Text>
              <Text className="text-slate-900 font-bold text-lg">৳ {formatNumber(totalPrice)}</Text>
            </View>
            <View className="flex-row justify-between items-center pb-2 border-b border-emerald-100/50">
              <Text className="text-slate-500 font-bold text-xs uppercase">Grand Total Cost</Text>
              <Text className="text-emerald-950 font-black text-xl">৳ {formatNumber(grandTotal)}</Text>
            </View>
            <View className="flex-row justify-between items-center pb-2 border-b border-emerald-100/50">
              <Text className="text-slate-500 font-bold text-xs uppercase">Paid Amount</Text>
              <Text className="text-emerald-700 font-bold text-lg">৳ {formatNumber(parseFloat(paidAmount) || 0)}</Text>
            </View>
            
            <View className="flex-row justify-between items-center pt-1">
              <Text className={`${dueAmount < 0 ? 'text-blue-800' : 'text-rose-800'} font-bold text-sm uppercase`}>
                {dueAmount < 0 ? 'Advance Credit (জমা)' : 'Due / Remaining (বাকি)'}
              </Text>
              <Text className={`${dueAmount < 0 ? 'text-blue-600' : 'text-rose-600'} font-black text-2xl`}>
                {dueAmount < 0 ? `+ ৳ ${formatNumber(dueAmount)}` : `৳ ${formatNumber(dueAmount)}`}
              </Text>
            </View>
          </View>

          <View className="mb-6">
            <Text className="text-slate-700 font-bold mb-1.5 text-[14px] uppercase tracking-wider">Notes (Optional)</Text>
            <TextInput
              multiline
              numberOfLines={3}
              placeholder="Write extra details or logs here..."
              placeholderTextColor="#94a3b8"
              value={note}
              onChangeText={setNote}
              className="bg-white border border-slate-200 focus:border-emerald-500 rounded-xl p-4 text-slate-800 text-base min-h-[90px]"
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
              <Text className="text-white font-black text-base tracking-wide uppercase">Save Entry</Text>
            )}
          </TouchableOpacity>

        </KeyboardAwareScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}