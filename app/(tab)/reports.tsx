import React, { useState } from 'react';
import { Text, View, TouchableOpacity } from 'react-native';
import MonthlyReport from '../../components/reports/Monthly';
import YearlyReport from '../../components/reports/Yearly';

type TabType = 'Monthly' | 'Yearly';

const tabLabels: Record<TabType, string> = {
  Monthly: 'মাসিক রিপোর্ট',
  Yearly: 'বার্ষিক রিপোর্ট',
};

export default function ReportScreen() {
  const [selectedTab, setSelectedTab] = useState<TabType>('Monthly');

  return (
    <View className="flex-1 bg-gray-50">
      <View className="flex-row bg-white border-b border-gray-200">
        {(['Monthly', 'Yearly'] as TabType[]).map((tab) => {
          const isActive = selectedTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              className="flex-1 items-center justify-center py-3 relative"
              onPress={() => setSelectedTab(tab)}
              activeOpacity={0.7}
            >
              <Text 
                numberOfLines={1}
                className={`text-sm tracking-normal ${
                  isActive ? 'text-emerald-700 font-bold' : 'text-gray-400 font-medium'
                }`}
                style={{ includeFontPadding: false }}
              >
                {tabLabels[tab]}
              </Text>

              {isActive && (
                <View className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600" />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <View className="flex-1">
        {selectedTab === 'Monthly' && <MonthlyReport />}
        {selectedTab === 'Yearly' && <YearlyReport />}
      </View>
    </View>
  );
}