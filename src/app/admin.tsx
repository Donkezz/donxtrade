import React from 'react';
import { StyleSheet, View, ScrollView, Dimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { SymbolView } from 'expo-symbols';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/context/AppContext';

// Optional Map import
let MapView: any = null;
let Marker: any = null;
if (Platform.OS !== 'web') {
  try {
    const Maps = require('react-native-maps');
    MapView = Maps.default;
    Marker = Maps.Marker;
  } catch (e) {
    console.warn('react-native-maps not available');
  }
}

export default function AdminDashboard() {
  const theme = useTheme();
  const { listings, transactions } = useApp();
  const screenWidth = Dimensions.get('window').width - Spacing.four * 2;

  // Mock data for Line Chart
  const lineData = {
    labels: ['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne'],
    datasets: [
      {
        data: [20, 45, 28, 80, 99, 43, 50],
        color: (opacity = 1) => `rgba(56, 176, 0, ${opacity})`, // Green
        strokeWidth: 2
      }
    ],
    legend: ['Aktivita používateľov']
  };

  // Dynamic Pie Chart Data based on listings
  const categoryCounts = listings.reduce((acc, l) => {
    acc[l.category] = (acc[l.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData = [
    { name: 'Skipasy', count: categoryCounts['ski_pass'] || 0, color: '#3A86F0', legendFontColor: theme.textSecondary },
    { name: 'Lístky', count: categoryCounts['ticket'] || 0, color: '#FF006E', legendFontColor: theme.textSecondary },
    { name: 'Služby', count: categoryCounts['service'] || 0, color: '#8338EC', legendFontColor: theme.textSecondary },
    { name: 'Sociálne', count: categoryCounts['social'] || 0, color: '#38B000', legendFontColor: theme.textSecondary },
  ].filter(d => d.count > 0);

  const totalRevenue = transactions.filter(t => t.type === 'topup').reduce((acc, t) => acc + t.amount, 0);

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Admin Dashboard', headerBackTitle: 'Späť' }} />
      <SafeAreaView style={{ flex: 1 }} edges={['bottom', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <ThemedText type="title" style={{ marginBottom: Spacing.four }}>Prehľad aplikácie</ThemedText>

          {/* Summary Cards */}
          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
              <SymbolView tintColor="#3A86F0" name={{ ios: 'doc.on.doc.fill', web: 'list' } as any} size={20} />
              <ThemedText type="subtitle" style={styles.summaryValue}>{listings.length}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">Inzeráty</ThemedText>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
              <SymbolView tintColor="#38B000" name={{ ios: 'eurosign.circle.fill', web: 'euro' } as any} size={20} />
              <ThemedText type="subtitle" style={styles.summaryValue}>{totalRevenue.toFixed(2)} €</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">Dobitia</ThemedText>
            </View>
          </View>

          {/* Line Chart */}
          <View style={[styles.chartContainer, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
            <ThemedText type="smallBold" style={{ marginBottom: Spacing.three }}>Týždenná aktivita (Počet akcií)</ThemedText>
            <LineChart
              data={lineData}
              width={screenWidth - Spacing.four}
              height={220}
              chartConfig={{
                backgroundColor: theme.backgroundElement,
                backgroundGradientFrom: theme.backgroundElement,
                backgroundGradientTo: theme.backgroundElement,
                decimalPlaces: 0,
                color: (opacity = 1) => theme.text,
                labelColor: (opacity = 1) => theme.textSecondary,
                style: { borderRadius: 16 },
                propsForDots: { r: "4", strokeWidth: "2", stroke: theme.text }
              }}
              bezier
              style={{ marginVertical: 8, borderRadius: 16 }}
            />
          </View>

          {/* Pie Chart */}
          {pieData.length > 0 && (
            <View style={[styles.chartContainer, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
              <ThemedText type="smallBold" style={{ marginBottom: Spacing.three }}>Rozloženie kategórií</ThemedText>
              <PieChart
                data={pieData}
                width={screenWidth - Spacing.four}
                height={200}
                chartConfig={{ color: (opacity = 1) => theme.text }}
                accessor="count"
                backgroundColor="transparent"
                paddingLeft="0"
                absolute
              />
            </View>
          )}

          {/* Map View */}
          <View style={[styles.chartContainer, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected, marginBottom: Spacing.five }]}>
            <ThemedText type="smallBold" style={{ marginBottom: Spacing.three }}>Mapa aktivity používateľov</ThemedText>
            {Platform.OS === 'web' || !MapView ? (
              <View style={[styles.mapFallback, { backgroundColor: theme.backgroundSelected }]}>
                <ThemedText type="small" themeColor="textSecondary">Mapa nie je dostupná vo webovom zobrazení.</ThemedText>
              </View>
            ) : (
              <View style={styles.mapWrapper}>
                <MapView
                  style={styles.map}
                  initialRegion={{
                    latitude: 48.943,
                    longitude: 19.584,
                    latitudeDelta: 2.5,
                    longitudeDelta: 2.5,
                  }}
                >
                  <Marker coordinate={{ latitude: 48.943, longitude: 19.584 }} title="Jasná" description="Veľká aktivita skipasov" />
                  <Marker coordinate={{ latitude: 48.148, longitude: 17.107 }} title="Bratislava" description="Lístky na koncerty" pinColor="blue" />
                  <Marker coordinate={{ latitude: 49.060, longitude: 20.298 }} title="Vysoké Tatry" description="Turistika" pinColor="green" />
                  <Marker coordinate={{ latitude: 48.998, longitude: 21.239 }} title="Prešov" description="Služby" pinColor="purple" />
                </MapView>
              </View>
            )}
          </View>

        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: Spacing.four },
  summaryRow: { flexDirection: 'row', gap: Spacing.three, marginBottom: Spacing.four },
  summaryCard: { flex: 1, padding: Spacing.three, borderRadius: Spacing.three, borderWidth: 1 },
  summaryValue: { marginVertical: Spacing.one },
  chartContainer: { padding: Spacing.three, borderRadius: Spacing.three, borderWidth: 1, marginBottom: Spacing.four },
  mapWrapper: { height: 250, borderRadius: Spacing.two, overflow: 'hidden' },
  map: { width: '100%', height: '100%' },
  mapFallback: { height: 250, borderRadius: Spacing.two, alignItems: 'center', justifyContent: 'center' }
});
