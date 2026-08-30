import React, { useState, useEffect } from 'react';
import { ScrollView, View, ActivityIndicator, RefreshControl, Alert, Text } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

import StatCard from '../../components/dashboard/StatCard';
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
    return safeKg >= 1000 ? `${(safeKg / 1000).toFixed(2)} Ton` : `${safeKg.toFixed(2)} kg`;
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

      // ১. আজকের ডাটা কোয়েরি
      const { data: todayData } = await supabase
        .from('entries')
        .select('grand_total, total_bag, total_kg')
        .eq('entry_date', todayStr);

      // ২. এই মাসের ডাটা কোয়েরি (Expense, Paid, Due সহ)
      const { data: monthData } = await supabase
        .from('entries')
        .select('grand_total, paid_amount, due_amount, categories(name)')
        .gte('entry_date', firstDayOfMonthStr)
        .lte('entry_date', todayStr);

      // ৩. এই বছরের ডাটা কোয়েরি
      const { data: yearData } = await supabase
        .from('entries')
        .select('grand_total')
        .gte('entry_date', firstDayOfYearStr)
        .lte('entry_date', todayStr);

      // আজকের হিসাব
      const todayExpenseSum = (todayData || []).reduce((sum, curr) => sum + (Number(curr.grand_total) || 0), 0);
      const todayBagsSum = (todayData || []).reduce((sum, curr) => sum + (Number(curr.total_bag) || 0), 0);
      const todayKgSum = (todayData || []).reduce((sum, curr) => sum + (Number(curr.total_kg) || 0), 0);

      // মাসের হিসাব
      const monthExpenseSum = (monthData || []).reduce((sum, curr) => sum + (Number(curr.grand_total) || 0), 0);
      const monthPaidSum = (monthData || []).reduce((sum, curr) => sum + (Number(curr.paid_amount) || 0), 0);
      const monthDueSum = (monthData || []).reduce((sum, curr) => sum + (Number(curr.due_amount) || 0), 0);

      // বছরের হিসাব
      const yearExpenseSum = (yearData || []).reduce((sum, curr) => sum + (Number(curr.grand_total) || 0), 0);

      // ডায়নামিক ক্যাটাগরি ব্রেকডাউন (Dynamic Category Grouping)
      const groupedCategories = (monthData || []).reduce((acc: any, curr: any) => {
        const categoryName = curr.categories?.name || 'Uncategorized';
        acc[categoryName] = (acc[categoryName] || 0) + (Number(curr.grand_total) || 0);
        return acc;
      }, {});

      const formattedCategories = Object.keys(groupedCategories).map(catName => ({
        categoryName: catName,
        amount: groupedCategories[catName]
      }));

      // রিসেন্ট ১০টি এন্ট্রি (created_at দিয়ে descending অর্ডার)
      const { data: recent } = await supabase
        .from('entries')
        .select('id, entry_date, grand_total, paid_amount, due_amount, total_bag, total_kg, items_json, categories ( name ), subcategories ( name )')
        .order('created_at', { ascending: false })
        .limit(10);

      setStats({
        todayExpense: todayExpenseSum,
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
      Alert.alert('Dashboard Error', 'Failed to fetch dashboard data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchDashboardMetrics(); }, []);

  if (loading && !refreshing) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-slate-50">
        <ActivityIndicator size="large" color="#059669" />
        <Text className="text-slate-500 font-semibold mt-3 text-xs">Loading Dashboard Metrics...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView className="flex-1 bg-slate-50">
        <ScrollView 
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchDashboardMetrics} tintColor="#059669" colors={['#059669']} />}
        >
          {/* Dashboard Title Header */}
          <View className="px-5 pt-4 pb-1">
            <Text className="text-2xl font-black text-slate-900 tracking-tight">Overview</Text>
            <Text className="text-xs font-semibold text-slate-400 mt-0.5">Real-time livestock feed statistics</Text>
          </View>

          {/* Key Metric Stat Cards Grid */}
          <View className="flex-row flex-wrap justify-between py-3 px-4 gap-y-3">
            <StatCard 
              title="Today's Expense" 
              value={`৳ ${formatCurrency(stats.todayExpense)}`} 
              icon="cash" 
              iconBg="bg-emerald-600" 
              borderColor="border-emerald-200" 
              textColor="text-emerald-700" 
            />
            <StatCard 
              title="Today's Weight / Bags" 
              value={`${stats.todayBags} Bags (${formatWeight(stats.todayKg)})`} 
              icon="album" 
              iconBg="bg-blue-500" 
              borderColor="border-blue-200" 
              textColor="text-blue-600" 
            />
            <StatCard 
              title="Month's Total Expense" 
              value={`৳ ${formatCurrency(stats.monthExpense)}`} 
              icon="calendar" 
              iconBg="bg-purple-500" 
              borderColor="border-purple-200" 
              textColor="text-purple-700" 
            />
            <StatCard 
              title="Month's Paid Amount" 
              value={`৳ ${formatCurrency(stats.monthPaid)}`} 
              icon="check-circle" 
              iconBg="bg-teal-500" 
              borderColor="border-teal-200" 
              textColor="text-teal-700" 
            />
            <StatCard 
              title={stats.monthDue < 0 ? "Month's Advance Credit" : "Month's Remaining Due"} 
              value={stats.monthDue < 0 ? `+ ৳ ${formatCurrency(stats.monthDue)}` : `৳ ${formatCurrency(stats.monthDue)}`} 
              icon="alert-circle" 
              iconBg={stats.monthDue < 0 ? "bg-blue-600" : "bg-rose-500"} 
              borderColor={stats.monthDue < 0 ? "border-blue-200" : "border-rose-200"} 
              textColor={stats.monthDue < 0 ? "text-blue-600" : "text-rose-600"} 
            />
            <StatCard 
              title="Year's Total Expense" 
              value={`৳ ${formatCurrency(stats.yearExpense)}`} 
              icon="trending-up" 
              iconBg="bg-amber-500" 
              borderColor="border-amber-200" 
              textColor="text-amber-600" 
            />
          </View>

          {/* Dynamic Category Expense Section */}
          <CategoryExpense data={categoryBreakdown} />

          {/* Recent Entries Feed */}
          <RecentEntries entries={recentData} />

        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}