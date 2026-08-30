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

export default function EditEntryScreen() {
  const router = useRouter();
  const { entry: entryParam } = useLocalSearchParams();
  const entry = entryParam ? JSON.parse(entryParam as string) : null;

  const [loading, setLoading] = useState(false);
  
  const initialItems: FeedItemJSON[] = entry && Array.isArray(entry.items_json) && entry.items_json.length > 0
    ? entry.items_json
    : [];

  const [feedItems, setFeedItems] = useState<FeedItemJSON[]>(initialItems);
  const [totalBagsInput, setTotalBagsInput] = useState(entry ? (entry.total_bag || 0).toString() : '');
  const [transportCost, setTransportCost] = useState(entry ? (entry.transport_cost || 0).toString() : '');
  const [paidAmount, setPaidAmount] = useState(entry ? (entry.paid_amount || 0).toString() : '');
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
        const qty = item.input_quantity || 0;
        const weight = item.unit_weight_kg || 0;
        const price = item.price_per_unit || 0;

        const totalKgForItem = qty * weight;
        bagsSum += totalKgForItem / 50;
        kgSum += totalKgForItem;
        priceSum += qty * price;
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
    } else {
      const bags = parseFloat(totalBagsInput) || 0;
      const weight = parseFloat(entry.bag_weight) || 0;
      const price = parseFloat(entry.bag_price) || 0;
      const transport = parseFloat(transportCost) || 0;
      const paid = parseFloat(paidAmount) || 0;

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
    const qty = parseFloat(text) || 0;
    setFeedItems(prev =>
      prev.map(item => {
        if (item.subcategory_id === subCatId) {
          const totalKg = qty * item.unit_weight_kg;
          return {
            ...item,
            input_quantity: qty,
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
      const hasInvalid = feedItems.some(item => item.input_quantity <= 0);
      if (hasInvalid) {
        Alert.alert('Error', 'Please enter valid quantities for all items.');
        return;
      }
    } else if (!totalBagsInput.trim() || isNaN(Number(totalBagsInput)) || Number(totalBagsInput) <= 0) {
      Alert.alert('Error', 'Please enter a valid bag count.');
      return;
    }

    setLoading(true);

    const transport = parseFloat(transportCost) || 0;
    const paid = parseFloat(paidAmount) || 0;

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

    if (feedItems.length > 0) {
      updatedPayload.items_json = feedItems;
    }

    const { error } = await supabase
      .from('entries')
      .update(updatedPayload)
      .eq('id', entry.id);

    setLoading(false);

    if (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message
      });
    } else {
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Entry updated successfully!'
      });
      router.back();
    }
  };

  if (!entry) return null;

  return (
    <SafeAreaProvider>
      <SafeAreaView className="flex-1 bg-slate-50">
        <KeyboardAwareScrollView 
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          enableOnAndroid={true}
          extraScrollHeight={30}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="mb-6">
            <Text className="text-2xl font-black text-slate-900">Edit Entry</Text>
            <Text className="text-sm text-slate-500 mt-1">Updating: {entry.category_name}</Text>
          </View>

          {feedItems.length > 0 ? (
            <View className="mb-5 bg-white border border-slate-200 rounded-2xl p-4 gap-3">
              <Text className="text-slate-800 font-bold text-xs uppercase tracking-wider">Feed Item Quantities</Text>
              {feedItems.map((item) => (
                <View key={item.subcategory_id} className="flex-row items-center justify-between border-b border-slate-100 pb-3">
                  <View className="flex-1 pr-2">
                    <Text className="text-slate-900 font-bold text-base">{item.name}</Text>
                    <Text className="text-slate-400 text-xs font-semibold">
                      {item.unit_weight_kg} kg/unit • ৳{item.price_per_unit}
                    </Text>
                  </View>
                  <View className="w-28">
                    <TextInput
                      keyboardType="numeric"
                      placeholder="Qty"
                      placeholderTextColor="#94a3b8"
                      value={item.input_quantity.toString()}
                      onChangeText={(text) => handleItemQtyChange(item.subcategory_id, text)}
                      className="bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-3 py-2 text-slate-800 text-base font-semibold text-center"
                    />
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View className="mb-4">
              <Text className="text-slate-700 font-bold mb-1.5 text-xs uppercase tracking-wider">Total Bags</Text>
              <TextInput
                className="bg-white border border-slate-200 rounded-xl p-3.5 text-base font-semibold text-slate-800"
                keyboardType="numeric"
                value={totalBagsInput}
                onChangeText={setTotalBagsInput}
              />
            </View>
          )}

          <View className="flex-row gap-4 mb-4">
            <View className="flex-1">
              <Text className="text-slate-700 font-bold mb-1.5 text-xs uppercase tracking-wider">Transport (৳)</Text>
              <TextInput
                className="bg-white border border-slate-200 rounded-xl p-3.5 text-base font-semibold text-slate-800"
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor="#94a3b8"
                value={transportCost}
                onChangeText={setTransportCost}
              />
            </View>
            <View className="flex-1">
              <Text className="text-slate-700 font-bold mb-1.5 text-xs uppercase tracking-wider">Paid Amount (৳)</Text>
              <TextInput
                className="bg-white border border-slate-200 rounded-xl p-3.5 text-base font-semibold text-slate-800"
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor="#94a3b8"
                value={paidAmount}
                onChangeText={setPaidAmount}
              />
            </View>
          </View>

          <View className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-5 mb-5 gap-3">
            <View className="flex-row justify-between items-center pb-2 border-b border-emerald-100/50">
              <Text className="text-slate-500 font-bold text-xs uppercase">50KG Standard Bags</Text>
              <Text className="text-slate-900 font-bold text-lg">{totalBags} Bags</Text>
            </View>
            <View className="flex-row justify-between items-center pb-2 border-b border-emerald-100/50">
              <Text className="text-slate-500 font-bold text-xs uppercase">Calculated Weight</Text>
              <Text className="text-emerald-950 font-black text-lg">
                {calculatedKg >= 1000 ? `${(calculatedKg / 1000).toFixed(2)} Ton` : `${calculatedKg.toFixed(2)} kg`}
              </Text>
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
            <Text className="text-slate-700 font-bold mb-1.5 text-xs uppercase tracking-wider">Notes (Optional)</Text>
            <TextInput
              className="bg-white border border-slate-200 rounded-xl p-4 text-base text-slate-800 min-h-[90px]"
              placeholder="Write details..."
              placeholderTextColor="#94a3b8"
              value={note}
              onChangeText={setNote}
              multiline
              textAlignVertical="top"
            />
          </View>

          <View className="flex-row gap-3">
            <TouchableOpacity 
              onPress={() => router.back()} 
              className="flex-1 bg-slate-200 h-12 rounded-xl items-center justify-center"
              activeOpacity={0.8}
            >
              <Text className="text-slate-700 font-bold">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleUpdate} 
              disabled={loading} 
              className="flex-1 bg-emerald-600 h-12 rounded-xl items-center justify-center shadow-lg shadow-emerald-200 active:bg-emerald-700"
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text className="text-white font-bold uppercase tracking-wide">Update Entry</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAwareScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}