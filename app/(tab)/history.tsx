import React, { useState, useEffect } from 'react';
import { 
  Text, View, SectionList, TextInput, TouchableOpacity, 
  Alert, RefreshControl, Modal, TouchableWithoutFeedback, ActivityIndicator 
} from 'react-native';
import { Feather, SimpleLineIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

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

interface HistoryEntry {
  id: string;
  category_name: string;
  subcategory_name: string;
  total_bag: number;
  bag_weight: number;
  bag_price: number;
  total_kg: number;
  total_price: number;
  transport_cost: number;
  grand_total: number;
  paid_amount: number;
  due_amount: number;
  items_json: FeedItemJSON[] | null;
  note: string | null;
  entry_date: string;
  created_at: string;
}

export default function HistoryScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [historyList, setHistoryList] = useState<HistoryEntry[]>([]);
  const [menuVisible, setMenuVisible] = useState<string | null>(null);

  useEffect(() => { fetchHistory(); }, []);

  const fetchHistory = async () => {
    try {
      if (!refreshing) setLoading(true);
      
      // created_at অনুযায়ী descending অর্ডারে ডাটা আনা হচ্ছে (সর্বশেষ ডাটা আগে আসবে)
      const { data, error } = await supabase
        .from('entries')
        .select(`*, categories(name), subcategories(name)`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistoryList((data || []).map((item: any) => ({
        ...item,
        category_name: item.categories?.name || 'Unknown',
        subcategory_name: item.subcategories?.name || 'Unknown'
      })));
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false); setRefreshing(false);
    }
  };

  const formatWeight = (kg: number) => {
    const safeKg = !isNaN(Number(kg)) ? Number(kg) : 0;
    return safeKg >= 1000 ? `${(safeKg / 1000).toFixed(2)} Ton` : `${safeKg} kg`;
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(num || 0));
  };

  const handleDelete = (id: string) => {
    setMenuVisible(null);
    Alert.alert('Delete Record', 'Are you sure you want to delete this log?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await supabase.from('entries').delete().eq('id', id);
        setHistoryList(prev => prev.filter(i => i.id !== id));
      }}
    ]);
  };

  const filteredHistory = historyList.filter(item => 
    (item.category_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.subcategory_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.note || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading && !refreshing) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-50">
        <ActivityIndicator size="large" color="#059669" />
        <Text className="text-slate-500 font-semibold mt-3 text-sm">Loading history...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50 p-4">
      <View className="flex-row items-center mb-4 bg-white border border-slate-200 rounded-2xl px-4 h-12 shadow-sm">
        <Feather name="search" size={18} color="#94A3B8" />
        <TextInput 
          placeholder="Search category, feed or notes..." 
          value={searchQuery} 
          onChangeText={setSearchQuery} 
          className="flex-1 ml-3 text-base text-slate-800" 
          placeholderTextColor="#94A3B8"
        />
      </View>

      <SectionList
        sections={[{ title: 'Records', data: filteredHistory }]}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        renderItem={({ item }) => {
          const totalBag = !isNaN(Number(item?.total_bag)) ? Number(item.total_bag) : 0;
          const totalKg = !isNaN(Number(item?.total_kg)) ? Number(item.total_kg) : 0;
          const totalPrice = !isNaN(Number(item?.total_price)) ? Number(item.total_price) : 0;
          const transportCost = !isNaN(Number(item?.transport_cost)) ? Number(item.transport_cost) : 0;
          const grandTotal = !isNaN(Number(item?.grand_total)) ? Number(item.grand_total) : 0;
          const paidAmount = !isNaN(Number(item?.paid_amount)) ? Number(item.paid_amount) : 0;
          const dueAmount = !isNaN(Number(item?.due_amount)) ? Number(item.due_amount) : 0;

          const feedItems: FeedItemJSON[] = Array.isArray(item.items_json) && item.items_json.length > 0 
            ? item.items_json 
            : [];

          return (
            <View className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 mb-4">
              <Modal transparent visible={menuVisible === item.id} animationType="fade">
                <TouchableWithoutFeedback onPress={() => setMenuVisible(null)}>
                  <View className="flex-1 bg-black/20 justify-center items-center">
                    <View className="bg-white rounded-2xl w-44 overflow-hidden shadow-xl border border-slate-100">
                      <TouchableOpacity 
                        className="p-4 border-b border-slate-100 flex-row items-center" 
                        onPress={() => {
                          setMenuVisible(null);
                          router.push({ pathname: "/history/EditEntryScreen", params: { entry: JSON.stringify(item) }});
                        }}
                      >
                        <Feather name="edit-2" size={16} color="#334155" />
                        <Text className="font-bold text-slate-700 ml-3">Edit Log</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        className="p-4 flex-row items-center" 
                        onPress={() => handleDelete(item.id)}
                      >
                        <Feather name="trash-2" size={16} color="#EF4444" />
                        <Text className="font-bold text-red-500 ml-3">Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableWithoutFeedback>
              </Modal>

              {/* Header Info */}
              <View className="flex-row justify-between items-start mb-3">
                <View className="flex-1 pr-2">
                  <Text className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider mb-0.5">
                    {item?.entry_date ? new Date(item.entry_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                  </Text>
                  <Text className="text-lg font-black text-slate-900 leading-6">{item?.category_name || 'Unknown Category'}</Text>
                </View>
                <TouchableOpacity 
                  onPress={() => setMenuVisible(item.id)}
                  className="p-1 rounded-full active:bg-slate-100"
                >
                  <SimpleLineIcons name="options-vertical" size={16} color="#64748B" />
                </TouchableOpacity>
              </View>

              {/* Items Breakdown Section */}
              <View className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-100/80 mb-3 space-y-2">
                {feedItems.length > 0 ? (
                  <View className="mb-2">
                    <Text className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Purchased Feed Items</Text>
                    {feedItems.map((feed, idx) => (
                      <View key={idx} className="flex-row justify-between items-center py-1 border-b border-slate-100/60 last:border-b-0">
                        <View className="flex-1 pr-2">
                          <Text className="text-xs font-bold text-slate-800">{feed.name}</Text>
                          <Text className="text-[10px] text-slate-500 font-medium">
                            {feed.input_quantity} Qty × {feed.unit_weight_kg}kg
                          </Text>
                        </View>
                        <Text className="text-xs font-extrabold text-slate-900">৳ {formatCurrency(feed.sub_total)}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View className="flex-row justify-between pb-1 border-b border-slate-100">
                    <Text className="text-xs text-slate-500 font-medium">Model Name:</Text>
                    <Text className="text-xs font-bold text-slate-800">{item?.subcategory_name || 'N/A'}</Text>
                  </View>
                )}

                {/* Summary Info */}
                <View className="flex-row justify-between pt-1">
                  <Text className="text-xs text-slate-500 font-medium">50KG Standard Bags:</Text>
                  <Text className="text-xs font-bold text-slate-800">{totalBag} Bags ({formatWeight(totalKg)})</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-xs text-slate-500 font-medium">Feed Sub-Total:</Text>
                  <Text className="text-xs font-bold text-slate-800">৳ {formatCurrency(totalPrice)}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-xs text-slate-500 font-medium">Transport Cost:</Text>
                  <Text className="text-xs font-bold text-emerald-700">৳ {formatCurrency(transportCost)}</Text>
                </View>
              </View>

              {/* Note Badge */}
              {item?.note ? (
                <View className="mb-3 p-2.5 bg-amber-50 rounded-xl border border-amber-100/80">
                  <Text className="text-[10px] font-bold text-amber-700 uppercase">Note:</Text>
                  <Text className="text-xs text-amber-900 font-medium mt-0.5">{item.note}</Text>
                </View>
              ) : null}

              {/* Financial Calculation Bar */}
              <View className="pt-2 border-t border-slate-100 gap-1.5">
                <View className="flex-row justify-between items-center">
                  <Text className="text-xs font-bold text-slate-500 uppercase">Grand Total</Text>
                  <Text className="text-base font-black text-slate-900">৳ {formatCurrency(grandTotal)}</Text>
                </View>

                <View className="flex-row justify-between items-center">
                  <Text className="text-xs font-bold text-emerald-700 uppercase">Paid Amount</Text>
                  <Text className="text-sm font-bold text-emerald-700">৳ {formatCurrency(paidAmount)}</Text>
                </View>

                <View className="flex-row justify-between items-center pt-1 border-t border-dashed border-slate-200">
                  <Text className={`text-xs font-extrabold uppercase ${dueAmount < 0 ? 'text-blue-800' : 'text-rose-700'}`}>
                    {dueAmount < 0 ? 'Advance Credit' : 'Due / Remaining'}
                  </Text>
                  <Text className={`text-base font-black ${dueAmount < 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                    {dueAmount < 0 ? `+ ৳ ${formatCurrency(dueAmount)}` : `৳ ${formatCurrency(dueAmount)}`}
                  </Text>
                </View>
              </View>

            </View>
          );
        }}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={fetchHistory} 
            tintColor="#059669"
            colors={['#059669']}
          />
        }
        ListEmptyComponent={
          <View className="py-20 items-center justify-center">
            <Text className="text-slate-400 font-medium text-base">No history records found.</Text>
          </View>
        }
      />
    </View>
  );
}