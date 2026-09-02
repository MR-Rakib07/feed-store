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
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#333', marginBottom: 6, textTransform: 'uppercase' }}>{label}</Text>
      <TouchableOpacity 
        onPress={() => {
          if (!disabled) setIsOpen(!isOpen);
        }} 
        disabled={disabled}
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#fff',
          borderWidth: 1,
          borderColor: isOpen ? '#059669' : '#cbd5e1',
          borderRadius: 10,
          padding: 12,
          minHeight: 48,
          opacity: disabled ? 0.6 : 1
        }}
        activeOpacity={0.7}
      >
        <Text style={{ fontSize: 14, fontWeight: '500', flex: 1, color: selectedItems.length > 0 ? '#0f172a' : '#94a3b8' }} numberOfLines={1}>
          {selectedItems.length > 0 
            ? `${selectedItems.length} টি সাবক্যাটাগরি নির্বাচিত` 
            : placeholder}
        </Text>
        <Text style={{ color: '#059669', fontWeight: 'bold', fontSize: 12 }}>{isOpen ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      
      {isOpen && options.length > 0 && (
        <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#a7f3d0', borderRadius: 10, marginTop: 6, overflow: 'hidden', elevation: 3 }}>
          <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 200 }} keyboardShouldPersistTaps="handled">
            {options.map((opt: T, index: number) => {
              const selected = isSelected(opt);
              const isLast = index === options.length - 1;
              return (
                <TouchableOpacity 
                  key={opt.id} 
                  style={{
                    padding: 12,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: selected ? '#ecfdf5' : '#fff',
                    borderBottomWidth: isLast ? 0 : 1,
                    borderBottomColor: '#f1f5f9'
                  }}
                  onPress={() => onToggleSelect(opt)}
                >
                  <Text style={{ fontSize: 14, fontWeight: selected ? 'bold' : '500', flex: 1, color: selected ? '#065f46' : '#334155' }} numberOfLines={1}>
                    {getLabel(opt)}
                  </Text>
                  <Text style={{ color: '#059669', fontWeight: 'bold', fontSize: 14 }}>
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
        <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' }}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={{ color: '#047857', marginTop: 12, fontWeight: '600', fontSize: 14 }}>কনফিগারেশন লোড হচ্ছে...</Text>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
        <KeyboardAwareScrollView 
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 150 }}
          style={{ paddingHorizontal: 16, paddingTop: 16 }}
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
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 22, fontWeight: '900', color: '#0f172a', letterSpacing: -0.5 }}>নতুন খাদ্য হিসাব এন্ট্রি</Text>
            <Text style={{ fontSize: 13, color: '#64748b', marginTop: 4, fontWeight: '500', lineHeight: 18 }}>
              দৈনিক গবাদি পশুর খাদ্য ব্যবহার এবং ব্যয়ের হিসাব যুক্ত করুন।
            </Text>
          </View>

          <View style={{ marginBottom: 16 }}>
            <Text style={{ color: '#334155', fontWeight: 'bold', marginBottom: 6, fontSize: 12, textTransform: 'uppercase' }}>তারিখ</Text>
            <TouchableOpacity 
              onPress={() => setShowDatePicker(true)}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#fff',
                borderWidth: 1,
                borderColor: '#cbd5e1',
                borderRadius: 10,
                padding: 12,
                minHeight: 48
              }}
              activeOpacity={0.7}
            >
              <Text style={{ color: '#1e293b', fontSize: 14, fontWeight: '600', flex: 1, paddingRight: 8 }}>
                {date.toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>
              <Text style={{ fontSize: 16 }}>📅</Text>
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

          <View style={{ marginBottom: 16 }}>
            <Text style={{ color: '#334155', fontWeight: 'bold', marginBottom: 6, fontSize: 12, textTransform: 'uppercase' }}>মূল ক্যাটাগরি</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', gap: 8 }}>
              {categories.map((c) => {
                const isSelected = selectedCategory?.id === c.id;
                return (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => handleCategorySelect(c)}
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 14,
                      borderRadius: 10,
                      borderWidth: 1,
                      backgroundColor: isSelected ? '#059669' : '#fff',
                      borderColor: isSelected ? '#059669' : '#cbd5e1'
                    }}
                  >
                    <Text style={{ fontWeight: '600', fontSize: 13, color: isSelected ? '#fff' : '#334155' }}>
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
            <View style={{ marginBottom: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 14 }}>
              <Text style={{ color: '#1e293b', fontWeight: 'bold', fontSize: 12, textTransform: 'uppercase', marginBottom: 10 }}>পরিমাণ প্রদান করুন</Text>
              {selectedSubCategoryItems.map((item) => (
                <View key={item.subCategory.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 10, marginBottom: 10 }}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={{ color: '#0f172a', fontWeight: 'bold', fontSize: 14, lineHeight: 20 }}>{item.subCategory.name}</Text>
                    <Text style={{ color: '#64748b', fontSize: 11, fontWeight: '600', marginTop: 2 }}>
                      {item.subCategory.weight} কেজি/ইউনিট • ৳{item.subCategory.price}
                    </Text>
                  </View>
                  <View style={{ width: 90 }}>
                    <TextInput
                      keyboardType="numeric"
                      placeholder="পরিমাণ"
                      placeholderTextColor="#94a3b8"
                      value={item.bags}
                      onChangeText={(text) => handleBagChange(item.subCategory.id, text)}
                      style={{
                        backgroundColor: '#f8fafc',
                        borderWidth: 1,
                        borderColor: '#cbd5e1',
                        borderRadius: 8,
                        paddingVertical: 6,
                        paddingHorizontal: 8,
                        color: '#1e293b',
                        fontSize: 14,
                        fontWeight: '600',
                        textAlign: 'center'
                      }}
                    />
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#334155', fontWeight: 'bold', marginBottom: 6, fontSize: 12, textTransform: 'uppercase' }} numberOfLines={1}>
                পরিবহন খরচ (৳)
              </Text>
              <TextInput
                keyboardType="numeric"
                placeholder="০.০০"
                placeholderTextColor="#94a3b8"
                value={transportCost}
                onChangeText={(text) => setTransportCost(cleanToEnglishNumber(text))}
                style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 12, color: '#1e293b', fontSize: 14, fontWeight: '600' }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#334155', fontWeight: 'bold', marginBottom: 6, fontSize: 12, textTransform: 'uppercase' }} numberOfLines={1}>
                পরিশোধিত টাকা (৳)
              </Text>
              <TextInput
                keyboardType="numeric"
                placeholder="০.০০"
                placeholderTextColor="#94a3b8"
                value={paidAmount}
                onChangeText={(text) => setPaidAmount(cleanToEnglishNumber(text))}
                style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 12, color: '#1e293b', fontSize: 14, fontWeight: '600' }}
              />
            </View>
          </View>

          <View style={{ backgroundColor: '#ecfdf5', borderWidth: 1, borderColor: '#a7f3d0', borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#d1fae5' }}>
              <Text style={{ color: '#047857', fontWeight: 'bold', fontSize: 11, textTransform: 'uppercase', flex: 1, paddingRight: 8 }}>৫০ কেজি স্ট্যান্ডার্ড বস্তা</Text>
              <Text style={{ color: '#065f46', fontWeight: 'bold', fontSize: 15 }}>{totalBags} বস্তা</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#d1fae5' }}>
              <Text style={{ color: '#047857', fontWeight: 'bold', fontSize: 11, textTransform: 'uppercase', flex: 1, paddingRight: 8 }}>মোট গণনা করা ওজন</Text>
              <Text style={{ color: '#065f46', fontWeight: '900', fontSize: 15 }}>
                {calculatedKg >= 1000 ? `${parseFloat((calculatedKg / 1000).toFixed(3))} টন` : `${calculatedKg} কেজি`}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#d1fae5' }}>
              <Text style={{ color: '#047857', fontWeight: 'bold', fontSize: 11, textTransform: 'uppercase', flex: 1, paddingRight: 8 }}>খাদ্যের উপমোট মূল্য</Text>
              <Text style={{ color: '#065f46', fontWeight: 'bold', fontSize: 15 }}>৳ {formatNumber(totalPrice)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#d1fae5' }}>
              <Text style={{ color: '#047857', fontWeight: 'bold', fontSize: 11, textTransform: 'uppercase', flex: 1, paddingRight: 8 }}>সর্বমোট খরচ</Text>
              <Text style={{ color: '#065f46', fontWeight: '900', fontSize: 16 }}>৳ {formatNumber(grandTotal)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#d1fae5' }}>
              <Text style={{ color: '#047857', fontWeight: 'bold', fontSize: 11, textTransform: 'uppercase', flex: 1, paddingRight: 8 }}>পরিশোধিত পরিমাণ</Text>
              <Text style={{ color: '#047857', fontWeight: 'bold', fontSize: 15 }}>৳ {formatNumber(parseFloat(paidAmount) || 0)}</Text>
            </View>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8 }}>
              <Text style={{ color: dueAmount < 0 ? '#1e40af' : '#9f1239', fontWeight: 'bold', fontSize: 12, textTransform: 'uppercase', flex: 1, paddingRight: 8 }}>
                {dueAmount < 0 ? 'অগ্রিম জমা' : 'বাকি বকেয়া'}
              </Text>
              <Text style={{ color: dueAmount < 0 ? '#2563eb' : '#e11d48', fontWeight: '900', fontSize: 18 }}>
                {dueAmount < 0 ? `+ ৳ ${formatNumber(dueAmount)}` : `৳ ${formatNumber(dueAmount)}`}
              </Text>
            </View>
          </View>

          <View style={{ marginBottom: 20 }}>
            <Text style={{ color: '#334155', fontWeight: 'bold', marginBottom: 6, fontSize: 12, textTransform: 'uppercase' }}>মন্তব্য (ঐচ্ছিক)</Text>
            <TextInput
              multiline
              numberOfLines={3}
              placeholder="অতিরিক্ত তথ্য বা বিবরণ এখানে লিখুন..."
              placeholderTextColor="#94a3b8"
              value={note}
              onChangeText={setNote}
              style={{
                backgroundColor: '#fff',
                borderWidth: 1,
                borderColor: '#cbd5e1',
                borderRadius: 10,
                padding: 12,
                color: '#1e293b',
                fontSize: 14,
                minHeight: 80,
                textAlignVertical: 'top'
              }}
            />
          </View>

          <TouchableOpacity 
            onPress={handleSave}
            disabled={submitting}
            style={{
              backgroundColor: '#059669',
              height: 50,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              elevation: 2
            }}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={{ color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 0.5, textTransform: 'uppercase' }}>সংরক্ষণ করুন</Text>
            )}
          </TouchableOpacity>

        </KeyboardAwareScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}