import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, FlatList, Modal, TouchableWithoutFeedback, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../../lib/supabase';
import Toast from 'react-native-toast-message';

interface PaymentRecord {
  id: string;
  type: 'due' | 'payment';
  amount: number;
  entry_date: string;
  note: string | null;
}

const convertBanglaToEnglishNumber = (input: string | number): string => {
  if (!input && input !== 0) return '';
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  let result = String(input).replace(/[০-৯]/g, (digit) => banglaDigits.indexOf(digit).toString());
  result = result.replace(/,/g, '');
  result = result.replace(/[^0-9.]/g, '');
  const parts = result.split('.');
  if (parts.length > 2) {
    result = parts[0] + '.' + parts.slice(1).join('');
  }
  return result;
};

export default function BalanceScreen() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [totalExpense, setTotalExpense] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);
  const [history, setHistory] = useState<PaymentRecord[]>([]);

  const [modalVisible, setModalVisible] = useState(false);
  const [actionType, setActionType] = useState<'due' | 'payment'>('payment');
  const [amountInput, setAmountInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchBalanceData = async () => {
    try {
      setLoading(true);
      const [entriesRes, paymentsRes] = await Promise.all([
        supabase.from('entries').select('grand_total, paid_amount'),
        supabase.from('payments').select('*').order('entry_date', { ascending: false }).order('created_at', { ascending: false })
      ]);

      if (entriesRes.error) throw entriesRes.error;
      if (paymentsRes.error) throw paymentsRes.error;

      const entriesData = entriesRes.data || [];
      const paymentsData: PaymentRecord[] = paymentsRes.data || [];

      let entryExpenseSum = 0;
      let entryPaidSum = 0;
      entriesData.forEach(e => {
        entryExpenseSum += Number(e.grand_total) || 0;
        entryPaidSum += Number(e.paid_amount) || 0;
      });

      let manualDueSum = 0;
      let manualPaidSum = 0;
      paymentsData.forEach(p => {
        if (p.type === 'due') manualDueSum += Number(p.amount) || 0;
        if (p.type === 'payment') manualPaidSum += Number(p.amount) || 0;
      });

      setTotalExpense(entryExpenseSum + manualDueSum);
      setTotalPaid(entryPaidSum + manualPaidSum);
      setHistory(paymentsData);

    } catch (error: any) {
      Alert.alert('ত্রুটি', error.message || 'ডাটা লোড করা সম্ভব হয়নি।');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalanceData();
  }, []);

  const formatDateToString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleSaveTransaction = async () => {
    const cleanAmount = parseFloat(convertBanglaToEnglishNumber(amountInput)) || 0;
    if (cleanAmount <= 0) {
      Toast.show({
        type: 'error',
        text1: 'ত্রুটি',
        text2: 'দয়া করে সঠিক টাকার পরিমাণ লিখুন।'
      });
      return;
    }

    try {
      setSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      const dateString = formatDateToString(selectedDate);

      if (editingId) {
        const { error } = await supabase
          .from('payments')
          .update({
            type: actionType,
            amount: cleanAmount,
            entry_date: dateString,
            note: noteInput.trim() || null
          })
          .eq('id', editingId);

        if (error) throw error;

        Toast.show({
          type: 'success',
          text1: 'সফল',
          text2: 'রেকর্ড সফলভাবে আপডেট করা হয়েছে!'
        });
      } else {
        const { error } = await supabase.from('payments').insert([
          {
            user_id: user?.id,
            type: actionType,
            amount: cleanAmount,
            entry_date: dateString,
            note: noteInput.trim() || null
          }
        ]);

        if (error) throw error;

        Toast.show({
          type: 'success',
          text1: 'সফল',
          text2: actionType === 'due' ? 'নতুন বকেয়া যুক্ত হয়েছে!' : 'টাকা সফলভাবে জমা হয়েছে!'
        });
      }

      closeModal();
      fetchBalanceData();

    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'ত্রুটি',
        text2: error.message
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenCreateModal = (type: 'due' | 'payment') => {
    setEditingId(null);
    setActionType(type);
    setAmountInput('');
    setNoteInput('');
    setSelectedDate(new Date());
    setModalVisible(true);
  };

  const handleOpenEditModal = (item: PaymentRecord) => {
    setEditingId(item.id);
    setActionType(item.type);
    setAmountInput(String(item.amount));
    setNoteInput(item.note || '');
    setSelectedDate(item.entry_date ? new Date(item.entry_date) : new Date());
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingId(null);
    setAmountInput('');
    setNoteInput('');
    setSelectedDate(new Date());
    setShowDatePicker(false);
  };

  const handleDeleteRecord = (id: string, type: 'due' | 'payment', amount: number) => {
    Alert.alert(
      'রেকর্ড মুছে ফেলুন',
      `আপনি কি নিশ্চিতভাবে এই ৳ ${formatCurrency(amount)} টাকার ${type === 'payment' ? 'জমার' : 'বকেয়ার'} রেকর্ডটি মুছে ফেলতে চান?`,
      [
        { text: 'বাতিল', style: 'cancel' },
        {
          text: 'মুছে ফেলুন',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.from('payments').delete().eq('id', id);
              if (error) throw error;

              Toast.show({
                type: 'success',
                text1: 'মুছে ফেলা হয়েছে',
                text2: 'লেনদেনের রেকর্ডটি সফলভাবে মুছে ফেলা হয়েছে।'
              });

              fetchBalanceData();
            } catch (error: any) {
              Alert.alert('ত্রুটি', error.message || 'রেকর্ডটি মোছা সম্ভব হয়নি।');
            }
          }
        }
      ]
    );
  };

  const netBalance = totalExpense - totalPaid;

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(num || 0));
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-50">
        <ActivityIndicator size="large" color="#059669" />
        <Text className="text-slate-500 font-bold mt-3 text-xs leading-5">ব্যালেন্স লোড হচ্ছে...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50 px-4 pt-3" edges={['bottom']}>
      <View className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs mb-4">
        <View className="flex-row justify-between items-center mb-1">
          <Text className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 leading-4" numberOfLines={1}>
            মোট আর্থিক স্থিতি
          </Text>
          <View className={`px-2.5 py-0.5 rounded-full shrink-0 ${netBalance <= 0 ? 'bg-blue-50' : 'bg-rose-50'}`}>
            <Text className={`text-[10px] font-extrabold uppercase tracking-wide leading-4 ${netBalance <= 0 ? 'text-blue-700' : 'text-rose-700'}`} numberOfLines={1}>
              {netBalance < 0 ? 'অগ্রিম জমা' : netBalance === 0 ? 'পরিশোধিত' : 'মোট বকেয়া'}
            </Text>
          </View>
        </View>

        <Text className={`text-3xl font-black tracking-tight mb-4 leading-9 ${netBalance <= 0 ? 'text-blue-600' : 'text-rose-600'}`} numberOfLines={1}>
          ৳ {formatCurrency(netBalance)}
        </Text>

        <View className="flex-row justify-between pt-3 border-t border-slate-100">
          <View className="flex-1 pr-2 min-w-0">
            <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-4" numberOfLines={1}>
              মোট খরচ / বকেয়া
            </Text>
            <Text className="text-sm font-black text-slate-800 mt-0.5 leading-5" numberOfLines={1}>
              ৳ {formatCurrency(totalExpense)}
            </Text>
          </View>
          <View className="flex-1 items-end pl-2 min-w-0">
            <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-4" numberOfLines={1}>
              মোট পরিশোধিত
            </Text>
            <Text className="text-sm font-black text-emerald-700 mt-0.5 leading-5" numberOfLines={1}>
              ৳ {formatCurrency(totalPaid)}
            </Text>
          </View>
        </View>
      </View>

      <View className="flex-row gap-x-3 mb-4">
        <TouchableOpacity
          onPress={() => handleOpenCreateModal('payment')}
          className="flex-1 bg-emerald-600 h-12 rounded-2xl flex-row justify-center items-center px-2 shadow-xs shadow-emerald-200 active:bg-emerald-700"
          activeOpacity={0.8}
        >
          <Feather name="plus-circle" size={16} color="#fff" className="shrink-0" />
          <Text numberOfLines={1} className="text-white font-extrabold text-xs uppercase tracking-wider ml-1.5 leading-5">
            টাকা জমা দিন
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleOpenCreateModal('due')}
          className="flex-1 bg-rose-600 h-12 rounded-2xl flex-row justify-center items-center px-2 shadow-xs shadow-rose-200 active:bg-rose-700"
          activeOpacity={0.8}
        >
          <Feather name="alert-circle" size={16} color="#fff" className="shrink-0" />
          <Text numberOfLines={1} className="text-white font-extrabold text-xs uppercase tracking-wider ml-1.5 leading-5">
            বকেয়া যোগ করুন
          </Text>
        </TouchableOpacity>
      </View>

      <View className="flex-1">
        <View className="flex-row justify-between items-center mb-2.5 px-0.5">
          <Text className="text-xs font-extrabold uppercase tracking-wider text-slate-600 leading-5" numberOfLines={1}>
            আলাদা জমা ও বকেয়ার ইতিহাস
          </Text>
          <Text className="text-[11px] font-bold text-slate-400 leading-4 shrink-0" numberOfLines={1}>
            {history.length} টি রেকর্ড
          </Text>
        </View>

        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 80 }}
          renderItem={({ item }) => {
            const isPayment = item.type === 'payment';
            return (
              <View className="bg-white p-3.5 rounded-2xl border border-slate-200 mb-2.5 shadow-xs">
                <View className="flex-row justify-between items-center">
                  <View className="flex-row items-center flex-1 pr-2 min-w-0">
                    <View className={`w-9 h-9 rounded-xl justify-center items-center mr-3 shrink-0 ${isPayment ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                      <MaterialCommunityIcons 
                        name={isPayment ? "cash-plus" : "cash-minus"} 
                        size={19} 
                        color={isPayment ? "#059669" : "#e11d48"} 
                      />
                    </View>
                    <View className="flex-1 min-w-0">
                      <Text className="text-xs font-bold text-slate-900 leading-5" numberOfLines={1}>
                        {isPayment ? 'নগদ জমা পরিশোধ' : 'সরাসরি বকেয়া ধার্য'}
                      </Text>
                      <Text className="text-[10px] text-slate-400 font-semibold mt-0.5 leading-4" numberOfLines={1}>
                        {item.entry_date ? new Date(item.entry_date).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center gap-x-1 shrink-0">
                    <Text className={`text-sm font-black mr-1 leading-5 ${isPayment ? 'text-emerald-700' : 'text-rose-600'}`} numberOfLines={1}>
                      {isPayment ? `- ৳ ${formatCurrency(item.amount)}` : `+ ৳ ${formatCurrency(item.amount)}`}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleOpenEditModal(item)}
                      className="p-1.5 bg-slate-50 active:bg-slate-100 rounded-xl shrink-0"
                      activeOpacity={0.7}
                    >
                      <Feather name="edit-2" size={15} color="#059669" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteRecord(item.id, item.type, item.amount)}
                      className="p-1.5 bg-slate-50 active:bg-rose-50 rounded-xl shrink-0"
                      activeOpacity={0.7}
                    >
                      <Feather name="trash-2" size={15} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>

                {item.note ? (
                  <View className="mt-2.5 pt-2 border-t border-slate-100 flex-row items-start bg-slate-50/70 p-2 rounded-xl">
                    <Text className="text-[10px] font-extrabold text-slate-400 uppercase mr-1.5 mt-0.5 leading-4 shrink-0">নোট:</Text>
                    <Text className="text-xs text-slate-700 flex-1 font-medium leading-4">
                      {item.note}
                    </Text>
                  </View>
                ) : null}
              </View>
            );
          }}
          ListEmptyComponent={
            <View className="py-14 items-center justify-center">
              <Text className="text-slate-400 text-xs font-semibold leading-5" numberOfLines={1}>কোনো লেনদেনের রেকর্ড নেই।</Text>
            </View>
          }
        />
      </View>

      <Modal transparent visible={modalVisible} animationType="fade">
        <TouchableWithoutFeedback onPress={closeModal}>
          <View className="flex-1 bg-black/30 justify-center items-center px-6">
            <TouchableWithoutFeedback>
              <View className="bg-white rounded-3xl p-5 w-full border border-slate-200 shadow-xl">
                <Text className="text-base font-black text-slate-900 mb-1 leading-6" numberOfLines={1}>
                  {editingId 
                    ? (actionType === 'payment' ? 'জমা রেকর্ড সম্পাদন' : 'বকেয়া রেকর্ড সম্পাদন')
                    : (actionType === 'payment' ? 'টাকা জমা এন্ট্রি' : 'সরাসরি বকেয়া যোগ')
                  }
                </Text>
                <Text className="text-xs text-slate-400 font-medium mb-4 leading-5" numberOfLines={2}>
                  {actionType === 'payment' ? 'বকেয়া কমাতে বা অগ্রিম রাখতে টাকার পরিমাণ লিখুন।' : 'খাদ্য ছাড়া অন্য কোনো বকেয়া যোগ করতে টাকার পরিমাণ লিখুন।'}
                </Text>

                <View className="mb-3">
                  <Text className="text-xs font-bold text-slate-700 uppercase mb-1.5 tracking-wider leading-5" numberOfLines={1}>
                    তারিখ
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowDatePicker(true)}
                    className="bg-slate-50 border border-slate-200 rounded-2xl h-12 px-3.5 flex-row items-center justify-between"
                    activeOpacity={0.7}
                  >
                    <Text className="text-sm font-bold text-slate-900 leading-6 flex-1 pr-2" numberOfLines={1}>
                      {selectedDate.toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </Text>
                    <Feather name="calendar" size={16} color="#059669" className="shrink-0" />
                  </TouchableOpacity>
                </View>

                {showDatePicker && (
                  <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    maximumDate={new Date()}
                    onValueChange={(_: any, date?: Date) => {
                      if (Platform.OS === 'android') setShowDatePicker(false);
                      if (date) setSelectedDate(date);
                    }}
                  />
                )}

                <View className="mb-3">
                  <Text className="text-xs font-bold text-slate-700 uppercase mb-1.5 tracking-wider leading-5" numberOfLines={1}>
                    টাকার পরিমাণ (৳)
                  </Text>
                  <TextInput
                    keyboardType="numeric"
                    placeholder="০.০০"
                    placeholderTextColor="#94a3b8"
                    value={amountInput}
                    onChangeText={(text) => setAmountInput(convertBanglaToEnglishNumber(text))}
                    className="bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-2xl h-11 px-3.5 text-sm font-bold text-slate-900 leading-5"
                  />
                </View>

                <View className="mb-4">
                  <Text className="text-xs font-bold text-slate-700 uppercase mb-1.5 tracking-wider leading-5" numberOfLines={1}>
                    নোট / বিবরণ (ঐচ্ছিক)
                  </Text>
                  <TextInput
                    placeholder="যেমন: পূর্বের বাকি বা ব্যাংক জমা"
                    placeholderTextColor="#94a3b8"
                    value={noteInput}
                    onChangeText={setNoteInput}
                    className="bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-2xl h-11 px-3.5 text-xs text-slate-900 leading-5"
                  />
                </View>

                <View className="flex-row gap-x-2.5">
                  <TouchableOpacity
                    onPress={closeModal}
                    className="w-[35%] bg-slate-200 h-11 rounded-xl justify-center items-center px-2 active:bg-slate-300 shrink-0"
                    activeOpacity={0.8}
                  >
                    <Text numberOfLines={1} className="text-slate-700 font-bold text-xs leading-5">বাতিল</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSaveTransaction}
                    disabled={submitting}
                    className={`flex-1 h-11 rounded-xl justify-center items-center px-3 shadow-xs ${actionType === 'payment' ? 'bg-emerald-600 shadow-emerald-200 active:bg-emerald-700' : 'bg-rose-600 shadow-rose-200 active:bg-rose-700'}`}
                    activeOpacity={0.8}
                  >
                    {submitting ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text numberOfLines={1} className="text-white font-black text-xs uppercase tracking-wider leading-5">
                        {editingId ? 'আপডেট করুন' : 'সংরক্ষণ করুন'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}