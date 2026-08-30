import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

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

interface RecentEntry {
  id: string;
  entry_date: string;
  grand_total: number;
  paid_amount?: number;
  due_amount?: number;
  total_bag: number;
  total_kg?: number;
  items_json?: FeedItemJSON[] | null;
  categories: { name: string } | { name: string }[] | null;
  subcategories: { name: string } | { name: string }[] | null;
}

interface RecentEntriesProps {
  entries: RecentEntry[];
}

export default function RecentEntries({ entries = [] }: RecentEntriesProps) {
  const safeEntries = Array.isArray(entries) ? entries : [];
  const displayedEntries = safeEntries.slice(0, 5);

  const handleSeeAll = () => {
    router.push('/(tab)/history'); 
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(num || 0));
  };

  const formatWeight = (kg: number) => {
    const safeKg = !isNaN(Number(kg)) ? Number(kg) : 0;
    return safeKg >= 1000 ? `${(safeKg / 1000).toFixed(2)} Ton` : `${safeKg.toFixed(2)} kg`;
  };

  return (
    <View className="px-4 py-3">
      {/* Header */}
      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-lg font-black text-slate-900">Recent Transactions</Text>
        
        <TouchableOpacity onPress={handleSeeAll} activeOpacity={0.7} className="flex-row items-center">
          <Text className="text-xs font-extrabold text-emerald-600 mr-1">See All</Text>
          <MaterialCommunityIcons name="arrow-right" size={14} color="#059669" />
        </TouchableOpacity>
      </View>
      
      {/* List / Empty State */}
      {safeEntries.length === 0 ? (
        <View className="bg-white rounded-3xl p-8 border border-slate-100 items-center justify-center shadow-sm">
          <MaterialCommunityIcons name="receipt-text-outline" size={32} color="#cbd5e1" />
          <Text className="text-slate-400 font-semibold text-xs mt-2">No recent transactions found</Text>
        </View>
      ) : (
        <View className="bg-white rounded-3xl border border-slate-100/80 overflow-hidden shadow-sm">
          {displayedEntries.map((item, index) => {
            const categoryObj = item?.categories;
            const subCategoryObj = item?.subcategories;

            const categoryName = Array.isArray(categoryObj) 
              ? categoryObj[0]?.name 
              : categoryObj?.name;

            const subCategoryName = Array.isArray(subCategoryObj) 
              ? subCategoryObj[0]?.name 
              : subCategoryObj?.name;

            const grandTotal = Number(item?.grand_total) || 0;
            const paidAmount = Number(item?.paid_amount) || 0;
            const dueAmount = Number(item?.due_amount) || 0;
            const totalBag = Number(item?.total_bag) || 0;
            const totalKg = Number(item?.total_kg) || 0;

            const itemsList: FeedItemJSON[] = Array.isArray(item?.items_json) && item.items_json.length > 0 
              ? item.items_json 
              : [];

            // একাধিক ফিড থাকলে নামের ব্রেকডাউন
            const feedsTitle = itemsList.length > 0
              ? itemsList.map(f => f.name).join(', ')
              : (subCategoryName || 'Feed Log');

            const formattedDate = item?.entry_date 
              ? new Date(item.entry_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) 
              : '';

            return (
              <View 
                key={item?.id || index} 
                className={`p-4 flex-row justify-between items-center ${
                  index !== displayedEntries.length - 1 ? 'border-b border-slate-100/80' : ''
                }`}
              >
                <View className="flex-1 pr-3">
                  <View className="flex-row items-center gap-1.5 mb-0.5">
                    <Text className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md uppercase">
                      {categoryName || 'General'}
                    </Text>
                    <Text className="text-[10px] font-bold text-slate-400">
                      • {formattedDate}
                    </Text>
                  </View>

                  <Text className="text-slate-900 font-bold text-sm" numberOfLines={1}>
                    {feedsTitle}
                  </Text>

                  <Text className="text-slate-400 font-semibold text-[11px] mt-0.5">
                    {totalBag} Bags ({formatWeight(totalKg)})
                  </Text>
                </View>

                {/* Amount & Status Badge */}
                <View className="items-end gap-1">
                  <Text className="text-slate-900 font-black text-base">
                    ৳ {formatCurrency(grandTotal)}
                  </Text>
                  
                  {/* Paid / Due Pill Badge */}
                  <View className={`px-2 py-0.5 rounded-full flex-row items-center ${
                    dueAmount <= 0 ? 'bg-emerald-100/80' : 'bg-rose-100/80'
                  }`}>
                    <Text className={`text-[10px] font-extrabold ${
                      dueAmount < 0 ? 'text-blue-700' : dueAmount === 0 ? 'text-emerald-700' : 'text-rose-700'
                    }`}>
                      {dueAmount < 0 
                        ? `Adv: ৳${formatCurrency(dueAmount)}` 
                        : dueAmount === 0 
                        ? 'Paid' 
                        : `Due: ৳${formatCurrency(dueAmount)}`}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}