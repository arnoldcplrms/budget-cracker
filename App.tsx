import { useEffect, useState } from 'react';
import { Image, Platform, Pressable, StatusBar, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFonts, Baloo2_700Bold, Baloo2_600SemiBold } from '@expo-google-fonts/baloo-2';
import { Nunito_400Regular, Nunito_700Bold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';
import { applyCurrency, applyPalette, C, F, R, SP } from './src/theme';
import { getCurrencyId, getPaletteId, initDb, saveCurrencyId, savePaletteId } from './src/db';
import ItemsScreen from './src/screens/ItemsScreen';
import TemplatesScreen from './src/screens/TemplatesScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import TemplateDetailScreen from './src/screens/TemplateDetailScreen';

type Nav = { screen: 'tabs' } | { screen: 'template'; id: number };
type TabId = 'list' | 'items' | 'settings';

type TabItemProps = {
  label: string;
  active: boolean;
  icon: 'wallet-outline' | 'wallet' | 'receipt-outline' | 'receipt' | 'settings-outline' | 'settings';
  onPress: () => void;
};

function TabItem({ label, active, icon, onPress }: TabItemProps) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: SP(1.5),
          marginHorizontal: SP(1),
          borderRadius: R.card,
          backgroundColor: active ? C.accentSoft : 'transparent',
        },
        pressed && { opacity: 0.7 },
      ]}
    >
      <Ionicons name={icon} size={23} color={active ? C.accent : C.inkSoft} />
      <Text style={{ fontFamily: F.bodyXBold, fontSize: 12, color: active ? C.accent : C.inkSoft, marginTop: 3 }}>
        {label}
      </Text>
    </Pressable>
  );
}

function BottomTabs({ tab, onChange, bottomInset }: { tab: TabId; onChange: (tab: TabId) => void; bottomInset: number }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: C.white,
        borderTopWidth: 1.5,
        borderTopColor: C.line,
        paddingHorizontal: SP(4),
        paddingTop: SP(1.5),
        paddingBottom: Math.max(bottomInset, Platform.OS === 'ios' ? SP(2) : SP(1.5)),
      }}
    >
      <TabItem label="Budget List" active={tab === 'list'} icon={tab === 'list' ? 'wallet' : 'wallet-outline'} onPress={() => onChange('list')} />
      <TabItem label="Budget Items" active={tab === 'items'} icon={tab === 'items' ? 'receipt' : 'receipt-outline'} onPress={() => onChange('items')} />
      <TabItem label="Settings" active={tab === 'settings'} icon={tab === 'settings' ? 'settings' : 'settings-outline'} onPress={() => onChange('settings')} />
    </View>
  );
}

function AppContent() {
  const [fontsLoaded] = useFonts({
    Baloo2_700Bold,
    Baloo2_600SemiBold,
    Nunito_400Regular,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });
  const [dbReady, setDbReady] = useState(false);
  const [tab, setTab] = useState<TabId>('list');
  const [nav, setNav] = useState<Nav>({ screen: 'tabs' });
  const [paletteId, setPaletteId] = useState(0);
  const [currencyId, setCurrencyId] = useState(0);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await initDb();
      const [savedPaletteId, savedCurrencyId] = await Promise.all([getPaletteId(), getCurrencyId()]);
      if (cancelled) return;
      applyPalette(savedPaletteId);
      applyCurrency(savedCurrencyId);
      setPaletteId(savedPaletteId);
      setCurrencyId(savedCurrencyId);
      setDbReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!fontsLoaded || !dbReady) return null;

  const changePalette = (id: number) => {
    applyPalette(id);
    setPaletteId(id);
    void savePaletteId(id);
  };
  const changeCurrency = (id: number) => {
    applyCurrency(id);
    setCurrencyId(id);
    void saveCurrencyId(id);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.paper, paddingTop: insets.top, paddingBottom: Platform.OS === 'android' && nav.screen === 'template' ? insets.bottom : 0 }}>
      <StatusBar barStyle="dark-content" />
      {nav.screen === 'template' ? (
        <TemplateDetailScreen key={nav.id} id={nav.id} onBack={() => setNav({ screen: 'tabs' })} />
      ) : (
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SP(5), paddingTop: SP(2), paddingBottom: SP(3) }}>
            <Text style={{ fontFamily: F.bodyXBold, fontSize: 11, letterSpacing: 1.6, color: C.accent }}>BUDGET CRACKER</Text>
            <Image
              source={require('./assets/budget-cracker-logo.png')}
              accessibilityLabel="Budget Cracker logo"
              resizeMode="contain"
              style={{ width: 48, height: 48 }}
            />
          </View>
          <View style={{ flex: 1 }}>
            {tab === 'list' ? (
              <TemplatesScreen onOpen={(id) => setNav({ screen: 'template', id })} />
            ) : tab === 'items' ? (
              <ItemsScreen />
            ) : (
              <SettingsScreen paletteId={paletteId} currencyId={currencyId} onPaletteChange={changePalette} onCurrencyChange={changeCurrency} />
            )}
          </View>
          <BottomTabs tab={tab} onChange={setTab} bottomInset={insets.bottom} />
        </View>
      )}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}
