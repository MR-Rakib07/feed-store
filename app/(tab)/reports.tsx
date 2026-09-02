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
              className={`flex-1 py-4 items-center ${isActive ? 'border-b-4 border-green-700' : ''}`}
              onPress={() => setSelectedTab(tab)}
            >
              <Text className={`text-base ${isActive ? 'text-black font-bold' : 'text-gray-400 font-medium'}`}>
                {tabLabels[tab]}
              </Text>
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