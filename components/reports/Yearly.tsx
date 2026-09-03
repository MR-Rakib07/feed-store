import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Alert, TouchableOpacity, RefreshControl } from 'react-native';
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

export default function YearlyReportScreen() {
  const [entries, setEntries] = useState<any[]>([]);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async (isRefreshing = false) => {
    try {
      if (!isRefreshing) setLoading(true);

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
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchReportData(true);
  };

  const changeYear = (offset: number) => {
    setSelectedYear(prev => prev + offset);
  };

  const report = useMemo(() => {
    const firstDayOfTargetYear = new Date(selectedYear, 0, 1, 0, 0, 0);
    const lastDayOfTargetYear = new Date(selectedYear, 11, 31, 23, 59, 59);

    const stats = {
      totalBags: 0,
      totalWeight: 0,
      totalCost: 0,
      totalTransport: 0,
      entryPaid: 0,
      entryDue: 0,
      directPayment: 0,
      totalPaid: 0,
      directDue: 0,
      totalGrossDue: 0,
      openingBalance: 0, // পূর্বের বছরগুলোর নিখুঁত ওপেনিং বকেয়া/অগ্রিম
      currentNetDue: 0,   // বছর শেষে চূড়ান্ত নিট বকেয়া
      categoryMap: {} as Record<string, DynamicCategoryStat>
    };

    interface LedgerEvent {
      date: Date;
      type: 'entry' | 'payment';
      billAmount: number;
      paidAmount: number;
      rawItem?: any;
    }

    const events: LedgerEvent[] = [];

    // ১. সব এন্ট্রিগুলো ইভেন্ট লিস্টে যোগ করা
    (Array.isArray(entries) ? entries : []).forEach(item => {
      if (!item?.entry_date) return;
      const bill = (Number(item.grand_total) || 0) + (Number(item.transport_cost) || 0);
      const paid = Number(item.paid_amount) || 0;
      events.push({
        date: new Date(item.entry_date),
        type: 'entry',
        billAmount: bill,
        paidAmount: paid,
        rawItem: item
      });
    });

    // ২. পেমেন্টগুলো ইভেন্ট লিস্টে যোগ করা
    (Array.isArray(payments) ? payments : []).forEach(item => {
      if (!item?.entry_date) return;
      const amount = Number(item.amount) || 0;
      events.push({
        date: new Date(item.entry_date),
        type: 'payment',
        billAmount: item.type === 'due' ? amount : 0,
        paidAmount: item.type === 'payment' ? amount : 0
      });
    });

    // তারিখ অনুযায়ী ছোট থেকে বড় সাজানো (পুরোনো থেকে নতুন - FIFO লজিক)
    events.sort((a, b) => a.date.getTime() - b.date.getTime());

    let openingBal = 0;

    events.forEach(ev => {
      const isBeforeTarget = ev.date < firstDayOfTargetYear;
      const isInTarget = ev.date >= firstDayOfTargetYear && ev.date <= lastDayOfTargetYear;

      // নির্বাচিত বছরের ১ জানুয়ারির আগের হিসাব দিয়ে ওপেনিং ব্যালেন্স ট্র্যাক করা
      if (isBeforeTarget) {
        openingBal += ev.billAmount - ev.paidAmount;
      }

      // নির্বাচিত বছরের হিসাবের জন্য
      if (isInTarget) {
        if (ev.type === 'entry' && ev.rawItem) {
          const item = ev.rawItem;
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
          stats.entryPaid += paid;
          stats.entryDue += due;

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
        } else if (ev.type === 'payment') {
          if (ev.billAmount > 0) stats.directDue += ev.billAmount;
          if (ev.paidAmount > 0) stats.directPayment += ev.paidAmount;
        }
      }
    });

    stats.openingBalance = openingBal;
    stats.totalPaid = stats.entryPaid + stats.directPayment;
    stats.totalGrossDue = stats.entryDue + stats.directDue;
    
    // বছর শেষে চূড়ান্ত নিট বকেয়া হিসাব করা
    let totalPriorBills = 0;
    let totalPriorPayments = 0;
    events.forEach(ev => {
      if (ev.date <= lastDayOfTargetYear) {
        totalPriorBills += ev.billAmount;
        totalPriorPayments += ev.paidAmount;
      }
    });

    stats.currentNetDue = totalPriorBills - totalPriorPayments;

    return stats;
  }, [entries, payments, selectedYear]);

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
        <Text className="text-slate-500 font-bold mt-3 text-xs leading-5">বার্ষিক রিপোর্ট তৈরি হচ্ছে...</Text>
      </View>
    );
  }

  const categoryList = Object.values(report.categoryMap);

  return (
    <ScrollView 
      className="flex-1 bg-slate-50 px-4 pt-3" 
      showsVerticalScrollIndicator={false} 
      contentContainerStyle={{ paddingBottom: 100 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#059669']} tintColor="#059669" />
      }
    >
      
      {/* Year Selector */}
      <View className="flex-row items-center justify-between mb-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
        <TouchableOpacity onPress={() => changeYear(-1)} className="p-2 bg-slate-50 rounded-xl active:bg-slate-100 shrink-0">
          <MaterialCommunityIcons name="chevron-left" size={24} color="#334155" />
        </TouchableOpacity>
        
        <View className="flex-1 items-center px-2">
          <Text className="font-black text-slate-800 text-base leading-6" numberOfLines={1}>
            বছর: {selectedYear}
          </Text>
        </View>
        
        <TouchableOpacity onPress={() => changeYear(1)} className="p-2 bg-slate-50 rounded-xl active:bg-slate-100 shrink-0">
          <MaterialCommunityIcons name="chevron-right" size={24} color="#334155" />
        </TouchableOpacity>
      </View>

      {/* Primary Financial Ledger Card */}
      <View className="bg-white rounded-3xl p-4 mb-3 border border-slate-200 shadow-xs">
        <View className="flex-row items-center justify-between pb-3 border-b border-slate-100">
          <View>
            <Text className="text-slate-400 text-[10px] uppercase font-extrabold tracking-wider leading-4">হিসাবের বিবরণী</Text>
            <Text className="text-slate-900 text-sm font-black leading-5">বার্ষিক সমন্বয় সারসংক্ষেপ ({selectedYear})</Text>
          </View>
          <View className="bg-slate-100 px-2.5 py-1 rounded-xl">
            <Text className="text-slate-600 font-bold text-[11px] leading-4">মোট লেনদেন</Text>
          </View>
        </View>

        <View className="py-2.5 gap-y-2 border-b border-slate-100">
          <View className="flex-row justify-between items-center">
            <Text className="text-slate-600 text-xs font-medium leading-5">পূর্বের/আলাদা বকেয়া যোগ</Text>
            <Text className="text-rose-600 text-xs font-bold shrink-0 leading-5">+ ৳ {formatCurrency(report.directDue)}</Text>
          </View>
          <View className="flex-row justify-between items-center">
            <Text className="text-slate-600 text-xs font-medium leading-5">সর্বমোট পরিশোধ ও জমা</Text>
            <Text className="text-emerald-600 text-xs font-bold shrink-0 leading-5">- ৳ {formatCurrency(report.totalPaid)}</Text>
          </View>
        </View>

        {/* Highlighted Closing Balance */}
        <View className={`mt-3 p-3 rounded-2xl flex-row items-center justify-between ${
          report.currentNetDue <= 0 ? 'bg-emerald-50 border border-emerald-100' : 'bg-rose-50 border border-rose-100'
        }`}>
          <View className="flex-1 pr-2">
            <Text className={`text-[11px] uppercase font-black leading-4 ${
              report.currentNetDue <= 0 ? 'text-emerald-800' : 'text-rose-800'
            }`}>
              {report.currentNetDue < 0 ? 'চলতি অগ্রিম ব্যালেন্স' : report.currentNetDue === 0 ? 'পরিশোধিত ব্যালেন্স' : 'বর্তমান নিট বকেয়া'}
            </Text>
            <Text className="text-slate-500 text-[10px] font-medium leading-4">
              {report.currentNetDue <= 0 ? 'দোকানে কোনো বকেয়া অবশিষ্ট নেই' : 'সর্বমোট বকেয়া থেকে জমা বাদ দেওয়া হয়েছে'}
            </Text>
          </View>
          <Text className={`text-xl font-black shrink-0 leading-6 ${
            report.currentNetDue <= 0 ? 'text-emerald-700' : 'text-rose-600'
          }`}>
            {report.currentNetDue < 0 ? `+ ৳ ${formatCurrency(report.currentNetDue)}` : `৳ ${formatCurrency(report.currentNetDue)}`}
          </Text>
        </View>
      </View>

      {/* Credit & Debit Sub-Ledger Cards */}
      <View className="flex-row justify-between mb-3">
        {/* Total Collections Card */}
        <View className="bg-white p-3 rounded-2xl w-[48.5%] border border-emerald-100 shadow-xs justify-between">
          <View>
            <View className="flex-row items-center mb-1">
              <View className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 shrink-0" />
              <Text className="text-slate-400 text-[10px] font-extrabold uppercase leading-4" numberOfLines={1}>সর্বমোট জমা</Text>
            </View>
            <Text className="text-emerald-700 text-lg font-black leading-6 shrink-0" numberOfLines={1}>
              ৳ {formatCurrency(report.totalPaid)}
            </Text>
          </View>

          <View className="pt-2 mt-2 border-t border-slate-100 gap-y-1">
            <View className="flex-row justify-between items-center">
              <Text className="text-[10px] text-slate-500 font-medium leading-4 flex-1 pr-1" numberOfLines={1}>খাদ্য বিল পরিশোধ:</Text>
              <Text className="text-[10px] text-slate-800 font-bold shrink-0 leading-4">৳ {formatCurrency(report.entryPaid)}</Text>
            </View>
            <View className="flex-row justify-between items-center">
              <Text className="text-[10px] text-slate-500 font-medium leading-4 flex-1 pr-1" numberOfLines={1}>আলাদা ক্যাশ জমা:</Text>
              <Text className="text-[10px] text-emerald-600 font-bold shrink-0 leading-4">৳ {formatCurrency(report.directPayment)}</Text>
            </View>
          </View>
        </View>

        {/* Total Outstanding Card */}
        <View className="bg-white p-3 rounded-2xl w-[48.5%] border border-rose-100 shadow-xs justify-between">
          <View>
            <View className="flex-row items-center mb-1">
              <View className="w-2 h-2 rounded-full bg-rose-500 mr-1.5 shrink-0" />
              <Text className="text-rose-600 text-[10px] font-extrabold uppercase leading-4" numberOfLines={1}>সর্বমোট বকেয়া দাবি</Text>
            </View>
            <Text className="text-rose-600 text-lg font-black leading-6 shrink-0" numberOfLines={1}>
              ৳ {formatCurrency(report.totalGrossDue)}
            </Text>
          </View>

          <View className="pt-2 mt-2 border-t border-slate-100 gap-y-1">
            <View className="flex-row justify-between items-center">
              <Text className="text-[10px] text-rose-500 font-medium leading-4 flex-1 pr-1" numberOfLines={1}>খাদ্য ক্রয়ের বাকি:</Text>
              <Text className="text-[10px] text-rose-600 font-bold shrink-0 leading-4">৳ {formatCurrency(report.entryDue)}</Text>
            </View>
            <View className="flex-row justify-between items-center">
              <Text className="text-[10px] text-rose-500 font-medium leading-4 flex-1 pr-1" numberOfLines={1}>পূর্বের/আলাদা বাকি:</Text>
              <Text className="text-[10px] text-rose-600 font-bold shrink-0 leading-4">৳ {formatCurrency(report.directDue)}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Bag & Weight Statistics */}
      <View className="flex-row justify-between mb-4">
        <View className="bg-white p-3 rounded-2xl w-[48.5%] border border-slate-200 shadow-xs flex-row items-center">
          <View className="w-8 h-8 bg-slate-50 rounded-xl items-center justify-center mr-2 shrink-0">
            <MaterialCommunityIcons name="sack" size={16} color="#059669" />
          </View>
          <View className="flex-1 min-w-0">
            <Text className="text-slate-400 text-[10px] font-extrabold uppercase leading-4" numberOfLines={1}>৫০ কেজি বস্তা</Text>
            <Text className="text-slate-900 text-xs font-black leading-5 shrink-0" numberOfLines={1}>{report.totalBags} বস্তা</Text>
          </View>
        </View>

        <View className="bg-white p-3 rounded-2xl w-[48.5%] border border-slate-200 shadow-xs flex-row items-center">
          <View className="w-8 h-8 bg-slate-50 rounded-xl items-center justify-center mr-2 shrink-0">
            <MaterialCommunityIcons name="weight-kilogram" size={16} color="#059669" />
          </View>
          <View className="flex-1 min-w-0">
            <Text className="text-slate-400 text-[10px] font-extrabold uppercase leading-4" numberOfLines={1}>মোট ওজন</Text>
            <Text className="text-slate-900 text-xs font-black leading-5 shrink-0" numberOfLines={1}>{formatWeight(report.totalWeight)}</Text>
          </View>
        </View>
      </View>

      {/* Category Wise Breakdown */}
      <Text className="text-slate-900 font-extrabold text-sm mb-2.5 leading-5">ক্যাটাগরি অনুযায়ী বিবরণ ({selectedYear})</Text>
      
      {categoryList.length > 0 ? (
        <View className="gap-y-2.5">
          {categoryList.map((cat) => (
            <View key={cat.id} className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
              <View className="flex-row justify-between items-center pb-2 border-b border-slate-100 mb-2">
                <Text className="font-extrabold text-slate-800 text-xs flex-1 pr-2 leading-5" numberOfLines={1}>{cat.name}</Text>
                <Text className="font-black text-slate-900 text-xs shrink-0 leading-5">৳ {formatCurrency(cat.cost)}</Text>
              </View>

              <View className="flex-row justify-between items-center py-0.5">
                <Text className="text-[11px] text-slate-500 font-medium leading-4 flex-1 pr-2">পরিমাণ / ওজন:</Text>
                <Text className="text-[11px] font-bold text-slate-800 shrink-0 leading-4">{cat.bags} বস্তা ({formatWeight(cat.weight)})</Text>
              </View>

              <View className="flex-row justify-between items-center py-0.5">
                <Text className="text-[11px] text-emerald-700 font-medium leading-4 flex-1 pr-2">পরিশোধিত পরিমাণ:</Text>
                <Text className="text-[11px] font-bold text-emerald-700 shrink-0 leading-4">৳ {formatCurrency(cat.paid)}</Text>
              </View>

              <View className="flex-row justify-between items-center py-0.5">
                <Text className={`text-[11px] font-medium leading-4 flex-1 pr-2 ${cat.due < 0 ? 'text-blue-700' : 'text-rose-600'}`}>
                  {cat.due < 0 ? 'অগ্রিম জমা:' : 'বকেয়া:'}
                </Text>
                <Text className={`text-[11px] font-bold shrink-0 leading-4 ${cat.due < 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                  {cat.due < 0 ? `+ ৳ ${formatCurrency(cat.due)}` : `৳ ${formatCurrency(cat.due)}`}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View className="py-8 bg-white rounded-2xl border border-dashed border-slate-200 items-center justify-center">
          <MaterialCommunityIcons name="calendar-blank-outline" size={26} color="#94a3b8" />
          <Text className="text-slate-400 font-medium text-xs mt-1.5 leading-5">{selectedYear} সালের কোনো হিসাব পাওয়া যায়নি।</Text>
        </View>
      )}

    </ScrollView>
  );
}