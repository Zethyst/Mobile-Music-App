import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Animated,
  Easing,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/FontAwesome5';
import LinearGradient from 'react-native-linear-gradient';
import { launchImageLibrary } from 'react-native-image-picker';
import { COLORS } from '../constants';
import { hapticLight, hapticMedium } from '../utils/haptics';
import type { Playlist } from '../services/playlistService';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSave: (data: { name: string; description?: string; coverUri?: string }) => Promise<void>;
  /** Pass existing playlist to edit mode */
  editingPlaylist?: Playlist | null;
};

export default function CreatePlaylistModal({ visible, onClose, onSave, editingPlaylist }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [coverUri, setCoverUri] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const isEdit = !!editingPlaylist;

  // Populate fields when editing
  useEffect(() => {
    if (visible) {
      if (editingPlaylist) {
        setName(editingPlaylist.name);
        setDescription(editingPlaylist.description ?? '');
        setCoverUri(editingPlaylist.coverUri);
      } else {
        setName('');
        setDescription('');
        setCoverUri(undefined);
      }
      // Animate in
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(0);
    }
  }, [visible, editingPlaylist]);

  const close = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => onClose());
    hapticLight();
  };

  const pickImage = async () => {
    hapticLight();
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        selectionLimit: 1,
      });
      if (result.assets?.[0]?.uri) {
        setCoverUri(result.assets[0].uri);
        hapticMedium();
      }
    } catch {
      Alert.alert('Could not open gallery', 'Please grant photo library access in Settings.');
    }
  };

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Name required', 'Please give your playlist a name.');
      return;
    }
    hapticMedium();
    setSaving(true);
    try {
      await onSave({
        name: trimmed,
        description: description.trim() || undefined,
        coverUri,
      });
      close();
    } catch {
      Alert.alert('Error', 'Could not save playlist. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [120, 0],
  });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={close} statusBarTranslucent>
      <View style={StyleSheet.absoluteFill}>
        <Animated.View style={[StyleSheet.absoluteFill, ms.backdrop, { opacity: fadeAnim }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={close} activeOpacity={1} />
        </Animated.View>

        <KeyboardAvoidingView
          style={ms.kavWrap}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}>
          <Animated.View
            style={[
              ms.sheet,
              { paddingBottom: 20 + insets.bottom, transform: [{ translateY }], opacity: fadeAnim },
            ]}
            pointerEvents="box-none">
            <ScrollView
              ref={scrollRef}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
              {...(Platform.OS === 'ios'
                ? { contentInsetAdjustmentBehavior: 'never' as const }
                : {})}
              contentContainerStyle={ms.scrollContent}>

            {/* Header */}
            <View style={ms.header}>
              <Text style={ms.headerTitle}>{isEdit ? 'Edit Playlist' : 'New Playlist'}</Text>
              <TouchableOpacity onPress={close} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Icon name="times" size={18} color={COLORS.textLight} />
              </TouchableOpacity>
            </View>

            {/* Cover image picker */}
            <TouchableOpacity style={ms.coverPicker} onPress={pickImage} activeOpacity={0.8}>
              {coverUri ? (
                <>
                  <Image source={{ uri: coverUri }} style={ms.coverImage} />
                  <View style={ms.coverOverlay}>
                    <Icon name="camera" size={20} color="#fff" />
                    <Text style={ms.coverOverlayText}>Change photo</Text>
                  </View>
                </>
              ) : (
                <LinearGradient
                  colors={['#e8e0f8', '#f3effd']}
                  style={ms.coverPlaceholder}>
                  <Icon name="music" size={32} color={COLORS.primary} />
                  <Text style={ms.coverPlaceholderText}>Add cover photo</Text>
                  <View style={ms.coverCameraIcon}>
                    <Icon name="camera" size={12} color="#fff" />
                  </View>
                </LinearGradient>
              )}
            </TouchableOpacity>

            {/* Name input */}
            <Text style={ms.label}>Playlist name *</Text>
            <TextInput
              style={ms.input}
              placeholder="My awesome playlist"
              placeholderTextColor={COLORS.textLight}
              value={name}
              onChangeText={setName}
              maxLength={60}
              returnKeyType="next"
              autoFocus={Platform.OS === 'android' && !isEdit}
              onFocus={() => {
                if (Platform.OS === 'ios') {
                  setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 100);
                }
              }}
            />

            {/* Description input */}
            <Text style={ms.label}>Description</Text>
            <TextInput
              style={[ms.input, ms.inputMultiline]}
              placeholder="What's this playlist about?"
              placeholderTextColor={COLORS.textLight}
              value={description}
              onChangeText={setDescription}
              maxLength={200}
              multiline
              numberOfLines={3}
              returnKeyType="done"
              onFocus={() => {
                if (Platform.OS === 'ios') {
                  setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
                }
              }}
            />

            {/* Save button */}
            <TouchableOpacity
              onPress={() => void handleSave()}
              activeOpacity={0.85}
              disabled={saving}
              style={ms.saveBtn}>
              <LinearGradient
                colors={[COLORS.primary, COLORS.secondary ?? '#12ccd0']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={ms.saveBtnGradient}>
                <Text style={ms.saveBtnText}>{saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create playlist'}</Text>
              </LinearGradient>
            </TouchableOpacity>

            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const ms = StyleSheet.create({
  kavWrap: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
  },
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    width: '100%',
    maxHeight: '92%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1a1a2e',
    letterSpacing: 0.2,
  },
  coverPicker: {
    alignSelf: 'center',
    marginBottom: 24,
    width: 140,
    height: 140,
    borderRadius: 16,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.42)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  coverOverlayText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  coverPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(108,92,231,0.2)',
    borderStyle: 'dashed',
    borderRadius: 16,
  },
  coverPlaceholderText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
  coverCameraIcon: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textLight,
    marginBottom: 6,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#f7f5ff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#1a1a2e',
    fontSize: 15,
    borderWidth: 1,
    borderColor: 'rgba(108,92,231,0.15)',
    marginBottom: 16,
  },
  inputMultiline: {
    height: 80,
    textAlignVertical: 'top',
  },
  saveBtn: {
    marginTop: 8,
    borderRadius: 14,
    overflow: 'hidden',
  },
  saveBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});