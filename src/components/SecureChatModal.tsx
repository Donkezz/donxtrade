import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, TextInput, Pressable, ScrollView, Modal, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SymbolView } from 'expo-symbols';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';

import { ThemedText } from './themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/context/AppContext';

interface SecureChatModalProps {
  visible: boolean;
  listingId: string;
  onClose: () => void;
}

const ChatVideoPlayer = ({ uri }: { uri: string }) => {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  return (
    <VideoView
      style={styles.chatVideo}
      player={player}
    />
  );
};

export const SecureChatModal: React.FC<SecureChatModalProps> = ({ visible, listingId, onClose }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { chats, sendMessage, listings } = useApp();
  const [inputText, setInputText] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<{ uri: string; type: 'image' | 'video' } | null>(null);
  
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Find current chat conversation
  const chat = chats.find((c) => c.listingId === listingId);
  const listing = listings.find((l) => l.id === listingId);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [visible, chat?.messages.length, chat?.isTyping]);

  const handlePickMedia = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('common.warning'), t('create.mediaLimitText'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setSelectedMedia({
        uri: asset.uri,
        type: asset.type === 'video' ? 'video' : 'image',
      });
    }
  };

  const handleSend = () => {
    if (!inputText.trim() && !selectedMedia) return;
    sendMessage(listingId, inputText.trim(), selectedMedia || undefined);
    setInputText('');
    setSelectedMedia(null);
  };

  if (!listing) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.container, { backgroundColor: theme.background }]}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.backgroundSelected }]}>
          <View style={styles.headerTitleContainer}>
            <View style={styles.onlineBadge}>
              <View style={styles.onlineDot} />
              <ThemedText type="smallBold" style={styles.participantName}>
                {listing.isAnonymous ? t('profile.anonymousUser') : listing.ownerName}
              </ThemedText>
            </View>
            <ThemedText type="small" themeColor="textSecondary" style={styles.listingTitle} numberOfLines={1}>
              {listing.title}
            </ThemedText>
          </View>

          <Pressable 
            onPress={onClose}
            style={({ pressed }) => [styles.closeButton, { backgroundColor: theme.backgroundElement }, pressed && styles.pressed]}
          >
            <SymbolView
              tintColor={theme.text}
              name={{ ios: 'xmark', android: 'close', web: 'close' }}
              size={16}
            />
          </Pressable>
        </View>

        {/* Security Banner */}
        <View style={[styles.securityBanner, { backgroundColor: theme.backgroundElement }]}>
          <SymbolView
            tintColor="#38B000"
            name={{ ios: 'lock.shield.fill', android: 'security', web: 'security' }}
            size={14}
            style={{ marginRight: Spacing.two }}
          />
          <ThemedText type="small" themeColor="textSecondary" style={styles.securityText}>
            {t('chat.securityBanner', 'Tento chat je bezpečne šifrovaný. Nikto iný nemá prístup k vašej komunikácii.')}
          </ThemedText>
        </View>

        {/* Messages List */}
        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.messageList}
        >
          {chat?.messages.length === 0 ? (
            <View style={styles.emptyContainer}>
              <ThemedText type="small" themeColor="textSecondary">{t('chat.emptyChat')}</ThemedText>
            </View>
          ) : (
            chat?.messages.map((msg) => {
              const isMe = msg.sender === 'me';
              return (
                <View
                  key={msg.id}
                  style={[
                    styles.messageRow,
                    isMe ? styles.messageRowMe : styles.messageRowThem
                  ]}
                >
                  <View
                    style={[
                      styles.bubble,
                      isMe 
                        ? [styles.bubbleMe, { backgroundColor: theme.text }] 
                        : [styles.bubbleThem, { backgroundColor: theme.backgroundElement }]
                    ]}
                  >
                    {/* Media Attachment Rendering */}
                    {msg.mediaUri && (
                      <View style={styles.bubbleMediaContainer}>
                        {msg.mediaType === 'image' ? (
                          <Image source={{ uri: msg.mediaUri }} style={styles.bubbleImage} />
                        ) : (
                          <ChatVideoPlayer uri={msg.mediaUri} />
                        )}
                      </View>
                    )}

                    {msg.text.length > 0 && (
                      <ThemedText
                        type="small"
                        style={{ color: isMe ? theme.background : theme.text }}
                      >
                        {msg.text}
                      </ThemedText>
                    )}
                    
                    <ThemedText
                      type="small"
                      style={[
                        styles.timestamp,
                        { color: isMe ? theme.background + 'A0' : theme.textSecondary }
                      ]}
                    >
                      {msg.timestamp}
                    </ThemedText>
                  </View>
                </View>
              );
            })
          )}

          {/* Typing Indicator */}
          {chat?.isTyping && (
            <Animated.View 
              entering={FadeIn}
              style={[styles.messageRow, styles.messageRowThem]}
            >
              <View style={[styles.bubble, styles.bubbleThem, { backgroundColor: theme.backgroundElement, paddingVertical: Spacing.two }]}>
                <View style={styles.typingContainer}>
                  <View style={[styles.typingDot, { backgroundColor: theme.textSecondary }]} />
                  <View style={[styles.typingDot, { backgroundColor: theme.textSecondary, marginHorizontal: 3 }]} />
                  <View style={[styles.typingDot, { backgroundColor: theme.textSecondary }]} />
                </View>
              </View>
            </Animated.View>
          )}
        </ScrollView>

        {/* Selected Media Preview Bar */}
        {selectedMedia && (
          <View style={[styles.previewBar, { backgroundColor: theme.backgroundElement, borderTopColor: theme.backgroundSelected }]}>
            <View style={[styles.previewThumbnailWrapper, { borderColor: theme.backgroundSelected }]}>
              <Image source={{ uri: selectedMedia.uri }} style={styles.previewThumbnail} />
              {selectedMedia.type === 'video' && (
                <View style={styles.previewVideoIcon}>
                  <SymbolView tintColor="#ffffff" name={{ ios: 'play.fill', web: 'play_arrow' }} size={8} />
                </View>
              )}
            </View>
            <Pressable
              onPress={() => setSelectedMedia(null)}
              style={({ pressed }) => [styles.previewCloseBtn, pressed && { opacity: 0.7 }]}
            >
              <SymbolView tintColor={theme.textSecondary} name={{ ios: 'xmark.circle.fill', web: 'cancel' }} size={20} />
            </Pressable>
          </View>
        )}

        {/* Input Bar */}
        <View style={[styles.inputBar, { borderTopColor: theme.backgroundSelected, backgroundColor: theme.background }]}>
          <Pressable
            onPress={handlePickMedia}
            style={({ pressed }) => [styles.attachButton, pressed && { opacity: 0.7 }]}
          >
            <SymbolView
              tintColor={theme.text}
              name={{ ios: 'plus.circle.fill', web: 'add_circle' }}
              size={22}
            />
          </Pressable>
          
          <TextInput
            placeholder={t('chat.inputPlaceholder')}
            placeholderTextColor={theme.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleSend}
            style={[styles.inputField, { backgroundColor: theme.backgroundElement, color: theme.text }]}
          />
          <Pressable
            onPress={handleSend}
            disabled={!inputText.trim() && !selectedMedia}
            style={({ pressed }) => [
              styles.sendButton,
              { backgroundColor: theme.text },
              pressed && { opacity: 0.8 },
              (!inputText.trim() && !selectedMedia) && { opacity: 0.4 }
            ]}
          >
            <SymbolView
              tintColor={theme.background}
              name={{ ios: 'paperplane.fill', android: 'send', web: 'send' }}
              size={14}
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
    ...Platform.select({
      ios: { paddingTop: Spacing.four },
    }),
  },
  headerTitleContainer: {
    flex: 1,
    marginRight: Spacing.three,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#38B000',
    marginRight: Spacing.two,
  },
  participantName: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  listingTitle: {
    fontSize: 12,
    marginTop: Spacing.half,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  securityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  securityText: {
    fontSize: 11,
    flex: 1,
    lineHeight: 14,
  },
  messageList: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.five,
  },
  messageRow: {
    flexDirection: 'row',
    width: '100%',
  },
  messageRowMe: {
    justifyContent: 'flex-end',
  },
  messageRowThem: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '75%',
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  bubbleMe: {
    borderBottomRightRadius: Spacing.one,
  },
  bubbleThem: {
    borderBottomLeftRadius: Spacing.one,
  },
  bubbleMediaContainer: {
    marginBottom: Spacing.one,
    borderRadius: Spacing.two,
    overflow: 'hidden',
  },
  bubbleImage: {
    width: 180,
    height: 180,
  },
  chatVideo: {
    width: 180,
    height: 180,
  },
  timestamp: {
    fontSize: 9,
    alignSelf: 'flex-end',
    marginTop: Spacing.one,
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 12,
    paddingHorizontal: Spacing.one,
  },
  typingDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  previewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderTopWidth: 1,
  },
  previewThumbnailWrapper: {
    position: 'relative',
    width: 50,
    height: 50,
    borderRadius: Spacing.one,
    overflow: 'hidden',
    borderWidth: 1,
  },
  previewThumbnail: {
    width: '100%',
    height: '100%',
  },
  previewVideoIcon: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 4,
    padding: 2,
  },
  previewCloseBtn: {
    padding: Spacing.one,
  },
  inputBar: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderTopWidth: 1,
    gap: Spacing.two,
    alignItems: 'center',
    ...Platform.select({
      android: { paddingBottom: Spacing.three },
    }),
  },
  attachButton: {
    padding: Spacing.one,
  },
  inputField: {
    flex: 1,
    borderRadius: Spacing.four,
    paddingHorizontal: Spacing.three,
    paddingVertical: Platform.OS === 'ios' ? Spacing.two : Spacing.one,
    fontSize: 14,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      } as any,
    }),
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
