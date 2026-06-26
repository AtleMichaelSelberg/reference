import { useState, useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  ScrollView, useWindowDimensions, Image, ActivityIndicator,
  Modal, PanResponder,
} from 'react-native';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

// ─── Login ───────────────────────────────────────────────────────────────────

function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/users/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error('Invalid credentials');
      const { access } = await res.json();
      onLogin(access);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.buttonText}>Login</Text>}
      </TouchableOpacity>
      <View style={styles.spacer} />
      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Join with code</Text>
      </TouchableOpacity>
      <TextInput style={styles.input} placeholder="Join Code" />
      <StatusBar style="auto" />
    </View>
  );
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function primaryPhotoUri(user) {
  const pic = user.profile_pictures?.find(p => p.is_primary)
    ?? user.profile_pictures?.[0];
  if (!pic) return null;
  return pic.image_data
    ? `data:image/jpeg;base64,${pic.image_data}`
    : pic.image_url || null;
}

function sortedPhotoUris(user) {
  return [...(user.profile_pictures ?? [])]
    .sort((a, b) => a.order - b.order)
    .map(p => p.image_data ? `data:image/jpeg;base64,${p.image_data}` : p.image_url);
}

function approvedEndorsements(list) {
  return (list ?? []).filter(e => e.first_user_approved && e.second_user_approved);
}

// ─── Endorsement card ─────────────────────────────────────────────────────────

function EndorsementCard({ endorsement, profileUserId, onPressEndorser }) {
  const profileIsFirst = endorsement.first_user.id === profileUserId;
  const endorser     = profileIsFirst ? endorsement.second_user : endorsement.first_user;
  const statement    = profileIsFirst ? endorsement.second_user_statement : endorsement.first_user_statement;
  const approvedText = profileIsFirst ? endorsement.second_user_did_approve_text : endorsement.first_user_did_approve_text;

  const isRomantic = endorsement.is_romantic;
  const photoUri   = primaryPhotoUri(endorser);

  const cardContent = (
    <View style={[styles.endorsementCard, isRomantic ? styles.romanticCard : styles.platonicCard]}>
      <View style={styles.endorsementHeader}>
        {photoUri
          ? <Image source={{ uri: photoUri }} style={styles.endorserPhoto} />
          : <View style={[styles.endorserPhoto, styles.endorserPhotoPlaceholder]} />}
        <View style={styles.endorserMeta}>
          <Text style={styles.endorserName}>{endorser.first_name} {endorser.last_name}</Text>
          <View style={[styles.typePill, isRomantic ? styles.romanticPill : styles.platonicPill]}>
            <Text style={[styles.typePillText, isRomantic ? styles.romanticPillText : styles.platonicPillText]}>
              {isRomantic ? '♥ Romantic' : '◎ Platonic'}
            </Text>
          </View>
        </View>
      </View>
      {approvedText && statement
        ? <Text style={styles.endorsementQuote}>"{statement}"</Text>
        : null}
    </View>
  );

  if (!onPressEndorser) return cardContent;

  return (
    <TouchableOpacity activeOpacity={0.75} onPress={() => onPressEndorser(endorser)}>
      {cardContent}
    </TouchableOpacity>
  );
}

// ─── Profile body (shared between SwipeView and EndorserModal) ────────────────

function ProfileBody({ profile, endorsements, width, onPressEndorser }) {
  const photos = sortedPhotoUris(profile);

  return (
    <>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        style={{ width, height: width * 1.25 }}
      >
        {photos.length > 0 ? (
          photos.map((uri, i) => (
            <Image key={i} source={{ uri }} style={{ width, height: width * 1.25 }} resizeMode="cover" />
          ))
        ) : (
          <View style={[styles.noPhoto, { width, height: width * 1.25 }]}>
            <Text style={styles.noPhotoText}>No photos</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.scrollBodyContent}>
        <Text style={styles.profileName}>{profile.first_name} {profile.last_name}</Text>
        <Text style={styles.bioText}>{profile.bio}</Text>

        {endorsements.length > 0 && (
          <>
            <Text style={styles.endorsementsHeading}>References</Text>
            {endorsements.map(e => (
              <EndorsementCard
                key={e.id}
                endorsement={e}
                profileUserId={profile.id}
                onPressEndorser={onPressEndorser}
              />
            ))}
          </>
        )}
      </View>
    </>
  );
}

// ─── Endorser modal ───────────────────────────────────────────────────────────

function EndorserModal({ endorser, accessToken, originalProfile, onClose }) {
  const { width } = useWindowDimensions();
  const [endorserProfile, setEndorserProfile] = useState(null);
  const [endorsements, setEndorsements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => g.dy > 8 && Math.abs(g.dy) > Math.abs(g.dx),
    onPanResponderRelease: (_, g) => { if (g.dy > 60) onClose(); },
  })).current;

  useEffect(() => {
    setLoading(true);
    setError('');
    setEndorserProfile(null);
    fetch(`${BASE_URL}/api/users/${endorser.id}/profile/`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(res => { if (!res.ok) throw new Error(`${res.status}`); return res.json(); })
      .then(({ user, endorsements: e }) => {
        setEndorserProfile(user);
        setEndorsements(approvedEndorsements(e));
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [endorser.id]);

  const originalPhotoUri = primaryPhotoUri(originalProfile);

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        {/* Drag handle + banner — tap or swipe down to dismiss */}
        <TouchableOpacity activeOpacity={0.85} onPress={onClose} {...pan.panHandlers} style={styles.modalHeader}>
          <View style={styles.dragHandle} />
          <View style={styles.modalBanner}>
            {originalPhotoUri
              ? <Image source={{ uri: originalPhotoUri }} style={styles.bannerPhoto} />
              : <View style={[styles.bannerPhoto, styles.endorserPhotoPlaceholder]} />}
            <Text style={styles.bannerText}>
              viewing reference for {originalProfile.first_name} {originalProfile.last_name}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        {/* Content */}
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>Failed to load ({error})</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
            <ProfileBody
              profile={endorserProfile}
              endorsements={endorsements}
              width={width}
              onPressEndorser={null}
            />
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

// ─── SwipeView ────────────────────────────────────────────────────────────────

function SwipeView({ accessToken }) {
  const { width } = useWindowDimensions();
  const [candidateIds, setCandidateIds] = useState(null);
  const [index, setIndex] = useState(0);
  const [profile, setProfile] = useState(null);
  const [endorsements, setEndorsements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedEndorser, setSelectedEndorser] = useState(null);

  useEffect(() => {
    fetch(`${BASE_URL}/api/users/candidates/`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(res => { if (!res.ok) throw new Error(`${res.status}`); return res.json(); })
      .then(({ user_ids }) => setCandidateIds(user_ids))
      .catch(e => { setError(e.message); setLoading(false); });
  }, [accessToken]);

  useEffect(() => {
    if (candidateIds === null) return;
    if (index >= candidateIds.length) { setProfile(null); setLoading(false); return; }
    setLoading(true);
    setError('');
    fetch(`${BASE_URL}/api/users/${candidateIds[index]}/profile/`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(res => { if (!res.ok) throw new Error(`${res.status}`); return res.json(); })
      .then(({ user, endorsements: e }) => {
        setProfile(user);
        setEndorsements(approvedEndorsements(e));
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [candidateIds, index]);

  const advance = () => setIndex(i => i + 1);

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#007AFF" /></View>;
  if (error)   return <View style={styles.centered}><Text style={styles.errorText}>Failed to load ({error})</Text></View>;
  if (!profile) return <View style={styles.centered}><Text style={styles.emptyText}>No more profiles</Text></View>;

  return (
    <View style={styles.swipeContainer}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 12 }}>
        <ProfileBody
          profile={profile}
          endorsements={endorsements}
          width={width}
          onPressEndorser={setSelectedEndorser}
        />
      </ScrollView>

      <View style={styles.actionRow}>
        <TouchableOpacity style={[styles.actionButton, styles.nopeButton]} onPress={advance}>
          <Text style={styles.actionButtonText}>✕</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.likeButton]} onPress={advance}>
          <Text style={styles.actionButtonText}>♥</Text>
        </TouchableOpacity>
      </View>

      {selectedEndorser && (
        <EndorserModal
          endorser={selectedEndorser}
          accessToken={accessToken}
          originalProfile={profile}
          onClose={() => setSelectedEndorser(null)}
        />
      )}
    </View>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState('login');
  const [accessToken, setAccessToken] = useState(null);

  if (screen === 'swipe') return <SwipeView accessToken={accessToken} />;
  return <LoginScreen onLogin={token => { setAccessToken(token); setScreen('swipe'); }} />;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Login
  container: {
    flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
  },
  spacer: { height: 24 },
  input: {
    width: 280, borderWidth: 1, borderColor: '#ccc', borderRadius: 8,
    padding: 12, marginBottom: 16, textAlign: 'center',
  },
  button: {
    width: 280, backgroundColor: '#007AFF', borderRadius: 8,
    padding: 14, alignItems: 'center', marginBottom: 12,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  errorText: { color: '#FF4458', fontSize: 14 },

  // SwipeView shell
  swipeContainer: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 18, color: '#999' },
  noPhoto: { backgroundColor: '#eee', alignItems: 'center', justifyContent: 'center' },
  noPhotoText: { color: '#999' },

  // Profile body
  scrollBodyContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12 },
  profileName: {
    fontSize: 30,
    fontWeight: '800',
    color: '#111',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  bioText: {
    fontSize: 16,
    color: '#555',
    lineHeight: 24,
    fontWeight: '400',
    letterSpacing: 0.1,
  },

  // Endorsements
  endorsementsHeading: {
    fontSize: 13, fontWeight: '700', letterSpacing: 0.8, color: '#999',
    textTransform: 'uppercase', marginTop: 24, marginBottom: 10,
  },
  endorsementCard: { borderRadius: 12, borderWidth: 1.5, padding: 14, marginBottom: 12 },
  romanticCard:    { backgroundColor: '#FFF5F7', borderColor: '#F9A8B8' },
  platonicCard:    { backgroundColor: '#F0F6FF', borderColor: '#93C5FD' },
  endorsementHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  endorserPhoto: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  endorserPhotoPlaceholder: { backgroundColor: '#ddd' },
  endorserMeta: { flex: 1 },
  endorserName: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  typePill: {
    alignSelf: 'flex-start', borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1,
  },
  romanticPill:     { backgroundColor: '#FCE7EE', borderColor: '#F472B6' },
  platonicPill:     { backgroundColor: '#DBEAFE', borderColor: '#60A5FA' },
  typePillText:     { fontSize: 11, fontWeight: '600' },
  romanticPillText: { color: '#BE185D' },
  platonicPillText: { color: '#1D4ED8' },
  endorsementQuote: { fontSize: 14, color: '#555', fontStyle: 'italic', lineHeight: 20 },

  // Action buttons
  actionRow: {
    flexDirection: 'row', justifyContent: 'center',
    gap: 40, paddingBottom: 40, paddingTop: 16,
  },
  actionButton: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center', elevation: 3,
  },
  nopeButton: { backgroundColor: '#FF4458' },
  likeButton: { backgroundColor: '#4CDE8F' },
  actionButtonText: { fontSize: 28, color: '#fff', fontWeight: '700' },

  // Endorser modal
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalHeader: {
    backgroundColor: '#fff',
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  dragHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: '#ccc', alignSelf: 'center', marginTop: 10, marginBottom: 10,
  },
  modalBanner: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 6, gap: 10,
  },
  bannerPhoto: { width: 32, height: 32, borderRadius: 16 },
  bannerText: { flex: 1, fontSize: 16, fontWeight: '700', color: '#333' },
  modalCloseBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center',
  },
  modalCloseText: { fontSize: 13, color: '#555', fontWeight: '700' },
});
