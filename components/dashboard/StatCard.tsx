import React from 'react';
import { View, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  iconBg: string;
  borderColor: string;
  textColor: string;
}

export default function StatCard({ 
  title, 
  value, 
  icon, 
  iconBg, 
  borderColor, 
  textColor 
}: StatCardProps) {
  return (
    <View className={`w-[48%] p-3.5 border rounded-2xl bg-white shadow-sm justify-between ${borderColor}`}>
      {/* Top Section: Icon & Decorative Pill */}
      <View className="flex-row items-center justify-between mb-2">
        <View className={`w-9 h-9 rounded-xl items-center justify-center shadow-xs ${iconBg}`}>
          <MaterialCommunityIcons name={icon} size={18} color="#ffffff" />
        </View>
      </View>

      {/* Bottom Section: Title & Value */}
      <View>
        <Text className="text-slate-400 text-[11px] font-extrabold uppercase tracking-wider" numberOfLines={1}>
          {title}
        </Text>
        <Text className={`text-base font-black mt-0.5 tracking-tight ${textColor}`} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}