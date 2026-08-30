import React from 'react';
import { View, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface CategoryExpenseProps {
  data?: { categoryName: string; amount: number }[];
}

export default function CategoryExpense({ data = [] }: CategoryExpenseProps) {
  const safeData = Array.isArray(data) ? data : [];

  // মোট খরচ গণনা (পার্সেন্টেজ বের করার জন্য)
  const totalExpense = safeData.reduce((sum, item) => sum + (Number(item?.amount) || 0), 0);

  const getStyle = (name: string) => {
    const formattedName = name ? String(name).toLowerCase().trim() : '';
    
    if (formattedName.includes('boiler') || formattedName.includes('poultry') || formattedName.includes('chicken') || formattedName.includes('layer')) {
      return { icon: 'bird', color: '#f59e0b' }; // Amber
    } else if (formattedName.includes('cattle') || formattedName.includes('cow') || formattedName.includes('bull')) {
      return { icon: 'cow', color: '#8b5cf6' }; // Purple
    } else if (formattedName.includes('fish') || formattedName.includes('aqua')) {
      return { icon: 'fish', color: '#0ea5e9' }; // Sky Blue
    } else if (formattedName.includes('duck')) {
      return { icon: 'duck', color: '#10b981' }; // Emerald
    } else {
      return { icon: 'shape', color: '#64748b' }; // Slate
    }
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(num || 0));
  };

  return (
    <View className="px-4 py-3">
      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-lg font-black text-slate-900">Monthly Breakdown</Text>
        {totalExpense > 0 && (
          <Text className="text-xs font-bold text-slate-400">
            Total: ৳ {formatCurrency(totalExpense)}
          </Text>
        )}
      </View>

      <View className="bg-white rounded-3xl border border-slate-100 p-4 gap-4 shadow-sm">
        {safeData.length === 0 ? (
          <View className="py-6 items-center justify-center">
            <MaterialCommunityIcons name="chart-pie" size={32} color="#cbd5e1" />
            <Text className="text-slate-400 font-semibold text-center mt-2 text-xs">
              No category data available for this month
            </Text>
          </View>
        ) : (
          safeData.map((item, index) => {
            const categoryName = item?.categoryName ? String(item.categoryName).trim() : 'Other';
            const { icon, color } = getStyle(categoryName);
            
            const rawAmount = item?.amount;
            const amount = (rawAmount !== null && rawAmount !== undefined && !isNaN(Number(rawAmount))) 
              ? Number(rawAmount) 
              : 0;

            const percentage = totalExpense > 0 ? ((amount / totalExpense) * 100).toFixed(1) : '0';

            return (
              <View key={`${categoryName}-${index}`} className="gap-2">
                <View className="flex-row justify-between items-center">
                  <View className="flex-row items-center gap-3">
                    <View className="w-9 h-9 rounded-2xl justify-center items-center" style={{ backgroundColor: `${color}15` }}>
                      <MaterialCommunityIcons name={icon as any} size={18} color={color} />
                    </View>
                    <View>
                      <Text className="text-slate-800 font-bold text-sm">{categoryName}</Text>
                      <Text className="text-slate-400 font-semibold text-[10px]">{percentage}% of monthly cost</Text>
                    </View>
                  </View>

                  <Text className="text-slate-900 font-black text-sm">
                    ৳ {formatCurrency(amount)}
                  </Text>
                </View>

                {/* Visual Progress Bar */}
                <View className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <View 
                    style={{ 
                      width: `${Math.min(Number(percentage), 100)}%`, 
                      backgroundColor: color 
                    }} 
                    className="h-full rounded-full"
                  />
                </View>
              </View>
            );
          })
        )}
      </View>
    </View>
  );
}