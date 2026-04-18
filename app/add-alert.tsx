import React, { useState } from 'react';
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
import { Bell, Lock } from 'phosphor-react-native';
import { COMMODITIES, type CommoditySymbol } from '@/constants/commodities';
import { useAlertsStore, type AlertConditionType } from '@/store/alertsStore';
import { useAuthStore } from '@/store/authStore';

const CONDITIONS: { label: string; value: AlertConditionType; description: string; prefix: string }[] = [
  { label: 'Price rises above', value: 'price_above', description: 'Alert when spot price exceeds target', prefix: '$' },
  { label: 'Price falls below', value: 'price_below', description: 'Alert when spot price drops below target', prefix: '$' },
  { label: '% increase', value: 'change_percent_up', description: 'Alert when price rises by this % vs previous fetch', prefix: '' },
  { label: '% decrease', value: 'change_percent_down', description: 'Alert when price falls by this % vs previous fetch', prefix: '' },
  { label: '$ increase', value: 'change_dollar_up', description: 'Alert when price increases by this dollar amount', prefix: '$' },
  { label: '$ decrease', value: 'change_dollar_down', description: 'Alert when price decreases by this dollar amount', prefix: '$' },
];

export default function AddAlertScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ symbol?: string }>();
  const addAlert = useAlertsStore((s) => s.addAlert);
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = !!user;

  const defaultSymbol = (params.symbol as CommoditySymbol) ?? 'XAU';

  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState<CommoditySymbol>(defaultSymbol);
  const [conditionType, setConditionType] = useState<AlertConditionType>('price_above');
  const [targetValue, setTargetValue] = useState('');
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [smsPhone, setSmsPhone] = useState('');
  const [emailEnabled, setEmailEnabled] = useState(false);

  const selectedCondition = CONDITIONS.find((c) => c.value === conditionType)!;
  const isPercentCondition = conditionType.includes('percent');

  async function handleSubmit() {
    const trimmedName = name.trim();
    const parsed = parseFloat(targetValue);

    if (!trimmedName) {
      Alert.alert('Validation', 'Please enter a name for this alert.');
      return;
    }
    if (isNaN(parsed) || parsed <= 0) {
      Alert.alert('Validation', 'Please enter a valid positive number for the target value.');
      return;
    }
    if (smsEnabled && smsPhone.replace(/[^\d]/g, '').length < 7) {
      Alert.alert('Validation', 'Please enter a valid phone number for SMS alerts.');
      return;
    }

    await addAlert({
      name: trimmedName,
      symbol,
      conditionType,
      targetValue: parsed,
      active: true,
      smsEnabled,
      smsPhone: smsPhone.trim(),
      emailEnabled: isAuthenticated && emailEnabled,
    });

    router.back();
  }

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
            placeholder='e.g. "Gold above $2100"'
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
                style={[
                  styles.pill,
                  symbol === c.symbol && styles.pillSelected,
                ]}
                onPress={() => setSymbol(c.symbol)}
              >
                <Text
                  style={[
                    styles.pillText,
                    symbol === c.symbol && styles.pillTextSelected,
                  ]}
                >
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
                <View
                  style={[
                    styles.radio,
                    conditionType === c.value && styles.radioSelected,
                  ]}
                >
                  {conditionType === c.value && (
                    <View style={styles.radioDot} />
                  )}
                </View>
                <View>
                  <Text
                    style={[
                      styles.conditionLabel,
                      conditionType === c.value && styles.conditionLabelSelected,
                    ]}
                  >
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
            Target Value{' '}
            {isPercentCondition ? '(%)' : '(USD)'}
          </Text>
          <View style={styles.inputRow}>
            {selectedCondition.prefix ? (
              <Text style={styles.inputPrefix}>{selectedCondition.prefix}</Text>
            ) : null}
            <TextInput
              style={[styles.input, styles.inputFlex]}
              placeholder={isPercentCondition ? '5.00' : '2100.00'}
              placeholderTextColor={Colors.textMuted}
              value={targetValue}
              onChangeText={setTargetValue}
              keyboardType="decimal-pad"
              returnKeyType="done"
            />
            {isPercentCondition && (
              <Text style={styles.inputSuffix}>%</Text>
            )}
          </View>
        </View>

        {/* SMS Alert */}
        <View style={styles.section}>
          <Text style={styles.label}>SMS Alert</Text>
          {isAuthenticated ? (
            <>
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
            </>
          ) : (
            <View style={styles.lockedRow}>
              <Lock size={16} color={Colors.textMuted} weight="fill" />
              <Text style={styles.lockedText}>
                Sign in to unlock SMS &amp; email alerts
              </Text>
            </View>
          )}
        </View>

        {/* Email Alert */}
        <View style={styles.section}>
          <Text style={styles.label}>Email Alert</Text>
          {isAuthenticated ? (
            <View style={styles.smsToggleRow}>
              <View style={styles.smsToggleLeft}>
                <Text style={styles.smsToggleTitle}>Send email when triggered</Text>
                <Text style={styles.smsToggleSub}>Sent to your account email</Text>
              </View>
              <Switch
                value={emailEnabled}
                onValueChange={setEmailEnabled}
                trackColor={{ false: Colors.border, true: Colors.gold + '99' }}
                thumbColor={emailEnabled ? Colors.gold : Colors.textMuted}
              />
            </View>
          ) : (
            <View style={styles.lockedRow}>
              <Lock size={16} color={Colors.textMuted} weight="fill" />
              <Text style={styles.lockedText}>
                Sign in to unlock SMS &amp; email alerts
              </Text>
            </View>
          )}
        </View>

        {/* Submit */}
        <Pressable
          style={({ pressed }) => [styles.submitBtn, pressed && styles.submitBtnPressed]}
          onPress={handleSubmit}
        >
          <View style={styles.submitContent}>
            <Bell size={18} color={Colors.black} weight="fill" />
            <Text style={styles.submitText}>Create Alert</Text>
          </View>
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
  inputFlex: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderRadius: 0,
  },
  inputPrefix: {
    color: Colors.textMuted,
    fontSize: 18,
    paddingLeft: 14,
    paddingRight: 4,
  },
  inputSuffix: {
    color: Colors.textMuted,
    fontSize: 16,
    paddingRight: 14,
    paddingLeft: 4,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
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
  pillSelected: {
    backgroundColor: Colors.gold + '22',
    borderColor: Colors.gold,
  },
  pillEmoji: { fontSize: 18 },
  pillText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  pillTextSelected: {
    color: Colors.gold,
  },
  conditionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  conditionCardSelected: {
    borderColor: Colors.gold,
    backgroundColor: Colors.gold + '12',
  },
  conditionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: Colors.gold,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.gold,
  },
  conditionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  conditionLabelSelected: {
    color: Colors.gold,
  },
  conditionDesc: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
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
  submitContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitBtnPressed: {
    opacity: 0.85,
  },
  submitText: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.black,
  },
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
  lockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  lockedText: {
    fontSize: 14,
    color: Colors.textMuted,
    flex: 1,
  },
});
