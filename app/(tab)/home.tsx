import React, { useState, useEffect } from 'react';
import { ScrollView, View, ActivityIndicator, RefreshControl, Alert, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

import CategoryExpense from '../../components/dashboard/CategoryExpense';
import RecentEntries from '../../components/dashboard/RecentEntries';

interface DashboardStats {
  todayExpense: number;
  todayBags: number;
  todayKg: number;
  monthExpense: number;
  monthPaid: number;
  monthDue: number;
  yearExpense: number;
}

export default function App() {
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [stats, setStats] = useState<DashboardStats>({
    todayExpense: 0,
    todayBags: 0,
    todayKg: 0,
    monthExpense: 0,
    monthPaid: 0,
    monthDue: 0,
    yearExpense: 0,
  });

  const [categoryBreakdown, setCategoryBreakdown] = useState<any[]>([]);
  const [recentData, setRecentData] = useState<any[]>([]);

  const formatWeight = (kg: number) => {
    const safeKg = !isNaN(Number(kg)) ? Number(kg) : 0;
    return safeKg >= 1000 ? `${(safeKg / 1000).toFixed(2)} টন` : `${safeKg.toFixed(2)} কেজি`;
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(num || 0));
  };

  const fetchDashboardMetrics = async () => {
    try {
      if (!refreshing) setLoading(true);

      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');

      const todayStr = `${year}-${month}-${day}`;
      const firstDayOfMonthStr = `${year}-${month}-01`;
      const firstDayOfYearStr = `${year}-01-01`;

      const [
        { data: todayData },
        { data: monthData },
        { data: yearData },
        { data: todayPayments },
        { data: monthPayments },
        { data: yearPayments },
        { data: recent }
      ] = await Promise.all([
        supabase.from('entries').select('grand_total, total_bag, total_kg').eq('entry_date', todayStr),
        supabase.from('entries').select('grand_total, paid_amount, due_amount, categories(name)').gte('entry_date', firstDayOfMonthStr).lte('entry_date', todayStr),
        supabase.from('entries').select('grand_total').gte('entry_date', firstDayOfYearStr).lte('entry_date', todayStr),
        supabase.from('payments').select('amount, type').eq('entry_date', todayStr),
        supabase.from('payments').select('amount, type').gte('entry_date', firstDayOfMonthStr).lte('entry_date', todayStr),
        supabase.from('payments').select('amount, type').gte('entry_date', firstDayOfYearStr).lte('entry_date', todayStr),
        supabase.from('entries').select('id, entry_date, grand_total, paid_amount, due_amount, total_bag, total_kg, items_json, categories ( name ), subcategories ( name )').order('created_at', { ascending: false }).limit(10)
      ]);

      const todayEntryExpense = (todayData || []).reduce((sum, curr) => sum + (Number(curr.grand_total) || 0), 0);
      const todayDirectDue = (todayPayments || []).filter(p => p.type === 'due').reduce((sum, curr) => sum + (Number(curr.amount) || 0), 0);
      const todayBagsSum = (todayData || []).reduce((sum, curr) => sum + (Number(curr.total_bag) || 0), 0);
      const todayKgSum = (todayData || []).reduce((sum, curr) => sum + (Number(curr.total_kg) || 0), 0);

      const monthEntryExpense = (monthData || []).reduce((sum, curr) => sum + (Number(curr.grand_total) || 0), 0);
      const monthDirectDue = (monthPayments || []).filter(p => p.type === 'due').reduce((sum, curr) => sum + (Number(curr.amount) || 0), 0);
      const monthExpenseSum = monthEntryExpense + monthDirectDue;

      const monthEntryPaid = (monthData || []).reduce((sum, curr) => sum + (Number(curr.paid_amount) || 0), 0);
      const monthDirectPaid = (monthPayments || []).filter(p => p.type === 'payment').reduce((sum, curr) => sum + (Number(curr.amount) || 0), 0);
      const monthPaidSum = monthEntryPaid + monthDirectPaid;

      const monthDueSum = monthExpenseSum - monthPaidSum;

      const yearEntryExpense = (yearData || []).reduce((sum, curr) => sum + (Number(curr.grand_total) || 0), 0);
      const yearDirectDue = (yearPayments || []).filter(p => p.type === 'due').reduce((sum, curr) => sum + (Number(curr.amount) || 0), 0);
      const yearExpenseSum = yearEntryExpense + yearDirectDue;

      const groupedCategories = (monthData || []).reduce((acc: any, curr: any) => {
        const categoryName = curr.categories?.name || 'Uncategorized';
        acc[categoryName] = (acc[categoryName] || 0) + (Number(curr.grand_total) || 0);
        return acc;
      }, {});

      const formattedCategories = Object.keys(groupedCategories).map(catName => ({
        categoryName: catName,
        amount: groupedCategories[catName]
      }));

      setStats({
        todayExpense: todayEntryExpense + todayDirectDue,
        todayBags: todayBagsSum,
        todayKg: todayKgSum,
        monthExpense: monthExpenseSum,
        monthPaid: monthPaidSum,
        monthDue: monthDueSum,
        yearExpense: yearExpenseSum,
      });

      setCategoryBreakdown(formattedCategories);
      setRecentData(recent || []);

    } catch (error) {
      Alert.alert('ড্যাশবোর্ড ত্রুটি', 'ড্যাশবোর্ড ডাটা লোড করতে ব্যর্থ হয়েছে।');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchDashboardMetrics(); }, []);

  const currentDateFormatted = new Date().toLocaleDateString('bn-BD', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const isDue = stats.monthDue > 0;
  const isAdvance = stats.monthDue < 0;

  if (loading && !refreshing) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-slate-50">
        <ActivityIndicator size="large" color="#059669" />
        <Text className="text-slate-400 font-bold mt-3 text-xs tracking-wider">ড্যাশবোর্ড প্রস্তুত হচ্ছে...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['bottom']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={fetchDashboardMetrics}
            tintColor="#059669"
            colors={['#059669']}
          />
        }
      >
        <View className="px-5 pt-4 pb-2">
          <View className="flex-row justify-between items-center">
            <View className="flex-1 pr-2 min-w-0">
              <Text className="text-2xl font-black text-slate-900 tracking-tight leading-8" numberOfLines={1}>সারসংক্ষেপ</Text>
              <Text className="text-xs font-semibold text-slate-400 mt-0.5 leading-4" numberOfLines={1}>{currentDateFormatted}</Text>
            </View>
            <View className="bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 flex-row items-center shrink-0">
              <View className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 shrink-0" />
              <Text className="text-[11px] font-bold text-emerald-700 leading-4" numberOfLines={1}>লাইভ হিসাব</Text>
            </View>
          </View>
        </View>

        <View className="px-4 my-2">
          <View className={`rounded-3xl p-5 shadow-sm ${isAdvance ? 'bg-emerald-600' : isDue ? 'bg-rose-600' : 'bg-slate-900'}`}>
            <View className="flex-row justify-between items-center mb-1">
              <Text className="text-white/80 text-xs font-bold uppercase tracking-wider leading-5 flex-1 pr-2" numberOfLines={1}>
                চলতি মাসের আর্থিক স্থিতি
              </Text>
              <View className="bg-black/20 px-2.5 py-0.5 rounded-full shrink-0">
                <Text className="text-[10px] font-black uppercase tracking-wider text-white leading-4" numberOfLines={1}>
                  {isAdvance ? 'অগ্রিম জমা' : isDue ? 'বকেয়া বাকি' : 'পরিশোধিত'}
                </Text>
              </View>
            </View>

            <Text className="text-white text-3xl font-black tracking-tight my-2 leading-9" numberOfLines={1}>
              {isAdvance ? `+ ৳ ${formatCurrency(stats.monthDue)}` : `৳ ${formatCurrency(stats.monthDue)}`}
            </Text>

            <View className="flex-row justify-between items-center pt-3 mt-1 border-t border-white/15">
              <View className="flex-1 pr-2 min-w-0">
                <Text className="text-white/70 text-[11px] font-medium uppercase leading-4" numberOfLines={1}>মাসের মোট খরচ</Text>
                <Text className="text-white text-sm font-extrabold mt-0.5 leading-5" numberOfLines={1}>৳ {formatCurrency(stats.monthExpense)}</Text>
              </View>
              <View className="flex-1 items-end pl-2 min-w-0">
                <Text className="text-white/70 text-[11px] font-medium uppercase leading-4" numberOfLines={1}>মোট পরিশোধ</Text>
                <Text className="text-white text-sm font-extrabold mt-0.5 leading-5" numberOfLines={1}>৳ {formatCurrency(stats.monthPaid)}</Text>
              </View>
            </View>
          </View>
        </View>

        <View className="px-4 py-2">
          <View className="flex-row mb-3" style={{ gap: 12 }}>
            <View className="flex-1 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm justify-between min-h-[110px]">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-wide leading-4 flex-1 pr-1" numberOfLines={1}>আজকের খরচ</Text>
                <View className="w-8 h-8 rounded-xl bg-emerald-50 items-center justify-center shrink-0">
                  <MaterialCommunityIcons name="cash-multiple" size={17} color="#059669" />
                </View>
              </View>
              <Text className="text-base font-black text-slate-900 leading-6" numberOfLines={1}>
                ৳ {formatCurrency(stats.todayExpense)}
              </Text>
            </View>

            <View className="flex-1 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm justify-between min-h-[110px]">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-wide leading-4 flex-1 pr-1" numberOfLines={1}>আজকের খাদ্য</Text>
                <View className="w-8 h-8 rounded-xl bg-blue-50 items-center justify-center shrink-0">
                  <MaterialCommunityIcons name="scale-balance" size={17} color="#2563eb" />
                </View>
              </View>
              <View className="min-w-0">
                <Text className="text-base font-black text-slate-900 leading-6" numberOfLines={1}>
                  {stats.todayBags} বস্তা
                </Text>
                <Text className="text-[10px] font-bold text-slate-400 mt-0.5 leading-4" numberOfLines={1}>
                  ({formatWeight(stats.todayKg)})
                </Text>
              </View>
            </View>
          </View>

          <View className="flex-row mb-3" style={{ gap: 12 }}>
            <View className="flex-1 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm justify-between min-h-[110px]">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-wide leading-4 flex-1 pr-1" numberOfLines={1}>মাসের পরিশোধ</Text>
                <View className="w-8 h-8 rounded-xl bg-teal-50 items-center justify-center shrink-0">
                  <MaterialCommunityIcons name="check-decagram-outline" size={17} color="#0d9488" />
                </View>
              </View>
              <Text className="text-base font-black text-emerald-700 leading-6" numberOfLines={1}>
                ৳ {formatCurrency(stats.monthPaid)}
              </Text>
            </View>

            <View className="flex-1 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm justify-between min-h-[110px]">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-wide leading-4 flex-1 pr-1" numberOfLines={1}>বছরের খরচ</Text>
                <View className="w-8 h-8 rounded-xl bg-amber-50 items-center justify-center shrink-0">
                  <MaterialCommunityIcons name="chart-timeline-variant" size={17} color="#d97706" />
                </View>
              </View>
              <Text className="text-base font-black text-slate-900 leading-6" numberOfLines={1}>
                ৳ {formatCurrency(stats.yearExpense)}
              </Text>
            </View>
          </View>
        </View>

        <CategoryExpense data={categoryBreakdown} />

        <RecentEntries entries={recentData} />

      </ScrollView>
    </SafeAreaView>
  );
}