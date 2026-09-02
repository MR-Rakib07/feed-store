import React, { useState, useEffect } from 'react';
import { 
  Text, View, SectionList, TextInput, TouchableOpacity, 
  Alert, RefreshControl, Modal, TouchableWithoutFeedback, ActivityIndicator 
} from 'react-native';
import { Feather, SimpleLineIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import Toast from 'react-native-toast-message';
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
      
      const { data, error } = await supabase
        .from('entries')
        .select(`*, categories(name), subcategories(name)`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistoryList((data || []).map((item: any) => ({
        ...item,
        category_name: item.categories?.name || 'অজানা',
        subcategory_name: item.subcategories?.name || 'অজানা'
      })));
    } catch (error: any) {
      Alert.alert('ত্রুটি', error.message);
    } finally {
      setLoading(false); setRefreshing(false);
    }
  };

  const formatWeight = (kg: number) => {
    const safeKg = !isNaN(Number(kg)) ? Number(kg) : 0;
    return safeKg >= 1000 ? `${(safeKg / 1000).toFixed(2)} টন` : `${safeKg.toFixed(2)} কেজি`;
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(num || 0));
  };

  const handleCopyDetails = async (item: HistoryEntry) => {
    setMenuVisible(null);
    const feedItems: FeedItemJSON[] = Array.isArray(item.items_json) && item.items_json.length > 0 
      ? item.items_json 
      : [];

    let textToCopy = '';

    if (feedItems.length > 0) {
      textToCopy = feedItems
        .map(f => `${f.name}: ${f.input_quantity} বস্তা`)
        .join('\n');
    } else {
      textToCopy = `${item.subcategory_name || 'খাদ্য'}: ${item.total_bag} বস্তা`;
    }

    await Clipboard.setStringAsync(textToCopy);
    Toast.show({
      type: 'success',
      text1: 'কপি হয়েছে',
      text2: 'খাদ্যের নাম এবং বস্তার সংখ্যা ক্লিপবোর্ডে কপি করা হয়েছে।'
    });
  };

  const handleDelete = (id: string) => {
    setMenuVisible(null);
    Alert.alert('রেকর্ড মুছে ফেলুন', 'আপনি কি নিশ্চিতভাবে এই রেকর্ডটি মুছে ফেলতে চান?', [
      { text: 'বাতিল', style: 'cancel' },
      { text: 'মুছে ফেলুন', style: 'destructive', onPress: async () => {
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
        <Text className="text-slate-500 font-semibold mt-2.5 text-xs">হিস্ট্রি লোড হচ্ছে...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50 px-3.5 pt-3.5">
      <View className="flex-row items-center bg-white border border-slate-200 rounded-2xl px-3 h-11 mb-3 shadow-sm">
        <Feather name="search" size={17} color="#94A3B8" />
        <TextInput 
          placeholder="ক্যাটাগরি, খাদ্য বা নোট খুঁজুন..." 
          value={searchQuery} 
          onChangeText={setSearchQuery} 
          className="flex-1 ml-2.5 text-sm text-slate-800"
          placeholderTextColor="#94A3B8"
        />
      </View>

      <SectionList
        sections={[{ title: 'রেকর্ডসমূহ', data: filteredHistory }]}
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
            <View className="bg-white rounded-2xl p-3.5 border border-slate-100 mb-3 shadow-sm">
              <Modal transparent visible={menuVisible === item.id} animationType="fade">
                <TouchableWithoutFeedback onPress={() => setMenuVisible(null)}>
                  <View className="flex-1 bg-black/25 justify-center items-center">
                    <View className="bg-white rounded-2xl w-44 overflow-hidden border border-slate-200 shadow-lg">
                      <TouchableOpacity 
                        className="py-3 px-3.5 border-b border-slate-100 flex-row items-center" 
                        onPress={() => handleCopyDetails(item)}
                      >
                        <Feather name="copy" size={15} color="#334155" />
                        <Text className="font-bold text-slate-700 ml-2.5 text-xs">কপি করুন</Text>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        className="py-3 px-3.5 border-b border-slate-100 flex-row items-center" 
                        onPress={() => {
                          setMenuVisible(null);
                          router.push({ pathname: "/history/EditEntryScreen", params: { entry: JSON.stringify(item) }});
                        }}
                      >
                        <Feather name="edit-2" size={15} color="#334155" />
                        <Text className="font-bold text-slate-700 ml-2.5 text-xs">সম্পাদনা করুন</Text>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        className="py-3 px-3.5 flex-row items-center" 
                        onPress={() => handleDelete(item.id)}
                      >
                        <Feather name="trash-2" size={15} color="#EF4444" />
                        <Text className="font-bold text-rose-500 ml-2.5 text-xs">মুছে ফেলুন</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableWithoutFeedback>
              </Modal>

              <View className="flex-row justify-between items-start mb-2.5">
                <View className="flex-1 pr-2">
                  <Text className="text-[10px] font-extrabold text-emerald-700 uppercase mb-0.5 tracking-wider">
                    {item?.entry_date ? new Date(item.entry_date).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                  </Text>
                  <Text className="text-base font-black text-slate-900 leading-5" numberOfLines={1}>
                    {item?.category_name || 'অজানা ক্যাটাগরি'}
                  </Text>
                </View>
                <TouchableOpacity 
                  onPress={() => setMenuVisible(item.id)}
                  className="p-1 -mr-1"
                  activeOpacity={0.6}
                >
                  <SimpleLineIcons name="options-vertical" size={14} color="#64748B" />
                </TouchableOpacity>
              </View>

              <View className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 mb-2.5">
                {feedItems.length > 0 ? (
                  <View className="mb-1.5">
                    <Text className="text-[10px] font-extrabold uppercase text-slate-400 mb-1.5 tracking-wider">
                      ক্রয়কৃত খাদ্যের তালিকা
                    </Text>
                    {feedItems.map((feed, idx) => (
                      <View 
                        key={idx} 
                        className={`flex-row justify-between items-center py-1 border-b border-slate-100 ${idx === feedItems.length - 1 ? 'border-b-0' : ''}`}
                      >
                        <View className="flex-1 pr-2">
                          <Text className="text-xs font-bold text-slate-800 leading-4" numberOfLines={1}>
                            {feed.name}
                          </Text>
                          <Text className="text-[10px] text-slate-500 font-medium mt-0.5">
                            {feed.input_quantity} পরিমাণ × {feed.unit_weight_kg} কেজি
                          </Text>
                        </View>
                        <Text className="text-xs font-black text-slate-900">
                          ৳ {formatCurrency(feed.sub_total)}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View className="flex-row justify-between items-center pb-1.5 mb-1.5 border-b border-slate-100">
                    <Text className="text-[11px] text-slate-500 font-medium">মডেলের নাম:</Text>
                    <Text className="text-[11px] font-bold text-slate-800">{item?.subcategory_name || 'প্রযোজ্য নয়'}</Text>
                  </View>
                )}

                <View className="flex-row justify-between items-center py-0.5">
                  <Text className="text-[11px] text-slate-500 font-medium">৫০ কেজি স্ট্যান্ডার্ড বস্তা:</Text>
                  <Text className="text-[11px] font-bold text-slate-800">{totalBag} বস্তা ({formatWeight(totalKg)})</Text>
                </View>
                <View className="flex-row justify-between items-center py-0.5">
                  <Text className="text-[11px] text-slate-500 font-medium">খাদ্যের উপমোট:</Text>
                  <Text className="text-[11px] font-bold text-slate-800">৳ {formatCurrency(totalPrice)}</Text>
                </View>
                <View className="flex-row justify-between items-center py-0.5">
                  <Text className="text-[11px] text-slate-500 font-medium">পরিবহন খরচ:</Text>
                  <Text className="text-[11px] font-bold text-emerald-700">৳ {formatCurrency(transportCost)}</Text>
                </View>
              </View>

              {item?.note ? (
                <View className="mb-2.5 p-2 bg-amber-50 rounded-xl border border-amber-100">
                  <Text className="text-[10px] font-extrabold text-amber-700 uppercase">নোট:</Text>
                  <Text className="text-xs text-amber-900 font-medium mt-0.5 leading-4">{item.note}</Text>
                </View>
              ) : null}

              <View className="pt-2 border-t border-slate-100 gap-y-1">
                <View className="flex-row justify-between items-center">
                  <Text className="text-[11px] font-bold text-slate-500 uppercase">সর্বমোট খরচ</Text>
                  <Text className="text-sm font-black text-slate-900">৳ {formatCurrency(grandTotal)}</Text>
                </View>

                <View className="flex-row justify-between items-center">
                  <Text className="text-[11px] font-bold text-emerald-700 uppercase">পরিশোধিত টাকা</Text>
                  <Text className="text-xs font-bold text-emerald-700">৳ {formatCurrency(paidAmount)}</Text>
                </View>

                <View className="flex-row justify-between items-center pt-1.5 border-t border-dashed border-slate-200">
                  <Text className={`text-[11px] font-black uppercase ${dueAmount < 0 ? 'text-blue-700' : 'text-rose-600'}`}>
                    {dueAmount < 0 ? 'অগ্রিম জমা' : 'বাকি বকেয়া'}
                  </Text>
                  <Text className={`text-sm font-black ${dueAmount < 0 ? 'text-blue-600' : 'text-rose-600'}`}>
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
          <View className="py-16 items-center justify-center">
            <Text className="text-slate-400 font-medium text-xs">কোনো হিস্ট্রি রেকর্ড পাওয়া যায়নি।</Text>
          </View>
        }
      />
    </View>
  );
}