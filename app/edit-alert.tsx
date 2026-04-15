import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/colors';
import { COMMODITIES, type CommoditySymbol } from '@/constants/commodities';
import { useAlertsStore, type AlertConditionType } from '@/store/alertsStore';

const CONDITIONS: { label: string; value: AlertConditionType; description: string; prefix: string }[] = [
  { label: 'Price rises above', value: 'price_above', description: 'Alert when spot price exceeds target', prefix: '$' },
  { label: 'Price falls below', value: 'price_below', description: 'Alert when spot price drops below target', prefix: '$' },
  { label: '% increase', value: 'change_percent_up', description: 'Alert when price rises by this %', prefix: '' },
  { label: '% decrease', value: 'change_percent_down', description: 'Alert when price falls by this %', prefix: '' },
  { label: '$ increase', value: 'change_dollar_up', description: 'Alert when price increases by this amount', prefix: '$' },
  { label: '$ decrease', value: 'change_dollar_down', description: 'Alert when price decreases by this amount', prefix: '$' },
];

export default function EditAlertScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const { alerts, updateAlert } = useAlertsStore();

  const alert = alerts.find((a) => a.id === params.id);

  const [name, setName] = useState(alert?.name ?? '');
  const [symbol, setSymbol] = useState<CommoditySymbol>(alert?.symbol ?? 'XAU');
  const [conditionType, setConditionType] = useState<AlertConditionType>(
    alert?.conditionType ?? 'price_above'
  );
  const [targetValue, setTargetValue] = useState(
    alert?.targetValue?.toString() ?? ''
  );
  const [smsEnabled, setSmsEnabled] = useState(alert?.smsEnabled ?? false);
  const [smsPhone, setSmsPhone] = useState(alert?.smsPhone ?? '');

  useEffect(() => {
    if (!alert) {
      router.back();
    }
  }, [alert, router]);

  const selectedCondition = CONDITIONS.find((c) => c.value === conditionType)!;
  const isPercentCondition = conditionType.includes('percent');

  async function handleSave() {
    const trimmedName = name.trim();
    const parsed = parseFloat(targetValue);

    if (!trimmedName) {
      Alert.alert('Validation', 'Please enter a name for this alert.');
      return;
    }
    if (isNaN(parsed) || parsed <= 0) {
      Alert.alert('Validation', 'Please enter a valid positive number.');
      return;
    }
    if (smsEnabled && smsPhone.replace(/[^\d]/g, '').length < 7) {
      Alert.alert('Validation', 'Please enter a valid phone number for SMS alerts.');
      return;
    }
    if (!params.id) return;

    await updateAlert(params.id, {
      name: trimmedName,
      symbol,
      conditionType,
      targetValue: parsed,
      smsEnabled,
      smsPhone: smsPhone.trim(),
    });

    router.back();
  }

  if (!alert) return null;

  return (
    <KeyboardAvoidingView
      style={styles.kav}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Alert Name */}
        <View style={styles.section}>
          <Text style={styles.label}>Alert Name</Text>
          <TextInput
            style={styles.input}
            placeholderTextColor={Colors.textMuted}
            value={name}
            onChangeText={setName}
            returnKeyType="next"
          />
        </View>

        {/* Commodity Selector */}
        <View style={styles.section}>
          <Text style={styles.label}>Commodity</Text>
          <View style={styles.pillRow}>
            {COMMODITIES.map((c) => (
              <Pressable
                key={c.symbol}
                style={[styles.pill, symbol === c.symbol && styles.pillSelected]}
                onPress={() => setSymbol(c.symbol)}
              >
                <Text style={[styles.pillText, symbol === c.symbol && styles.pillTextSelected]}>
                  {c.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Condition Type */}
        <View style={styles.section}>
          <Text style={styles.label}>Condition</Text>
          {CONDITIONS.map((c) => (
            <Pressable
              key={c.value}
              style={[
                styles.conditionCard,
                conditionType === c.value && styles.conditionCardSelected,
              ]}
              onPress={() => setConditionType(c.value)}
            >
              <View style={styles.conditionLeft}>
                <View style={[styles.radio, conditionType === c.value && styles.radioSelected]}>
                  {conditionType === c.value && <View style={styles.radioDot} />}
                </View>
                <View>
                  <Text style={[styles.conditionLabel, conditionType === c.value && styles.conditionLabelSelected]}>
                    {c.label}
                  </Text>
                  <Text style={styles.conditionDesc}>{c.description}</Text>
                </View>
              </View>
            </Pressable>
          ))}
        </View>

        {/* Target Value */}
        <View style={styles.section}>
          <Text style={styles.label}>
            Target Value {isPercentCondition ? '(%)' : '(USD)'}
          </Text>
          <View style={styles.inputRow}>
            {selectedCondition.prefix ? (
              <Text style={styles.inputPrefix}>{selectedCondition.prefix}</Text>
            ) : null}
            <TextInput
              style={[styles.input, styles.inputFlex]}
              placeholderTextColor={Colors.textMuted}
              value={targetValue}
              onChangeText={setTargetValue}
              keyboardType="decimal-pad"
              returnKeyType="done"
            />
            {isPercentCondition && <Text style={styles.inputSuffix}>%</Text>}
          </View>
        </View>

        {/* SMS Alert */}
        <View style={styles.section}>
          <Text style={styles.label}>SMS Alert</Text>
          <View style={styles.smsToggleRow}>
            <View style={styles.smsToggleLeft}>
              <Text style={styles.smsToggleTitle}>Send SMS when triggered</Text>
              <Text style={styles.smsToggleSub}>Free via TextBelt · 1 SMS/day</Text>
            </View>
            <Switch
              value={smsEnabled}
              onValueChange={setSmsEnabled}
              trackColor={{ false: Colors.border, true: Colors.gold + '99' }}
              thumbColor={smsEnabled ? Colors.gold : Colors.textMuted}
            />
          </View>
          {smsEnabled && (
            <TextInput
              style={[styles.input, { marginTop: 12 }]}
              placeholder="Phone number (e.g. +14155552671)"
              placeholderTextColor={Colors.textMuted}
              value={smsPhone}
              onChangeText={setSmsPhone}
              keyboardType="phone-pad"
              returnKeyType="done"
              autoComplete="tel"
            />
          )}
        </View>

        {/* Save */}
        <Pressable
          style={({ pressed }) => [styles.submitBtn, pressed && styles.submitBtnPressed]}
          onPress={handleSave}
        >
          <Text style={styles.submitText}>Save Changes ✓</Text>
        </Pressable>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  kav: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 16 },
  section: { marginBottom: 24 },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.textPrimary,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputFlex: { flex: 1, backgroundColor: 'transparent', borderWidth: 0, borderRadius: 0 },
  inputPrefix: { color: Colors.textMuted, fontSize: 18, paddingLeft: 14, paddingRight: 4 },
  inputSuffix: { color: Colors.textMuted, fontSize: 16, paddingRight: 14, paddingLeft: 4 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 30,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pillSelected: { backgroundColor: Colors.gold + '22', borderColor: Colors.gold },
  pillEmoji: { fontSize: 18 },
  pillText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  pillTextSelected: { color: Colors.gold },
  conditionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  conditionCardSelected: { borderColor: Colors.gold, backgroundColor: Colors.gold + '12' },
  conditionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: Colors.gold },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.gold },
  conditionLabel: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  conditionLabelSelected: { color: Colors.gold },
  conditionDesc: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  submitBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitBtnPressed: { opacity: 0.85 },
  submitText: { fontSize: 17, fontWeight: '800', color: Colors.black },
  smsToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  smsToggleLeft: {
    flex: 1,
    marginRight: 12,
  },
  smsToggleTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  smsToggleSub: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
