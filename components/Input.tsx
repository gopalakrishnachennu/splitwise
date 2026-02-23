import React, { useState } from 'react';
import {
  View, TextInput, Text, StyleSheet, TouchableOpacity,
  ViewStyle, TextInputProps, Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeColors } from '@/utils/hooks';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
  prefix?: string;
}

export const Input: React.FC<InputProps> = ({
  label, error, leftIcon, rightIcon, onRightIconPress,
  containerStyle, prefix, style, ...props
}) => {
  const colors = useThemeColors();
  const [focused, setFocused] = useState(false);

  return (
    <View style={[{ marginBottom: 16 }, containerStyle]}>
      {label && (
        <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      )}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.surface,
            borderColor: error ? colors.error : focused ? colors.primary : colors.border,
            borderWidth: focused ? 2 : 1,
          },
        ]}
      >
        {leftIcon && (
          <MaterialIcons
            name={leftIcon as any}
            size={20}
            color={focused ? colors.primary : colors.textTertiary}
            style={{ marginRight: 8 }}
          />
        )}
        {prefix && (
          <Text style={[styles.prefix, { color: colors.text }]}>{prefix}</Text>
        )}
        <TextInput
          style={[
            styles.input,
            { color: colors.text },
            Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {},
            style,
          ]}
          placeholderTextColor={colors.textTertiary}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />
        {rightIcon && (
          <TouchableOpacity onPress={onRightIconPress}>
            <MaterialIcons
              name={rightIcon as any}
              size={20}
              color={colors.textTertiary}
            />
          </TouchableOpacity>
        )}
      </View>
      {error && (
        <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 48,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
  },
  prefix: {
    fontSize: 16,
    fontWeight: '500',
    marginRight: 4,
  },
  error: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
});
