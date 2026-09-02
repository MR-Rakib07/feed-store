import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  Alert, ActivityIndicator
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import Toast from 'react-native-toast-message';

interface FeedItemJSON {
  subcategory_id: number;
  name: string;
  input_quantity: number;
  unit_weight_kg: number;
  price_per_unit: number;
  total_kg: number;
  standard_50kg_bags: number;
  sub_total: number;
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

export default function EditEntryScreen() {
  const router = useRouter();
  const { entry: entryParam } = useLocalSearchParams();
  const entry = entryParam ? JSON.parse(entryParam as string) : null;

  const [loading, setLoading] = useState(false);
  
  const initialItems: FeedItemJSON[] = entry && Array.isArray(entry.items_json) && entry.items_json.length > 0
    ? entry.items_json
    : [];

  const [feedItems, setFeedItems] = useState<FeedItemJSON[]>(initialItems);
  const [totalBagsInput, setTotalBagsInput] = useState(entry ? convertBanglaToEnglishNumber(entry.total_bag || 0) : '');
  const [transportCost, setTransportCost] = useState(entry ? convertBanglaToEnglishNumber(entry.transport_cost || 0) : '');
  const [paidAmount, setPaidAmount] = useState(entry ? convertBanglaToEnglishNumber(entry.paid_amount || 0) : '');
  const [note, setNote] = useState(entry ? entry.note || '' : '');

  const [totalBags, setTotalBags] = useState<number>(0);
  const [calculatedKg, setCalculatedKg] = useState<number>(0);
  const [totalPrice, setTotalPrice] = useState<number>(0);
  const [grandTotal, setGrandTotal] = useState<number>(0);
  const [dueAmount, setDueAmount] = useState<number>(0);

  useEffect(() => {
    if (!entry) return;

    if (feedItems.length > 0) {
      let bagsSum = 0;
      let kgSum = 0;
      let priceSum = 0;

      feedItems.forEach(item => {
        const qty = parseFloat(convertBanglaToEnglishNumber(item.input_quantity)) || 0;
        const weight = parseFloat(convertBanglaToEnglishNumber(item.unit_weight_kg)) || 0;
        const price = parseFloat(convertBanglaToEnglishNumber(item.price_per_unit)) || 0;

        const totalKgForItem = qty * weight;
        bagsSum += totalKgForItem / 50;
        kgSum += totalKgForItem;
        priceSum += qty * price;
      });

      const transport = parseFloat(convertBanglaToEnglishNumber(transportCost)) || 0;
      const paid = parseFloat(convertBanglaToEnglishNumber(paidAmount)) || 0;
      const grand = priceSum + transport;
      const due = grand - paid;

      setTotalBags(parseFloat(bagsSum.toFixed(2)));
      setCalculatedKg(kgSum);
      setTotalPrice(priceSum);
      setGrandTotal(grand);
      setDueAmount(due);
    } else {
      const bags = parseFloat(convertBanglaToEnglishNumber(totalBagsInput)) || 0;
      const weight = parseFloat(convertBanglaToEnglishNumber(entry.bag_weight)) || 0;
      const price = parseFloat(convertBanglaToEnglishNumber(entry.bag_price)) || 0;
      const transport = parseFloat(convertBanglaToEnglishNumber(transportCost)) || 0;
      const paid = parseFloat(convertBanglaToEnglishNumber(paidAmount)) || 0;

      const kg = bags * weight;
      const subTotal = bags * price;
      const grand = subTotal + transport;
      const due = grand - paid;

      setTotalBags(bags);
      setCalculatedKg(kg);
      setTotalPrice(subTotal);
      setGrandTotal(grand);
      setDueAmount(due);
    }
  }, [feedItems, totalBagsInput, transportCost, paidAmount, entry]);

  const handleItemQtyChange = (subCatId: number, text: string) => {
    const englishNumber = convertBanglaToEnglishNumber(text);
    const qty = parseFloat(englishNumber) || 0;
    setFeedItems(prev =>
      prev.map(item => {
        if (item.subcategory_id === subCatId) {
          const totalKg = qty * item.unit_weight_kg;
          return {
            ...item,
            input_quantity: englishNumber === '' ? ('' as any) : englishNumber,
            total_kg: totalKg,
            standard_50kg_bags: parseFloat((totalKg / 50).toFixed(2)),
            sub_total: qty * item.price_per_unit
          };
        }
        return item;
      })
    );
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(num));
  };

  const handleUpdate = async () => {
    if (feedItems.length > 0) {
      const hasInvalid = feedItems.some(item => Number(convertBanglaToEnglishNumber(item.input_quantity)) <= 0);
      if (hasInvalid) {
        Alert.alert('ত্রুটি', 'দয়া করে সকল খাদ্যের জন্য সঠিক পরিমাণ লিখুন।');
        return;
      }
    } else if (!totalBagsInput.trim() || isNaN(Number(convertBanglaToEnglishNumber(totalBagsInput))) || Number(convertBanglaToEnglishNumber(totalBagsInput)) <= 0) {
      Alert.alert('ত্রুটি', 'দয়া করে সঠিক বস্তার সংখ্যা লিখুন।');
      return;
    }

    setLoading(true);

    const transport = parseFloat(convertBanglaToEnglishNumber(transportCost)) || 0;
    const paid = parseFloat(convertBanglaToEnglishNumber(paidAmount)) || 0;

    const sanitizedItems = feedItems.map(item => ({
      ...item,
      input_quantity: parseFloat(convertBanglaToEnglishNumber(item.input_quantity)) || 0
    }));

    const updatedPayload: any = {
      total_bag: totalBags,
      total_kg: calculatedKg,
      total_price: totalPrice,
      transport_cost: transport,
      grand_total: grandTotal,
      paid_amount: paid,
      due_amount: dueAmount,
      note: note.trim() || null
    };

    if (sanitizedItems.length > 0) {
      updatedPayload.items_json = sanitizedItems;
    }

    const { error } = await supabase
      .from('entries')
      .update(updatedPayload)
      .eq('id', entry.id);

    setLoading(false);

    if (error) {
      Toast.show({
        type: 'error',
        text1: 'ত্রুটি',
        text2: error.message
      });
    } else {
      Toast.show({
        type: 'success',
        text1: 'সফল',
        text2: 'হিসাব সফলভাবে আপডেট করা হয়েছে!'
      });
      router.back();
    }
  };

  if (!entry) return null;

  return (
    <SafeAreaProvider>
      <SafeAreaView className="flex-1 bg-slate-50">
        <KeyboardAwareScrollView 
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 }}
          enableOnAndroid={true}
          extraScrollHeight={30}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View className="mb-4">
            <Text className="text-xl font-black text-slate-900 leading-6">হিসাব সম্পাদনা করুন</Text>
            <Text className="text-xs text-slate-500 mt-1 font-medium" numberOfLines={1}>
              আপডেট হচ্ছে: {entry.category_name}
            </Text>
          </View>

          {/* Feed Items List */}
          {feedItems.length > 0 ? (
            <View className="bg-white border border-slate-200 rounded-2xl p-3.5 mb-4">
              <Text className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                খাদ্যের পরিমাণসমূহ
              </Text>
              {feedItems.map((item, index) => (
                <View 
                  key={item.subcategory_id} 
                  className={`flex-row items-center justify-between py-2.5 ${
                    index !== feedItems.length - 1 ? 'border-b border-slate-100' : ''
                  }`}
                >
                  <View className="flex-1 pr-2.5">
                    <Text className="text-sm font-bold text-slate-900 leading-5" numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text className="text-[11px] text-slate-400 font-semibold mt-0.5">
                      {item.unit_weight_kg} কেজি/ইউনিট • ৳{item.price_per_unit}
                    </Text>
                  </View>
                  <View className="w-20">
                    <TextInput
                      keyboardType="numeric"
                      placeholder="পরিমাণ"
                      placeholderTextColor="#94a3b8"
                      value={item.input_quantity !== undefined && item.input_quantity !== null ? item.input_quantity.toString() : ''}
                      onChangeText={(text) => handleItemQtyChange(item.subcategory_id, text)}
                      className="bg-slate-50 border border-slate-300 focus:border-emerald-500 rounded-xl h-10 px-1.5 text-center text-sm font-bold text-slate-900"
                    />
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View className="mb-3.5">
              <Text className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                মোট বস্তা
              </Text>
              <TextInput
                className="bg-white border border-slate-300 focus:border-emerald-500 rounded-xl h-11 px-3 text-sm font-semibold text-slate-900"
                keyboardType="numeric"
                value={totalBagsInput}
                onChangeText={(text) => setTotalBagsInput(convertBanglaToEnglishNumber(text))}
              />
            </View>
          )}

          {/* Dual Inputs */}
          <View className="flex-row gap-x-3 mb-3.5">
            <View className="flex-1">
              <Text className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5" numberOfLines={1}>
                পরিবহন খরচ (৳)
              </Text>
              <TextInput
                className="bg-white border border-slate-300 focus:border-emerald-500 rounded-xl h-11 px-3 text-sm font-semibold text-slate-900"
                keyboardType="numeric"
                placeholder="০.০০"
                placeholderTextColor="#94a3b8"
                value={transportCost}
                onChangeText={(text) => setTransportCost(convertBanglaToEnglishNumber(text))}
              />
            </View>
            <View className="flex-1">
              <Text className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5" numberOfLines={1}>
                পরিশোধিত টাকা (৳)
              </Text>
              <TextInput
                className="bg-white border border-slate-300 focus:border-emerald-500 rounded-xl h-11 px-3 text-sm font-semibold text-slate-900"
                keyboardType="numeric"
                placeholder="০.০০"
                placeholderTextColor="#94a3b8"
                value={paidAmount}
                onChangeText={(text) => setPaidAmount(convertBanglaToEnglishNumber(text))}
              />
            </View>
          </View>

          {/* Summary Box */}
          <View className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-3.5 mb-4 gap-y-1.5">
            <View className="flex-row justify-between items-center py-1 border-b border-emerald-100">
              <Text className="text-xs font-semibold text-emerald-900 flex-1 pr-2" numberOfLines={1}>
                ৫০ কেজি স্ট্যান্ডার্ড বস্তা
              </Text>
              <Text className="text-sm font-bold text-slate-900">{totalBags} বস্তা</Text>
            </View>
            <View className="flex-row justify-between items-center py-1 border-b border-emerald-100">
              <Text className="text-xs font-semibold text-emerald-900 flex-1 pr-2" numberOfLines={1}>
                মোট গণনা করা ওজন
              </Text>
              <Text className="text-sm font-black text-emerald-950">
                {calculatedKg >= 1000 ? `${parseFloat((calculatedKg / 1000).toFixed(3))} টন` : `${calculatedKg.toFixed(2)} কেজি`}
              </Text>
            </View>
            <View className="flex-row justify-between items-center py-1 border-b border-emerald-100">
              <Text className="text-xs font-semibold text-emerald-900 flex-1 pr-2" numberOfLines={1}>
                খাদ্যের উপমোট
              </Text>
              <Text className="text-sm font-bold text-slate-900">৳ {formatNumber(totalPrice)}</Text>
            </View>
            <View className="flex-row justify-between items-center py-1 border-b border-emerald-100">
              <Text className="text-xs font-semibold text-emerald-900 flex-1 pr-2" numberOfLines={1}>
                সর্বমোট খরচ
              </Text>
              <Text className="text-base font-black text-emerald-950">৳ {formatNumber(grandTotal)}</Text>
            </View>
            <View className="flex-row justify-between items-center py-1 border-b border-emerald-100">
              <Text className="text-xs font-semibold text-emerald-900 flex-1 pr-2" numberOfLines={1}>
                পরিশোধিত টাকা
              </Text>
              <Text className="text-sm font-bold text-emerald-700">৳ {formatNumber(parseFloat(paidAmount) || 0)}</Text>
            </View>
            <View className="flex-row justify-between items-center pt-2">
              <Text 
                className={`text-xs font-bold uppercase flex-1 pr-2 ${dueAmount < 0 ? 'text-blue-700' : 'text-rose-700'}`} 
                numberOfLines={1}
              >
                {dueAmount < 0 ? 'অগ্রিম জমা' : 'বাকি বকেয়া'}
              </Text>
              <Text className={`text-base font-black ${dueAmount < 0 ? 'text-blue-700' : 'text-rose-700'}`}>
                {dueAmount < 0 ? `+ ৳ ${formatNumber(dueAmount)}` : `৳ ${formatNumber(dueAmount)}`}
              </Text>
            </View>
          </View>

          {/* Note */}
          <View className="mb-4">
            <Text className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              মন্তব্য (ঐচ্ছিক)
            </Text>
            <TextInput
              className="bg-white border border-slate-300 focus:border-emerald-500 rounded-xl p-3 text-sm text-slate-900 min-h-[75px]"
              placeholder="অতিরিক্ত বিবরণ লিখুন..."
              placeholderTextColor="#94a3b8"
              value={note}
              onChangeText={setNote}
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* Action Buttons */}
          <View className="flex-row gap-x-2.5">
            <TouchableOpacity 
              onPress={() => router.back()} 
              className="flex-1 bg-slate-200 h-11 rounded-xl items-center justify-center active:bg-slate-300"
              activeOpacity={0.8}
            >
              <Text className="text-slate-700 font-bold text-sm">বাতিল</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleUpdate} 
              disabled={loading} 
              className="flex-1 bg-emerald-600 h-11 rounded-xl items-center justify-center shadow-md shadow-emerald-200 active:bg-emerald-700"
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text className="text-white font-black text-xs uppercase tracking-wider">হিসাব আপডেট করুন</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAwareScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}