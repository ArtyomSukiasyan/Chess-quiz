import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

// Point this at any site, e.g. the web quiz: EXPO_PUBLIC_WEBSITE_URL=http://192.168.1.10:5173
const WEBSITE_URL = process.env.EXPO_PUBLIC_WEBSITE_URL ?? 'https://chess-quiz-three.vercel.app/';

type PageData = {
  title: string;
  url: string;
  headings: string[];
};

// Runs inside the page: collects data from the DOM and sends it back to React Native.
const EXTRACT_DATA_JS = `
  (function () {
    function send() {
      var headings = Array.prototype.slice
        .call(document.querySelectorAll('h1, h2, h3'))
        .map(function (h) { return h.innerText.trim(); })
        .filter(Boolean)
        .slice(0, 50);
      window.ReactNativeWebView.postMessage(JSON.stringify({
        title: document.title,
        url: location.href,
        headings: headings
      }));
    }
    send();
    // Re-send when single-page apps change the DOM.
    var timer;
    new MutationObserver(function () {
      clearTimeout(timer);
      timer = setTimeout(send, 500);
    }).observe(document.body, { childList: true, subtree: true });
  })();
  true;
`;

export default function App() {
  // react-native-webview 14 defaults the extra-props param to `undefined`, which collapses its props to `never`.
  const webViewRef = useRef<WebView<object>>(null);
  const [data, setData] = useState<PageData | null>(null);
  const [showData, setShowData] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onMessage = (event: WebViewMessageEvent) => {
    try {
      setData(JSON.parse(event.nativeEvent.data));
    } catch {
      // Ignore messages that aren't ours.
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable
            onPress={() => webViewRef.current?.goBack()}
            disabled={!canGoBack}
            style={styles.button}
          >
            <Text style={[styles.buttonText, !canGoBack && styles.disabled]}>‹ Back</Text>
          </Pressable>
          <Text style={styles.title} numberOfLines={1}>
            {data?.title || 'Loading…'}
          </Text>
          <Pressable onPress={() => setShowData((v) => !v)} style={styles.button}>
            <Text style={styles.buttonText}>{showData ? 'Web' : 'Data'}</Text>
          </Pressable>
        </View>

        {error ? (
          <View style={[styles.flex, styles.errorBox]}>
            <Text style={styles.error}>{error}</Text>
            <Pressable
              onPress={() => {
                setError(null);
                webViewRef.current?.reload();
              }}
              style={styles.button}
            >
              <Text style={styles.buttonText}>Retry</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={[styles.flex, (showData || error) && styles.hidden]}>
          <WebView<object>
            ref={webViewRef}
            source={{ uri: WEBSITE_URL }}
            injectedJavaScript={EXTRACT_DATA_JS}
            onMessage={onMessage}
            onNavigationStateChange={(nav) => setCanGoBack(nav.canGoBack)}
            onError={(e) => setError(e.nativeEvent.description || 'Failed to load page')}
            startInLoadingState
            renderLoading={() => (
              <View style={styles.center}>
                <ActivityIndicator size="large" />
              </View>
            )}
            pullToRefreshEnabled
            allowsBackForwardNavigationGestures
          />
        </View>

        {showData && !error ? (
          <ScrollView style={styles.flex} contentContainerStyle={styles.dataContent}>
            <Text style={styles.label}>URL</Text>
            <Text style={styles.value}>{data?.url ?? '—'}</Text>
            <Text style={styles.label}>Headings ({data?.headings.length ?? 0})</Text>
            {data?.headings.map((h, i) => (
              <Text key={i} style={styles.value}>
                • {h}
              </Text>
            ))}
          </ScrollView>
        ) : null}

        <StatusBar style="auto" />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  flex: { flex: 1 },
  hidden: { display: 'none' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  title: { flex: 1, textAlign: 'center', fontWeight: '600', fontSize: 16 },
  button: { paddingHorizontal: 10, paddingVertical: 6 },
  buttonText: { color: '#007aff', fontSize: 16 },
  disabled: { color: '#bbb' },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorBox: { alignItems: 'center', justifyContent: 'center', gap: 12 },
  error: { color: '#c00', textAlign: 'center', paddingHorizontal: 24 },
  dataContent: { padding: 16, gap: 4 },
  label: { marginTop: 12, fontWeight: '700', color: '#555' },
  value: { fontSize: 15 },
});
