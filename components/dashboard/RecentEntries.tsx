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
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(num || 0));
  };

  const formatWeight = (kg: number) => {
    const safeKg = !isNaN(Number(kg)) ? Number(kg) : 0;
    return safeKg >= 1000 ? `${(safeKg / 1000).toFixed(2)} টন` : `${safeKg.toFixed(2)} কেজি`;
  };

  return (
    <View className="px-4 py-2">
      <View className="flex-row justify-between items-center mb-3">
        <View className="flex-row items-center">
          <View className="w-1.5 h-4 bg-emerald-600 rounded-full mr-2" />
          <Text className="text-[15px] font-black text-slate-900 tracking-tight">
            সাম্প্রতিক লেনদেন
          </Text>
        </View>

        <TouchableOpacity 
          onPress={handleSeeAll} 
          activeOpacity={0.7} 
          className="flex-row items-center bg-slate-100/90 px-2.5 py-1 rounded-full border border-slate-200/50"
        >
          <Text className="text-[11px] font-bold text-emerald-700 mr-1">সব দেখুন</Text>
          <MaterialCommunityIcons name="arrow-right" size={13} color="#047857" />
        </TouchableOpacity>
      </View>

      {safeEntries.length === 0 ? (
        <View className="bg-white rounded-3xl p-8 border border-slate-100 items-center justify-center shadow-sm">
          <View className="w-12 h-12 bg-slate-50 rounded-2xl items-center justify-center mb-2">
            <MaterialCommunityIcons name="receipt-text-outline" size={24} color="#94a3b8" />
          </View>
          <Text className="text-slate-400 font-bold text-xs">
            কোনো সাম্প্রতিক লেনদেন নেই
          </Text>
        </View>
      ) : (
        <View className="bg-white rounded-3xl border border-slate-100/90 overflow-hidden shadow-sm">
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
            const dueAmount = Number(item?.due_amount) || 0;
            const totalBag = Number(item?.total_bag) || 0;
            const totalKg = Number(item?.total_kg) || 0;

            const itemsList: FeedItemJSON[] = Array.isArray(item?.items_json) && item.items_json.length > 0
              ? item.items_json
              : [];

            const feedsTitle = itemsList.length > 0
              ? itemsList.map((f) => f.name).join(', ')
              : (subCategoryName || 'খাদ্য তালিকা');

            const formattedDate = item?.entry_date
              ? new Date(item.entry_date).toLocaleDateString('bn-BD', {
                  day: 'numeric',
                  month: 'short',
                })
              : '';

            const isDue = dueAmount > 0;
            const isAdvance = dueAmount < 0;

            return (
              <View
                key={item?.id || index}
                className={`p-3.5 flex-row justify-between items-center ${
                  index !== displayedEntries.length - 1 ? 'border-b border-slate-100' : ''
                }`}
              >
                {/* বাম পাশের বিবরণী */}
                <View className="flex-1 min-w-0 pr-3">
                  <View className="flex-row items-center mb-1">
                    <View className="bg-emerald-50 px-2 py-0.5 rounded-md mr-2 max-w-[65%]">
                      <Text className="text-[10px] font-bold text-emerald-700" numberOfLines={1}>
                        {categoryName || 'সাধারণ'}
                      </Text>
                    </View>
                    <Text className="text-[10px] font-semibold text-slate-400">
                      {formattedDate}
                    </Text>
                  </View>

                  <Text className="text-slate-800 font-extrabold text-[13px] leading-5" numberOfLines={1}>
                    {feedsTitle}
                  </Text>

                  <Text className="text-slate-400 font-medium text-[11px] mt-0.5" numberOfLines={1}>
                    {totalBag} বস্তা • {formatWeight(totalKg)}
                  </Text>
                </View>

                {/* ডান পাশের সম্পূর্ণ প্রাইস সেকশন (ডট ডট হবে না) */}
                <View className="items-end shrink-0 pl-1">
                  <Text className="text-slate-900 font-black text-[15px] tracking-tight mb-1">
                    ৳ {formatCurrency(grandTotal)}
                  </Text>

                  <View
                    className={`px-2 py-0.5 rounded-md ${
                      isAdvance
                        ? 'bg-blue-50'
                        : isDue
                        ? 'bg-rose-50'
                        : 'bg-emerald-50'
                    }`}
                  >
                    <Text
                      className={`text-[10px] font-extrabold ${
                        isAdvance
                          ? 'text-blue-700'
                          : isDue
                          ? 'text-rose-600'
                          : 'text-emerald-700'
                      }`}
                    >
                      {isAdvance
                        ? `অগ্রিম: ৳ ${formatCurrency(dueAmount)}`
                        : isDue
                        ? `বকেয়া: ৳ ${formatCurrency(dueAmount)}`
                        : 'পরিশোধিত'}
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