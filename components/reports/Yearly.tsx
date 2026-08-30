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

export default function YearlyReportScreen() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('entries')
        .select('*, categories(id, name)');
      if (error) throw error;
      setEntries(data || []);
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message
      });
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const changeYear = (offset: number) => {
    setSelectedYear(prev => prev + offset);
  };

  const report = useMemo(() => {
    const stats = {
      totalBags: 0,
      totalWeight: 0,
      totalCost: 0,
      totalTransport: 0,
      totalPaid: 0,
      totalDue: 0,
      categoryMap: {} as Record<string, DynamicCategoryStat>
    };

    (Array.isArray(entries) ? entries : []).forEach(item => {
      if (!item?.entry_date) return;
      const entryDate = new Date(item.entry_date);
      if (entryDate.getFullYear() === selectedYear) {
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
        stats.totalDue += due;

        const categoryObj = item.categories;
        const catId = categoryObj?.id || 'uncategorized';
        const catName = categoryObj?.name || 'Uncategorized';

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

    return stats;
  }, [entries, selectedYear]);

  const formatWeight = (kg: number) => {
    const safeKg = !isNaN(Number(kg)) ? Number(kg) : 0;
    if (safeKg >= 1000) {
      return `${(safeKg / 1000).toFixed(2)} Ton`;
    }
    return `${safeKg.toFixed(2)} kg`;
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(num || 0));
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-50">
        <ActivityIndicator size="large" color="#059669" />
        <Text className="text-slate-500 font-semibold mt-3 text-sm">Generating yearly report...</Text>
      </View>
    );
  }

  const categoryList = Object.values(report.categoryMap);

  return (
    <ScrollView className="flex-1 bg-slate-50 p-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
      
      {/* Year Navigation */}
      <View className="flex-row items-center justify-between mb-5 bg-white p-2.5 rounded-2xl shadow-sm border border-slate-200">
        <TouchableOpacity onPress={() => changeYear(-1)} className="p-2 bg-slate-100 rounded-xl active:bg-slate-200">
          <MaterialCommunityIcons name="chevron-left" size={24} color="#334155" />
        </TouchableOpacity>
        
        <View className="flex-1 items-center px-2">
          <Text className="font-black text-slate-800 text-lg">
            Year: {selectedYear}
          </Text>
        </View>
        
        <TouchableOpacity onPress={() => changeYear(1)} className="p-2 bg-slate-100 rounded-xl active:bg-slate-200">
          <MaterialCommunityIcons name="chevron-right" size={24} color="#334155" />
        </TouchableOpacity>
      </View>

      {/* Main Expense Banner */}
      <View className="bg-emerald-600 rounded-3xl p-6 mb-4 shadow-lg shadow-emerald-200">
        <Text className="text-emerald-100 text-xs uppercase font-extrabold tracking-widest">Total Yearly Expenditure ({selectedYear})</Text>
        <Text className="text-white text-3xl font-black mt-1.5">৳ {formatCurrency(report.totalCost)}</Text>
        <View className="flex-row items-center justify-between mt-4 pt-3 border-t border-emerald-500/50">
          <Text className="text-emerald-100 text-xs font-semibold">Transport Included:</Text>
          <Text className="text-white text-sm font-bold">৳ {formatCurrency(report.totalTransport)}</Text>
        </View>
      </View>

      {/* Financial Status Cards (Paid & Due) */}
      <View className="flex-row justify-between mb-4">
        <View className="bg-white p-4 rounded-2xl w-[48%] border border-emerald-100 shadow-sm">
          <View className="flex-row items-center mb-1">
            <View className="w-2 h-2 rounded-full bg-emerald-500 mr-2" />
            <Text className="text-slate-400 text-[11px] font-extrabold uppercase">Total Paid</Text>
          </View>
          <Text className="text-emerald-700 text-xl font-black">৳ {formatCurrency(report.totalPaid)}</Text>
        </View>

        <View className="bg-white p-4 rounded-2xl w-[48%] border border-rose-100 shadow-sm">
          <View className="flex-row items-center mb-1">
            <View className={`w-2 h-2 rounded-full ${report.totalDue < 0 ? 'bg-blue-500' : 'bg-rose-500'} mr-2`} />
            <Text className="text-slate-400 text-[11px] font-extrabold uppercase">
              {report.totalDue < 0 ? 'Advance Credit' : 'Total Due'}
            </Text>
          </View>
          <Text className={`${report.totalDue < 0 ? 'text-blue-600' : 'text-rose-600'} text-xl font-black`}>
            {report.totalDue < 0 ? `+ ৳ ${formatCurrency(report.totalDue)}` : `৳ ${formatCurrency(report.totalDue)}`}
          </Text>
        </View>
      </View>

      {/* Quantity & Weight Cards */}
      <View className="flex-row justify-between mb-6">
        <View className="bg-white p-4 rounded-2xl w-[48%] border border-slate-200 shadow-sm flex-row items-center">
          <View className="w-10 h-10 bg-slate-100 rounded-xl items-center justify-center mr-3">
            <MaterialCommunityIcons name="sack" size={20} color="#059669" />
          </View>
          <View>
            <Text className="text-slate-400 text-[10px] font-extrabold uppercase">50KG Bags</Text>
            <Text className="text-slate-900 text-lg font-black">{report.totalBags} Bags</Text>
          </View>
        </View>

        <View className="bg-white p-4 rounded-2xl w-[48%] border border-slate-200 shadow-sm flex-row items-center">
          <View className="w-10 h-10 bg-slate-100 rounded-xl items-center justify-center mr-3">
            <MaterialCommunityIcons name="weight-kilogram" size={20} color="#059669" />
          </View>
          <View className="flex-1">
            <Text className="text-slate-400 text-[10px] font-extrabold uppercase">Total Weight</Text>
            <Text className="text-slate-900 text-base font-black">{formatWeight(report.totalWeight)}</Text>
          </View>
        </View>
      </View>

      {/* Dynamic Category Breakdown Section */}
      <Text className="text-slate-900 font-extrabold text-lg mb-3">Category Breakdown ({selectedYear})</Text>
      
      {categoryList.length > 0 ? (
        <View className="gap-3">
          {categoryList.map((cat) => (
            <View key={cat.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <View className="flex-row justify-between items-center pb-2 border-b border-slate-100 mb-2">
                <Text className="font-extrabold text-slate-800 text-base">{cat.name}</Text>
                <Text className="font-black text-slate-900 text-base">৳ {formatCurrency(cat.cost)}</Text>
              </View>

              <View className="flex-row justify-between items-center">
                <Text className="text-xs text-slate-500 font-medium">Quantity / Weight:</Text>
                <Text className="text-xs font-bold text-slate-800">{cat.bags} Bags ({formatWeight(cat.weight)})</Text>
              </View>

              <View className="flex-row justify-between items-center mt-1">
                <Text className="text-xs text-emerald-700 font-medium">Paid Amount:</Text>
                <Text className="text-xs font-bold text-emerald-700">৳ {formatCurrency(cat.paid)}</Text>
              </View>

              <View className="flex-row justify-between items-center mt-1">
                <Text className={`text-xs font-medium ${cat.due < 0 ? 'text-blue-700' : 'text-rose-700'}`}>
                  {cat.due < 0 ? 'Advance:' : 'Due:'}
                </Text>
                <Text className={`text-xs font-bold ${cat.due < 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                  {cat.due < 0 ? `+ ৳ ${formatCurrency(cat.due)}` : `৳ ${formatCurrency(cat.due)}`}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View className="py-12 bg-white rounded-2xl border border-dashed border-slate-200 items-center justify-center">
          <MaterialCommunityIcons name="calendar-blank-outline" size={32} color="#94a3b8" />
          <Text className="text-slate-400 font-medium text-sm mt-2">No entries logged for {selectedYear}.</Text>
        </View>
      )}

    </ScrollView>
  );
}