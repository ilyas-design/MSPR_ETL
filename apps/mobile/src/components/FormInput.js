import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radius, spacing } from '../theme';

export default function FormInput({
  label,
  hint,
  error,
  style,
  inputStyle,
  onFocus,
  onBlur,
  ...props
}) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.field, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        style={[
          styles.input,
          focused && styles.inputFocused,
          error && styles.inputError,
          inputStyle,
        ]}
        placeholderTextColor={colors.textMuted}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...props}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.xs },
  label: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 2,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    color: colors.text,
    fontSize: 16,
  },
  inputFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceAlt,
  },
  inputError: { borderColor: colors.danger },
  hint: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginLeft: 2 },
  error: { color: colors.danger, fontSize: 13, marginLeft: 2 },
});
