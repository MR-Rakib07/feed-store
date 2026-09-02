import React from 'react';
import { View, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface CategoryExpenseProps {
  data?: { categoryName: string; amount: number }[];
}

export default function CategoryExpense({ data = [] }: CategoryExpenseProps) {
  const safeData = Array.isArray(data) ? data : [];
  const totalExpense = safeData.reduce((sum, item) => sum + (Number(item?.amount) || 0), 0);

  const getStyle = (name: string) => {
    const formattedName = name ? String(name).toLowerCase().trim() : '';

    if (
      formattedName.includes('boiler') ||
      formattedName.includes('poultry') ||
      formattedName.includes('chicken') ||
      formattedName.includes('layer') ||
      formattedName.includes('ব্রয়লার') ||
      formattedName.includes('মুরগি')
    ) {
      return { icon: 'bird', color: '#d97706', bg: 'bg-amber-500/15' };
    } else if (
      formattedName.includes('cattle') ||
      formattedName.includes('cow') ||
      formattedName.includes('bull') ||
      formattedName.includes('গরু')
    ) {
      return { icon: 'cow', color: '#7c3aed', bg: 'bg-purple-500/15' };
    } else if (
      formattedName.includes('fish') ||
      formattedName.includes('aqua') ||
      formattedName.includes('মাছ')
    ) {
      return { icon: 'fish', color: '#0284c7', bg: 'bg-sky-500/15' };
    } else if (formattedName.includes('duck') || formattedName.includes('হাঁস')) {
      return { icon: 'duck', color: '#059669', bg: 'bg-emerald-500/15' };
    } else {
      return { icon: 'shape-outline', color: '#64748b', bg: 'bg-slate-500/15' };
    }
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(num || 0));
  };

  return (
    <View className="px-4 py-2">
      {/* হেডার */}
      <View className="flex-row justify-between items-center mb-3">
        <View className="flex-row items-center">
          <View className="w-1.5 h-4 bg-emerald-600 rounded-full mr-2" />
          <Text className="text-[15px] font-black text-slate-900 tracking-tight">
            ক্যাটাগরি অনুযায়ী ব্যয়
          </Text>
        </View>

        {totalExpense > 0 && (
          <View className="bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200/60">
            <Text className="text-[11px] font-bold text-slate-700">
              মোট: ৳ {formatCurrency(totalExpense)}
            </Text>
          </View>
        )}
      </View>

      {/* কার্ড কন্টেইনার */}
      <View className="bg-white rounded-3xl border border-slate-100 p-4 shadow-sm">
        {safeData.length === 0 ? (
          <View className="py-8 items-center justify-center">
            <View className="w-12 h-12 bg-slate-50 rounded-2xl items-center justify-center mb-2">
              <MaterialCommunityIcons name="chart-pie" size={24} color="#94a3b8" />
            </View>
            <Text className="text-slate-400 font-bold text-xs">
              চলতি মাসের কোনো ক্যাটাগরি তথ্য নেই
            </Text>
          </View>
        ) : (
          <View className="gap-y-4">
            {safeData.map((item, index) => {
              const categoryName = item?.categoryName ? String(item.categoryName).trim() : 'অন্যান্য';
              const { icon, color, bg } = getStyle(categoryName);

              const rawAmount = item?.amount;
              const amount = rawAmount !== null && rawAmount !== undefined && !isNaN(Number(rawAmount))
                ? Number(rawAmount)
                : 0;

              const percentage = totalExpense > 0 ? ((amount / totalExpense) * 100).toFixed(1) : '0';

              return (
                <View key={`${categoryName}-${index}`} className="gap-y-2 pb-1">
                  {/* ১ম লাইন: ক্যাটাগরির নাম ও প্রাইস */}
                  <View className="flex-row justify-between items-baseline">
                    <View className="flex-row items-center flex-1 mr-2">
                      <View className={`w-7 h-7 rounded-xl items-center justify-center mr-2 shrink-0 ${bg}`}>
                        <MaterialCommunityIcons name={icon as any} size={15} color={color} />
                      </View>
                      <Text className="text-slate-800 font-extrabold text-[13px] leading-5 flex-1" numberOfLines={1}>
                        {categoryName}
                      </Text>
                    </View>

                    {/* সম্পূর্ণ আনকাট প্রাইস */}
                    <Text className="text-slate-900 font-black text-[14px] tracking-tight shrink-0">
                      ৳ {formatCurrency(amount)}
                    </Text>
                  </View>

                  {/* ২য় লাইন: পারসেন্টেজ টেক্সট */}
                  <View className="flex-row justify-between items-center px-0.5">
                    <Text className="text-slate-400 font-semibold text-[10px]">
                      মোট ব্যয়ের হার
                    </Text>
                    <Text className="text-slate-500 font-bold text-[10px]">
                      {percentage}%
                    </Text>
                  </View>

                  {/* ৩য় লাইন: প্রোগ্রেস বার */}
                  <View className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-0.5">
                    <View
                      style={{
                        width: `${Math.min(Number(percentage), 100)}%`,
                        backgroundColor: color,
                      }}
                      className="h-full rounded-full"
                    />
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}