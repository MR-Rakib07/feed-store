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
    const feedItems: FeedItemJSON[] = Array.isArray(item.items_json) && item.items_json.length > 0 
      ? item.items_json 
      : [];

    let textToCopy = '';

    if (feedItems.length > 0) {
      textToCopy = feedItems
        .map(f => `${f.name} - ${f.input_quantity} বস্তা`)
        .join('\n');
    } else {
      textToCopy = `${item.subcategory_name || 'খাদ্য'} - ${item.total_bag} বস্তা`;
    }

    await Clipboard.setStringAsync(textToCopy);
    Toast.show({
      type: 'success',
      text1: 'কপি সফল হয়েছে',
      text2: 'খাদ্যের নাম এবং বস্তার সংখ্যা কপি করা হয়েছে।'
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
        <Text className="text-slate-500 font-bold mt-3 text-xs leading-5">হিস্ট্রি লোড হচ্ছে...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50 px-4 pt-3">
      {/* সার্চ বার */}
      <View className="flex-row items-center bg-white border border-slate-200 rounded-2xl px-3.5 py-2.5 mb-3 shadow-xs">
        <Feather name="search" size={17} color="#94A3B8" />
        <TextInput 
          placeholder="ক্যাটাগরি, খাদ্য বা নোট খুঁজুন..." 
          value={searchQuery} 
          onChangeText={setSearchQuery} 
          className="flex-1 ml-2.5 text-sm text-slate-800 font-semibold"
          placeholderTextColor="#94A3B8"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} className="p-1">
            <Feather name="x" size={16} color="#94A3B8" />
          </TouchableOpacity>
        )}
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
            <View className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs mb-3.5">
              {/* অ্যাকশন মেনু মডাল */}
              <Modal transparent visible={menuVisible === item.id} animationType="fade">
                <TouchableWithoutFeedback onPress={() => setMenuVisible(null)}>
                  <View className="flex-1 bg-black/30 justify-center items-center px-6">
                    <View className="bg-white rounded-3xl w-56 overflow-hidden border border-slate-200 shadow-xl">
                      <TouchableOpacity 
                        className="py-3.5 px-4 border-b border-slate-100 flex-row items-center active:bg-slate-50" 
                        onPress={() => {
                          setMenuVisible(null);
                          router.push({ pathname: "/history/EditEntryScreen", params: { entry: JSON.stringify(item) }});
                        }}
                      >
                        <Feather name="edit-2" size={16} color="#334155" className="shrink-0" />
                        <Text 
                          numberOfLines={1} 
                          className="font-bold text-slate-800 ml-3 text-sm leading-6 flex-1"
                        >
                          সম্পাদনা করুন
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        className="py-3.5 px-4 flex-row items-center active:bg-rose-50" 
                        onPress={() => handleDelete(item.id)}
                      >
                        <Feather name="trash-2" size={16} color="#EF4444" className="shrink-0" />
                        <Text 
                          numberOfLines={1} 
                          className="font-bold text-rose-600 ml-3 text-sm leading-6 flex-1"
                        >
                          মুছে ফেলুন
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableWithoutFeedback>
              </Modal>

              {/* কার্ড হেডার */}
              <View className="flex-row justify-between items-start pb-3 border-b border-slate-100">
                <View className="flex-1 pr-2">
                  <Text className="text-[11px] font-extrabold text-emerald-700 uppercase tracking-wider leading-4">
                    {item?.entry_date ? new Date(item.entry_date).toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
                  </Text>
                  <Text className="text-base font-black text-slate-900 mt-0.5 leading-6">
                    {item?.category_name || 'অজানা ক্যাটাগরি'}
                  </Text>
                </View>
                
                <View className="flex-row items-center gap-x-1 shrink-0">
                  <TouchableOpacity 
                    onPress={() => handleCopyDetails(item)}
                    className="p-2 bg-emerald-50 rounded-xl active:bg-emerald-100"
                    activeOpacity={0.7}
                  >
                    <Feather name="copy" size={15} color="#059669" />
                  </TouchableOpacity>

                  <TouchableOpacity 
                    onPress={() => setMenuVisible(item.id)}
                    className="p-2 bg-slate-50 rounded-xl active:bg-slate-100"
                    activeOpacity={0.7}
                  >
                    <SimpleLineIcons name="options-vertical" size={13} color="#64748B" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* ক্রয়কৃত খাদ্যের তালিকা */}
              <View className="py-3 border-b border-slate-100">
                <Text className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-2 leading-4">
                  ক্রয়কৃত খাদ্যের বিবরণ
                </Text>

                {feedItems.length > 0 ? (
                  <View className="gap-y-2">
                    {feedItems.map((feed, idx) => (
                      <View 
                        key={idx} 
                        className="flex-row justify-between items-center bg-slate-50/80 p-2.5 rounded-2xl border border-slate-100"
                      >
                        <View className="flex-1 pr-2">
                          <Text className="text-xs font-bold text-slate-900 leading-5">
                            {feed.name}
                          </Text>
                          <Text className="text-[11px] text-slate-500 font-medium leading-4 mt-0.5">
                            {feed.input_quantity} বস্তা × {feed.unit_weight_kg} কেজি • ৳{formatCurrency(feed.price_per_unit)}
                          </Text>
                        </View>
                        <Text className="text-xs font-black text-slate-900 shrink-0 leading-5">
                          ৳ {formatCurrency(feed.sub_total)}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View className="flex-row justify-between items-center py-1">
                    <Text className="text-xs text-slate-600 font-medium leading-5">খাদ্যের নাম:</Text>
                    <Text className="text-xs font-bold text-slate-800 leading-5">{item?.subcategory_name || 'প্রযোজ্য নয়'}</Text>
                  </View>
                )}
              </View>

              {/* ওজন ও উপমোট খরচ বিবরণী */}
              <View className="py-2.5 border-b border-slate-100 gap-y-1.5">
                <View className="flex-row justify-between items-center">
                  <Text className="text-xs text-slate-500 font-medium leading-5">মোট খাদ্য ওজন:</Text>
                  <Text className="text-xs font-bold text-slate-800 shrink-0 leading-5">{formatWeight(totalKg)} ({totalBag} বস্তা)</Text>
                </View>
                <View className="flex-row justify-between items-center">
                  <Text className="text-xs text-slate-500 font-medium leading-5">খাদ্যের উপমোট মূল্য:</Text>
                  <Text className="text-xs font-bold text-slate-800 shrink-0 leading-5">৳ {formatCurrency(totalPrice)}</Text>
                </View>
                <View className="flex-row justify-between items-center">
                  <Text className="text-xs text-slate-500 font-medium leading-5">পরিবহন খরচ:</Text>
                  <Text className="text-xs font-bold text-emerald-700 shrink-0 leading-5">৳ {formatCurrency(transportCost)}</Text>
                </View>
              </View>

              {/* নোট (যদি থাকে) */}
              {item?.note ? (
                <View className="my-2.5 p-2.5 bg-amber-50/70 rounded-2xl border border-amber-100/80">
                  <Text className="text-[10px] font-extrabold text-amber-800 uppercase leading-4">মন্তব্য:</Text>
                  <Text className="text-xs text-amber-900 font-medium mt-0.5 leading-5">{item.note}</Text>
                </View>
              ) : null}

              {/* ব্যালেন্স ও পেমেন্ট সামারি */}
              <View className="pt-2.5 gap-y-1.5">
                <View className="flex-row justify-between items-center">
                  <Text className="text-xs font-bold text-slate-500 uppercase leading-5">সর্বমোট বিল</Text>
                  <Text className="text-sm font-black text-slate-900 shrink-0 leading-5">৳ {formatCurrency(grandTotal)}</Text>
                </View>

                <View className="flex-row justify-between items-center">
                  <Text className="text-xs font-bold text-emerald-700 uppercase leading-5">পরিশোধিত টাকা</Text>
                  <Text className="text-xs font-bold text-emerald-700 shrink-0 leading-5">৳ {formatCurrency(paidAmount)}</Text>
                </View>

                <View className={`mt-1.5 p-2.5 rounded-2xl flex-row justify-between items-center ${
                  dueAmount < 0 ? 'bg-blue-50 border border-blue-100' : dueAmount === 0 ? 'bg-emerald-50 border border-emerald-100' : 'bg-rose-50 border border-rose-100'
                }`}>
                  <Text className={`text-[11px] font-black uppercase leading-4 flex-1 pr-2 ${
                    dueAmount < 0 ? 'text-blue-800' : dueAmount === 0 ? 'text-emerald-800' : 'text-rose-800'
                  }`}>
                    {dueAmount < 0 ? 'অগ্রিম জমা' : dueAmount === 0 ? 'সম্পূর্ণ পরিশোধিত' : 'বাকি বকেয়া'}
                  </Text>
                  <Text className={`text-sm font-black shrink-0 leading-5 ${
                    dueAmount < 0 ? 'text-blue-700' : dueAmount === 0 ? 'text-emerald-700' : 'text-rose-600'
                  }`}>
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
            <Feather name="inbox" size={32} color="#94A3B8" />
            <Text className="text-slate-400 font-bold text-xs mt-2 leading-5">কোনো হিস্ট্রি রেকর্ড পাওয়া যায়নি।</Text>
          </View>
        }
      />
    </View>
  );
}