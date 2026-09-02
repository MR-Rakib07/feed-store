import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import Toast from 'react-native-toast-message';

interface DynamicCategoryStat {
  id: string;
  name: string;
  cost: number;
  weight: number;
  bags: number;
  paid: number;
  due: number;
}

interface PaymentItem {
  id: string;
  type: 'due' | 'payment';
  amount: number;
  entry_date: string;
  note: string | null;
}

export default function MonthlyReportScreen() {
  const [entries, setEntries] = useState<any[]>([]);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    try {
      setLoading(true);

      const [entriesRes, paymentsRes] = await Promise.all([
        supabase.from('entries').select('*, categories(id, name)'),
        supabase.from('payments').select('*')
      ]);

      if (entriesRes.error) throw entriesRes.error;
      if (paymentsRes.error) throw paymentsRes.error;

      setEntries(entriesRes.data || []);
      setPayments(paymentsRes.data || []);
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'ত্রুটি',
        text2: error.message
      });
      Alert.alert('ত্রুটি', error.message);
    } finally {
      setLoading(false);
    }
  };

  const changeMonth = (offset: number) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setSelectedDate(newDate);
  };

  const report = useMemo(() => {
    const targetMonth = selectedDate.getMonth();
    const targetYear = selectedDate.getFullYear();

    const stats = {
      totalBags: 0,
      totalWeight: 0,
      totalCost: 0,
      totalTransport: 0,
      totalPaid: 0,
      totalDue: 0,
      directDue: 0,      // সরাসরি বকেয়া
      directPayment: 0,  // সরাসরি জমা
      categoryMap: {} as Record<string, DynamicCategoryStat>
    };

    // ১. খাদ্য ক্রয়ের হিসাব (Entries)
    (Array.isArray(entries) ? entries : []).forEach(item => {
      if (!item?.entry_date) return;
      const entryDate = new Date(item.entry_date);
      if (entryDate.getMonth() === targetMonth && entryDate.getFullYear() === targetYear) {
        const bags = Number(item.total_bag) || 0;
        const weight = Number(item.total_kg) || 0;
        const cost = Number(item.grand_total) || 0;
        const transport = Number(item.transport_cost) || 0;
        const paid = Number(item.paid_amount) || 0;
        const due = Number(item.due_amount) || 0;

        stats.totalBags += bags;
        stats.totalWeight += weight;
        stats.totalCost += cost;
        stats.totalTransport += transport;
        stats.totalPaid += paid;

        const categoryObj = item.categories;
        const catId = categoryObj?.id || 'uncategorized';
        const catName = categoryObj?.name || 'অনির্দিষ্ট';

        if (!stats.categoryMap[catId]) {
          stats.categoryMap[catId] = {
            id: catId,
            name: catName,
            cost: 0,
            weight: 0,
            bags: 0,
            paid: 0,
            due: 0
          };
        }

        stats.categoryMap[catId].cost += cost;
        stats.categoryMap[catId].weight += weight;
        stats.categoryMap[catId].bags += bags;
        stats.categoryMap[catId].paid += paid;
        stats.categoryMap[catId].due += due;
      }
    });

    // ২. সরাসরি জমা ও বকেয়ার হিসাব (Payments)
    (Array.isArray(payments) ? payments : []).forEach(item => {
      if (!item?.entry_date) return;
      const paymentDate = new Date(item.entry_date);
      if (paymentDate.getMonth() === targetMonth && paymentDate.getFullYear() === targetYear) {
        const amount = Number(item.amount) || 0;
        if (item.type === 'due') {
          stats.directDue += amount;
          stats.totalCost += amount; // সরাসরি ধার্য বকেয়া মোট খরচে যোগ
        } else if (item.type === 'payment') {
          stats.directPayment += amount;
          stats.totalPaid += amount; // সরাসরি নগদ জমা মোট পরিশোধে যোগ
        }
      }
    });

    // নিট বাকি বা অগ্রিম
    stats.totalDue = stats.totalCost - stats.totalPaid;

    return stats;
  }, [entries, payments, selectedDate]);

  const formatWeight = (kg: number) => {
    const safeKg = !isNaN(Number(kg)) ? Number(kg) : 0;
    if (safeKg >= 1000) {
      return `${(safeKg / 1000).toFixed(2)} টন`;
    }
    return `${safeKg.toFixed(2)} কেজি`;
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(num || 0));
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-50">
        <ActivityIndicator size="large" color="#059669" />
        <Text className="text-slate-500 font-semibold mt-3 text-sm">মাসিক রিপোর্ট তৈরি হচ্ছে...</Text>
      </View>
    );
  }

  const categoryList = Object.values(report.categoryMap);

  return (
    <ScrollView className="flex-1 bg-slate-50 p-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
      
      {/* Month Picker Header */}
      <View className="flex-row items-center justify-between mb-4 bg-white p-2.5 rounded-2xl shadow-sm border border-slate-200">
        <TouchableOpacity onPress={() => changeMonth(-1)} className="p-2 bg-slate-100 rounded-xl active:bg-slate-200">
          <MaterialCommunityIcons name="chevron-left" size={24} color="#334155" />
        </TouchableOpacity>
        
        <View className="flex-1 items-center px-2">
          <Text className="font-black text-slate-800 text-lg">
            {selectedDate.toLocaleDateString('bn-BD', { month: 'long', year: 'numeric' })}
          </Text>
        </View>
        
        <TouchableOpacity onPress={() => changeMonth(1)} className="p-2 bg-slate-100 rounded-xl active:bg-slate-200">
          <MaterialCommunityIcons name="chevron-right" size={24} color="#334155" />
        </TouchableOpacity>
      </View>

      {/* Main Expense Banner */}
      <View className="bg-emerald-600 rounded-3xl p-5 mb-4 shadow-lg shadow-emerald-200">
        <Text className="text-emerald-100 text-xs uppercase font-extrabold tracking-widest">চলতি মাসের সর্বমোট খরচ ও বকেয়া</Text>
        <Text className="text-white text-3xl font-black mt-1">৳ {formatCurrency(report.totalCost)}</Text>
        
        <View className="flex-row items-center justify-between mt-3 pt-2.5 border-t border-emerald-500/50">
          <Text className="text-emerald-100 text-xs font-semibold">পরিবহন খরচসহ:</Text>
          <Text className="text-white text-sm font-bold">৳ {formatCurrency(report.totalTransport)}</Text>
        </View>
      </View>

      {/* Paid vs Due Cards */}
      <View className="flex-row justify-between mb-4">
        <View className="bg-white p-3.5 rounded-2xl w-[48%] border border-emerald-100 shadow-sm">
          <View className="flex-row items-center mb-1">
            <View className="w-2 h-2 rounded-full bg-emerald-500 mr-2" />
            <Text className="text-slate-400 text-[11px] font-extrabold uppercase">মোট পরিশোধ</Text>
          </View>
          <Text className="text-emerald-700 text-xl font-black">৳ {formatCurrency(report.totalPaid)}</Text>
          {report.directPayment > 0 && (
            <Text className="text-[10px] text-emerald-600 font-bold mt-1">
              (আলাদা জমা: ৳ {formatCurrency(report.directPayment)})
            </Text>
          )}
        </View>

        <View className="bg-white p-3.5 rounded-2xl w-[48%] border border-rose-100 shadow-sm">
          <View className="flex-row items-center mb-1">
            <View className={`w-2 h-2 rounded-full ${report.totalDue < 0 ? 'bg-blue-500' : 'bg-rose-500'} mr-2`} />
            <Text className="text-slate-400 text-[11px] font-extrabold uppercase">
              {report.totalDue < 0 ? 'অগ্রিম জমা' : 'মোট বকেয়া'}
            </Text>
          </View>
          <Text className={`${report.totalDue < 0 ? 'text-blue-600' : 'text-rose-600'} text-xl font-black`}>
            {report.totalDue < 0 ? `+ ৳ ${formatCurrency(report.totalDue)}` : `৳ ${formatCurrency(report.totalDue)}`}
          </Text>
          {report.directDue > 0 && (
            <Text className="text-[10px] text-rose-600 font-bold mt-1">
              (সরাসরি বাকি: ৳ {formatCurrency(report.directDue)})
            </Text>
          )}
        </View>
      </View>

      {/* Bag & Weight Stats */}
      <View className="flex-row justify-between mb-5">
        <View className="bg-white p-3.5 rounded-2xl w-[48%] border border-slate-200 shadow-sm flex-row items-center">
          <View className="w-9 h-9 bg-slate-100 rounded-xl items-center justify-center mr-2.5">
            <MaterialCommunityIcons name="sack" size={18} color="#059669" />
          </View>
          <View>
            <Text className="text-slate-400 text-[10px] font-extrabold uppercase">৫০ কেজি বস্তা</Text>
            <Text className="text-slate-900 text-base font-black">{report.totalBags} বস্তা</Text>
          </View>
        </View>

        <View className="bg-white p-3.5 rounded-2xl w-[48%] border border-slate-200 shadow-sm flex-row items-center">
          <View className="w-9 h-9 bg-slate-100 rounded-xl items-center justify-center mr-2.5">
            <MaterialCommunityIcons name="weight-kilogram" size={18} color="#059669" />
          </View>
          <View className="flex-1">
            <Text className="text-slate-400 text-[10px] font-extrabold uppercase">মোট ওজন</Text>
            <Text className="text-slate-900 text-sm font-black">{formatWeight(report.totalWeight)}</Text>
          </View>
        </View>
      </View>

      {/* Category Breakdown */}
      <Text className="text-slate-900 font-extrabold text-base mb-3">ক্যাটাগরি অনুযায়ী খাদ্যের বিবরণ</Text>
      
      {categoryList.length > 0 ? (
        <View className="gap-y-2.5">
          {categoryList.map((cat) => (
            <View key={cat.id} className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
              <View className="flex-row justify-between items-center pb-2 border-b border-slate-100 mb-2">
                <Text className="font-extrabold text-slate-800 text-sm">{cat.name}</Text>
                <Text className="font-black text-slate-900 text-sm">৳ {formatCurrency(cat.cost)}</Text>
              </View>

              <View className="flex-row justify-between items-center">
                <Text className="text-xs text-slate-500 font-medium">পরিমাণ / ওজন:</Text>
                <Text className="text-xs font-bold text-slate-800">{cat.bags} বস্তা ({formatWeight(cat.weight)})</Text>
              </View>

              <View className="flex-row justify-between items-center mt-1">
                <Text className="text-xs text-emerald-700 font-medium">পরিশোধিত পরিমাণ:</Text>
                <Text className="text-xs font-bold text-emerald-700">৳ {formatCurrency(cat.paid)}</Text>
              </View>

              <View className="flex-row justify-between items-center mt-1">
                <Text className={`text-xs font-medium ${cat.due < 0 ? 'text-blue-700' : 'text-rose-700'}`}>
                  {cat.due < 0 ? 'অগ্রিম জমা:' : 'বকেয়া:'}
                </Text>
                <Text className={`text-xs font-bold ${cat.due < 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                  {cat.due < 0 ? `+ ৳ ${formatCurrency(cat.due)}` : `৳ ${formatCurrency(cat.due)}`}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View className="py-10 bg-white rounded-2xl border border-dashed border-slate-200 items-center justify-center">
          <MaterialCommunityIcons name="calendar-blank-outline" size={30} color="#94a3b8" />
          <Text className="text-slate-400 font-medium text-xs mt-2">এই মাসের কোনো হিসাব পাওয়া যায়নি।</Text>
        </View>
      )}

    </ScrollView>
  );
}