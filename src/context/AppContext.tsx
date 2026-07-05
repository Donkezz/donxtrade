import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import i18n from '@/i18n';

export type ListingCategory = 'anything' | 'clothing' | 'material' | 'kids' | 'men' | 'women' | 'service' | 'meeting' | 'tickets' | 'electronics' | 'home' | 'pets' | 'sport' | 'auto';
export type ListingType = 'supply' | 'demand';
export type ContactType = 'chat' | 'phone';

export interface ListingMedia {
  uri: string;
  type: 'image' | 'video';
}

export interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  originalPrice?: number;
  category: ListingCategory;
  type: ListingType;
  location: string;
  latitude?: number;
  longitude?: number;
  expiresAt: string; // ISO string representing expiry
  createdAt: string;
  isAnonymous: boolean;
  ownerName: string;
  contactType: ContactType;
  contactInfo: string; // Phone/Telegram or "Súkromný chat Donx"
  media?: ListingMedia[];
  isMine?: boolean; // True if created by current user
  isDemo?: boolean; // True if initial mock listing
  likes: number;
  isLiked: boolean;
}

export interface Message {
  id: string;
  sender: 'me' | 'them';
  text: string;
  timestamp: string;
  mediaUri?: string;
  mediaType?: 'image' | 'video';
}

export interface ChatConversation {
  listingId: string;
  listingTitle: string;
  participantName: string;
  messages: Message[];
  isTyping?: boolean;
}

export interface Transaction {
  id: string;
  type: 'bonus' | 'topup' | 'unlock' | 'create';
  amount: number;
  timestamp: string;
  listingTitle?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
}

interface AppContextType {
  listings: Listing[];
  unlockedListings: string[];
  walletBalance: number;
  unlockFee: number;
  chats: ChatConversation[];
  transactions: Transaction[];
  lastClaimedBonus: string | null;
  appLanguage: string;
  appTheme: 'light' | 'dark' | 'system';
  createListing: (listing: Omit<Listing, 'id' | 'createdAt' | 'isMine' | 'likes' | 'isLiked'>) => Promise<void>;
  deleteListing: (id: string) => Promise<void>;
  unlockContact: (id: string) => Promise<boolean>;
  topUpWallet: (amount?: number) => Promise<void>;
  startChat: (listingId: string, listingTitle: string, participantName: string) => Promise<void>;
  sendMessage: (listingId: string, text: string, media?: ListingMedia) => Promise<void>;
  claimDailyBonus: (amount: number) => Promise<boolean>; // returns true if claimed successfully
  setAppLanguage: (lang: string) => Promise<void>;
  setAppTheme: (theme: 'light' | 'dark' | 'system') => Promise<void>;
  resetAllData: () => Promise<void>;
  toggleLike: (listingId: string) => Promise<void>;
  
  // Auth
  currentUser: User | null;
  login: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoginVisible: boolean;
  setLoginVisible: (visible: boolean) => void;
  requireAuth: (callback: () => void) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  LISTINGS: '@donx_listings',
  UNLOCKED: '@donx_unlocked',
  BALANCE: '@donx_balance',
  CHATS: '@donx_chats',
  LAST_BONUS: '@donx_last_bonus',
  TRANSACTIONS: '@donx_transactions',
  LANGUAGE: '@donx_language',
  THEME: '@donx_theme',
  USER: '@donx_user',
};

const getInitialListings = (): Listing[] => {
  const now = Date.now();
  return [
    {
      id: '1',
      title: 'Celodenný skipas Jasná (zvyšok dňa)',
      description: 'Končím skôr, skipas je platný na celé stredisko Jasná Chopok do konca dňa (16:00). Odovzdám priamo na parkovisku Biela Púť.',
      price: 15,
      originalPrice: 59,
      category: 'sport',
      type: 'supply',
      location: 'Jasná - Chopok',
      expiresAt: new Date(now + 4 * 3600 * 1000).toISOString(), // 4 hours from now
      createdAt: new Date(now - 3600000).toISOString(),
      isAnonymous: true,
      ownerName: 'Anonymný Lyžiar',
      contactType: 'chat',
      contactInfo: 'Súkromný chat Donx',
      isDemo: true,
      isMine: true,
      likes: 12,
      isLiked: false,
    },
    {
      id: '2',
      title: 'Dopyt: 2x lístok na koncert IMT Smile v Prešove',
      description: 'Kúpim dva lístky na dnešný večerný koncert v Prešove. Platba v hotovosti alebo na účet pri prevzatí lístkov.',
      price: 25,
      category: 'tickets',
      type: 'demand',
      location: 'Prešov, Amfiteáter',
      expiresAt: new Date(now + 8 * 3600 * 1000).toISOString(), // 8 hours from now
      createdAt: new Date(now - 7200000).toISOString(),
      isAnonymous: false,
      ownerName: 'Martin S.',
      contactType: 'phone',
      contactInfo: '+421 905 123 456',
      isDemo: true,
      isMine: true,
      likes: 3,
      isLiked: true,
    },
    {
      id: '3',
      title: 'Permanentka na plaváreň Žilina (ostáva 5 vstupov)',
      description: 'Predám čipovú permanentku na plaváreň v Žiline. Platnosť je neobmedzená, ostalo na nej ešte 5 vstupov. Osobný odber v centre.',
      price: 12,
      originalPrice: 20,
      category: 'service',
      type: 'supply',
      location: 'Žilina, Mtská krytá plaváreň',
      expiresAt: new Date(now + 72 * 3600 * 1000).toISOString(), // 3 days from now
      createdAt: new Date(now - 14400000).toISOString(),
      isAnonymous: false,
      ownerName: 'Zuzana K.',
      contactType: 'chat',
      contactInfo: 'Súkromný chat Donx',
      isDemo: true,
      isMine: true,
      likes: 8,
      isLiked: false,
    },
    {
      id: '4',
      title: 'Parťák na večerný beh (Chopok / Jasná)',
      description: 'Hľadám niekoho na stredne rýchly beh okolo Vrbického plesa dnes večer. Príjemný pokec a spoločné tempo.',
      price: 0,
      category: 'meeting',
      type: 'demand',
      location: 'Vrbické pleso',
      expiresAt: new Date(now + 2 * 3600 * 1000).toISOString(), // 2 hours from now
      createdAt: new Date(now - 1800000).toISOString(),
      isAnonymous: false,
      ownerName: 'Peter B.',
      contactType: 'phone',
      contactInfo: 'peter.beh@gmail.com',
      isDemo: true,
      isMine: true,
      likes: 4,
      isLiked: false,
    }
  ];
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [unlockedListings, setUnlockedListings] = useState<string[]>([]);
  const [walletBalance, setWalletBalance] = useState<number>(50);
  const [chats, setChats] = useState<ChatConversation[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [lastClaimedBonus, setLastClaimedBonus] = useState<string | null>(null);
  
  const [appLanguage, setAppLanguageState] = useState<string>('sk');
  const [appTheme, setAppThemeState] = useState<'light' | 'dark' | 'system'>('system');

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoginVisible, setLoginVisible] = useState(false);
  
  const unlockFee = 1;

  // Load state from AsyncStorage
  useEffect(() => {
    const loadState = async () => {
      try {
        const storedListings = await AsyncStorage.getItem(STORAGE_KEYS.LISTINGS);
        const storedUnlocked = await AsyncStorage.getItem(STORAGE_KEYS.UNLOCKED);
        const storedBalance = await AsyncStorage.getItem(STORAGE_KEYS.BALANCE);
        const storedChats = await AsyncStorage.getItem(STORAGE_KEYS.CHATS);
        const storedLastBonus = await AsyncStorage.getItem(STORAGE_KEYS.LAST_BONUS);
        const storedTransactions = await AsyncStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
        const storedLanguage = await AsyncStorage.getItem(STORAGE_KEYS.LANGUAGE);
        const storedTheme = await AsyncStorage.getItem(STORAGE_KEYS.THEME);
        const storedUser = await AsyncStorage.getItem(STORAGE_KEYS.USER);

        const initialListings = getInitialListings();

        if (storedListings) {
          setListings(JSON.parse(storedListings));
        } else {
          setListings(initialListings);
          await AsyncStorage.setItem(STORAGE_KEYS.LISTINGS, JSON.stringify(initialListings));
        }

        if (storedUnlocked) {
          setUnlockedListings(JSON.parse(storedUnlocked));
        } else {
          setUnlockedListings([]);
        }

        if (storedBalance) {
          setWalletBalance(parseFloat(storedBalance));
        } else {
          setWalletBalance(50);
          await AsyncStorage.setItem(STORAGE_KEYS.BALANCE, '50');
        }

        if (storedChats) {
          setChats(JSON.parse(storedChats));
        } else {
          setChats([]);
        }

        if (storedLastBonus) {
          setLastClaimedBonus(storedLastBonus);
        } else {
          setLastClaimedBonus(null);
        }

        if (storedTransactions) {
          setTransactions(JSON.parse(storedTransactions));
        } else {
          setTransactions([]);
        }

        // Initialize Language
        const locales = Localization.getLocales();
        const systemLanguage = locales && locales.length > 0 ? locales[0].languageCode : 'sk';
        const activeLanguage = storedLanguage || systemLanguage || 'sk';
        const supportedLanguage = ['sk', 'en', 'pl', 'hu', 'uk'].includes(activeLanguage) ? activeLanguage : 'sk';
        
        setAppLanguageState(supportedLanguage);
        await i18n.changeLanguage(supportedLanguage);

        if (storedTheme) {
          setAppThemeState(storedTheme as any);
        } else {
          setAppThemeState('system');
        }

        if (storedUser) {
          setCurrentUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error('Failed to load state from storage:', error);
      }
    };

    loadState();
  }, []);

  // Action: Set Language
  const setAppLanguage = async (lang: string) => {
    try {
      setAppLanguageState(lang);
      await i18n.changeLanguage(lang);
      await AsyncStorage.setItem(STORAGE_KEYS.LANGUAGE, lang);
    } catch (error) {
      console.error('Failed to set language:', error);
    }
  };

  // Action: Set Theme
  const setAppTheme = async (themeValue: 'light' | 'dark' | 'system') => {
    try {
      setAppThemeState(themeValue);
      await AsyncStorage.setItem(STORAGE_KEYS.THEME, themeValue);
    } catch (error) {
      console.error('Failed to set theme:', error);
    }
  };

  // Auth Actions
  const login = async (email: string) => {
    const user: User = {
      id: Math.random().toString(),
      email,
      name: email.split('@')[0],
      role: email.toLowerCase() === 'admin' ? 'admin' : 'user',
    };
    setCurrentUser(user);
    setLoginVisible(false);
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  };

  const logout = async () => {
    setCurrentUser(null);
    await AsyncStorage.removeItem(STORAGE_KEYS.USER);
  };

  const requireAuth = (callback: () => void) => {
    if (currentUser) {
      callback();
    } else {
      setLoginVisible(true);
    }
  };

  const createListing = async (newListingData: Omit<Listing, 'id' | 'createdAt' | 'isMine' | 'likes' | 'isLiked'>) => {
    try {
      const newListing: Listing = {
        ...newListingData,
        id: Math.random().toString(36).substring(2, 9),
        createdAt: new Date().toISOString(),
        isMine: true, // Flag this user created it
        likes: 0,
        isLiked: false,
      };
      
      const updatedListings = [newListing, ...listings];
      setListings(updatedListings);
      await AsyncStorage.setItem(STORAGE_KEYS.LISTINGS, JSON.stringify(updatedListings));

      // Log Transaction
      const newTx: Transaction = {
        id: Math.random().toString(),
        type: 'create',
        amount: 0.00,
        timestamp: new Date().toISOString(),
        listingTitle: newListing.title
      };
      const updatedTxs = [newTx, ...transactions];
      setTransactions(updatedTxs);
      await AsyncStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(updatedTxs));
    } catch (error) {
      console.error('Failed to save listing:', error);
    }
  };

  // Action: Toggle Like
  const toggleLike = async (id: string) => {
    try {
      const updatedListings = listings.map(listing => {
        if (listing.id === id) {
          const isLiked = !listing.isLiked;
          const likes = isLiked ? listing.likes + 1 : Math.max(0, listing.likes - 1);
          return { ...listing, isLiked, likes };
        }
        return listing;
      });
      setListings(updatedListings);
      await AsyncStorage.setItem(STORAGE_KEYS.LISTINGS, JSON.stringify(updatedListings));
    } catch (error) {
      console.error('Failed to toggle like:', error);
    }
  };

  // Action: Delete Listing
  const deleteListing = async (id: string) => {
    try {
      const updatedListings = listings.filter((l) => l.id !== id);
      setListings(updatedListings);
      await AsyncStorage.setItem(STORAGE_KEYS.LISTINGS, JSON.stringify(updatedListings));
      
      // Also delete related chat threads if we want, or just leave them
    } catch (error) {
      console.error('Failed to delete listing:', error);
    }
  };

  // Action: Unlock Listing Contact
  const unlockContact = async (id: string): Promise<boolean> => {
    if (unlockedListings.includes(id)) {
      return true; // Already unlocked
    }

    if (walletBalance < unlockFee) {
      return false; // Insufficient balance
    }

    try {
      const targetListing = listings.find((l) => l.id === id);
      const newBalance = Math.max(0, parseFloat((walletBalance - unlockFee).toFixed(2)));
      const newUnlocked = [...unlockedListings, id];

      setWalletBalance(newBalance);
      setUnlockedListings(newUnlocked);

      await AsyncStorage.setItem(STORAGE_KEYS.BALANCE, newBalance.toString());
      await AsyncStorage.setItem(STORAGE_KEYS.UNLOCKED, JSON.stringify(newUnlocked));

      // Log Transaction
      const newTx: Transaction = {
        id: Math.random().toString(),
        type: 'unlock',
        amount: -unlockFee,
        timestamp: new Date().toISOString(),
        listingTitle: targetListing?.title
      };
      const updatedTxs = [newTx, ...transactions];
      setTransactions(updatedTxs);
      await AsyncStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(updatedTxs));

      return true;
    } catch (error) {
      console.error('Failed to unlock contact:', error);
      return false;
    }
  };

  // Action: Top-up Wallet Balance
  const topUpWallet = async (amount = 5.00) => {
    try {
      const newBalance = parseFloat((walletBalance + amount).toFixed(2));
      setWalletBalance(newBalance);
      await AsyncStorage.setItem(STORAGE_KEYS.BALANCE, newBalance.toString());

      // Log Transaction
      const newTx: Transaction = {
        id: Math.random().toString(),
        type: 'topup',
        amount,
        timestamp: new Date().toISOString()
      };
      const updatedTxs = [newTx, ...transactions];
      setTransactions(updatedTxs);
      await AsyncStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(updatedTxs));
    } catch (error) {
      console.error('Failed to top up wallet:', error);
    }
  };

  // Action: Start Chat
  const startChat = async (listingId: string, listingTitle: string, participantName: string) => {
    if (chats.some((c) => c.listingId === listingId)) {
      return; // Chat already exists
    }

    const newChat: ChatConversation = {
      listingId,
      listingTitle,
      participantName,
      messages: [
        {
          id: Math.random().toString(),
          sender: 'them',
          text: `Ahoj! Píšeš ohľadom inzerátu "${listingTitle}". Chat je plne zabezpečený.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ],
    };

    const updatedChats = [...chats, newChat];
    setChats(updatedChats);
    await AsyncStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(updatedChats));
  };

  // Action: Send Message
  const sendMessage = async (listingId: string, text: string, media?: ListingMedia) => {
    const chatIndex = chats.findIndex((c) => c.listingId === listingId);
    if (chatIndex === -1) return;

    const newMessage: Message = {
      id: Math.random().toString(),
      sender: 'me',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mediaUri: media?.uri,
      mediaType: media?.type,
    };

    const updatedChats = [...chats];
    const targetChat = { ...updatedChats[chatIndex] };
    targetChat.messages = [...targetChat.messages, newMessage];
    
    // Set typing indicator
    targetChat.isTyping = true;
    updatedChats[chatIndex] = targetChat;
    setChats(updatedChats);

    // Save user's message
    await AsyncStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(updatedChats));

    // Simulate smart auto-reply
    setTimeout(async () => {
      const activeChats = await AsyncStorage.getItem(STORAGE_KEYS.CHATS);
      const currentChats = activeChats ? JSON.parse(activeChats) : updatedChats;
      const latestChatIndex = currentChats.findIndex((c: ChatConversation) => c.listingId === listingId);
      if (latestChatIndex === -1) return;

      const latestChat = { ...currentChats[latestChatIndex] };

      let replyText = 'Jasné, rozumiem. Dohodneme sa.';
      const category = listings.find((l) => l.id === listingId)?.category;

      if (media) {
        replyText = media.type === 'image' 
          ? 'Super fotka! Vyzerá to dobre.' 
          : 'Pekné video, dikes za detaily.';
      } else {
        if (category === 'sport') {
          if (text.toLowerCase().includes('ahoj') || text.toLowerCase().includes('cau') || text.toLowerCase().includes('zdrav')) {
            replyText = 'Ahoj! Áno, skipas je stále voľný. Budem pri pokladniach na Bielej Púti o 10 minút, odovzdám ti ho.';
          } else if (text.toLowerCase().includes('kedy') || text.toLowerCase().includes('kde') || text.toLowerCase().includes('stret')) {
            replyText = 'Stretnime sa pri hlavnej mape na parkovisku Biela Púť. Mám striebornú bundu a čierne okuliare.';
          } else {
            replyText = 'Dobre, dohodnuté! Zatiaľ čau, čakám ťa tam.';
          }
        } else if (category === 'tickets') {
          if (text.toLowerCase().includes('ahoj') || text.toLowerCase().includes('voln') || text.toLowerCase().includes('listok')) {
            replyText = 'Ahoj, lístky na koncert sú ešte voľné. Môžem ti ich poslať na mail, alebo ak chceš, osobne v Prešove?';
          } else {
            replyText = 'Super, posielam ti QR kód lístka hneď, ako mi cinknú peniaze. Uži si koncert!';
          }
        } else {
          if (text.toLowerCase().includes('ahoj') || text.toLowerCase().includes('voln')) {
            replyText = 'Ahoj! Áno, je to stále aktuálne. Kedy by ti vyhovovalo sa stretnúť/dohodnúť?';
          } else {
            replyText = 'Dohodnuté, platí! Vidíme sa.';
          }
        }
      }

      const replyMessage: Message = {
        id: Math.random().toString(),
        sender: 'them',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      latestChat.messages = [...latestChat.messages, replyMessage];
      latestChat.isTyping = false;
      
      const nextChats = [...currentChats];
      nextChats[latestChatIndex] = latestChat;
      setChats(nextChats);
      await AsyncStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(nextChats));
    }, 2000);
  };

  // Action: Claim Daily Reward
  const claimDailyBonus = async (amount: number): Promise<boolean> => {
    const now = new Date();
    if (lastClaimedBonus) {
      const lastClaimDate = new Date(lastClaimedBonus);
      const diffTime = Math.abs(now.getTime() - lastClaimDate.getTime());
      const diffHours = diffTime / (1000 * 60 * 60);
 
      // Require 24 hours between claims (can set smaller for testing but 24h is default)
      if (diffHours < 24) {
        return false; // Already claimed
      }
    }
 
    const newBalance = parseFloat((walletBalance + amount).toFixed(2));
    const bonusTimeString = now.toISOString();
 
    setWalletBalance(newBalance);
    setLastClaimedBonus(bonusTimeString);
 
    await AsyncStorage.setItem(STORAGE_KEYS.BALANCE, newBalance.toString());
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_BONUS, bonusTimeString);

    // Log Transaction
    const newTx: Transaction = {
      id: Math.random().toString(),
      type: 'bonus',
      amount,
      timestamp: bonusTimeString
    };
    const updatedTxs = [newTx, ...transactions];
    setTransactions(updatedTxs);
    await AsyncStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(updatedTxs));
 
    return true;
  };

  // Action: Reset Data
  const resetAllData = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.LISTINGS);
      await AsyncStorage.removeItem(STORAGE_KEYS.UNLOCKED);
      await AsyncStorage.removeItem(STORAGE_KEYS.BALANCE);
      await AsyncStorage.removeItem(STORAGE_KEYS.CHATS);
      await AsyncStorage.removeItem(STORAGE_KEYS.LAST_BONUS);
      await AsyncStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
      await AsyncStorage.removeItem(STORAGE_KEYS.LANGUAGE);
      await AsyncStorage.removeItem(STORAGE_KEYS.THEME);
      
      const initialListings = getInitialListings();

      setListings(initialListings);
      setUnlockedListings([]);
      setWalletBalance(50);
      setChats([]);
      setTransactions([]);
      setLastClaimedBonus(null);
      setAppLanguageState('sk');
      setAppThemeState('system');
      await i18n.changeLanguage('sk');
      
      await AsyncStorage.setItem(STORAGE_KEYS.LISTINGS, JSON.stringify(initialListings));
      await AsyncStorage.setItem(STORAGE_KEYS.BALANCE, '50');
    } catch (error) {
      console.error('Failed to reset state:', error);
    }
  };

  return (
    <AppContext.Provider
      value={{
        listings,
        unlockedListings,
        walletBalance,
        unlockFee,
        chats,
        transactions,
        lastClaimedBonus,
        appLanguage,
        appTheme,
        createListing,
        deleteListing,
        unlockContact,
        topUpWallet,
        startChat,
        sendMessage,
        claimDailyBonus,
        setAppLanguage,
        setAppTheme,
        resetAllData,
        toggleLike,
        currentUser,
        login,
        logout,
        isLoginVisible,
        setLoginVisible,
        requireAuth,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
