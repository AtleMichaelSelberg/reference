import { useState, useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  ScrollView, useWindowDimensions, Image, ActivityIndicator,
  Modal, PanResponder, Animated,
} from 'react-native';
import Svg, { Path, Rect, Text as SvgText } from 'react-native-svg';
import { BlurView } from 'expo-blur';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

// ─── Login logo ──────────────────────────────────────────────────────────────

function LoginLogo() {
  return (
    <Svg width={240} height={210} viewBox="0 0 240 210" style={{ marginBottom: 20 }}>
      <SvgText
        x="120"
        y="55"
        textAnchor="middle"
        fontFamily="Georgia, serif"
        fontStyle="italic"
        fontWeight="bold"
        fontSize="48"
        fill="#007AFF"
      >
        Reference
      </SvgText>

      <Path
        d="M120,205 C88,173 48,149 48,117 C48,93 64,85 80,85 C96,85 112,96.6 120,112.8 C128,96.6 144,85 160,85 C176,85 192,93 192,117 C192,149 152,173 120,205 Z"
        fill="#007AFF"
      />
      <Rect x="82" y="125" width="76" height="7" rx="3.5" fill="white" />
      <Rect x="87" y="143" width="66" height="7" rx="3.5" fill="white" />
      <Rect x="93" y="161" width="54" height="7" rx="3.5" fill="white" />
    </Svg>
  );
}

function SplashHeartIcon() {
  return (
    <Svg width={40} height={34} viewBox="48 75 144 120">
      <Path
        d="M120,195 C88,163 48,139 48,107 C48,83 64,75 80,75 C96,75 112,86.6 120,102.8 C128,86.6 144,75 160,75 C176,75 192,83 192,107 C192,139 152,163 120,195 Z"
        fill="#007AFF"
      />
      <Rect x="82" y="115" width="76" height="7" rx="3.5" fill="white" />
      <Rect x="87" y="133" width="66" height="7" rx="3.5" fill="white" />
      <Rect x="93" y="151" width="54" height="7" rx="3.5" fill="white" />
    </Svg>
  );
}

const SPLASH_CARDS = [
  { text: '0/10 skier, 10/10 lover',                   type: 'romantic' },
  { text: "He's good, and his dog is the BEST",         type: 'platonic' },
  { text: 'Ask for the passenger princess treatment',   type: 'romantic' },
];

// ─── Login splash ─────────────────────────────────────────────────────────────

function LoginSplash({ onPress }) {
  const anims = useRef(
    SPLASH_CARDS.map(() => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(16),
    }))
  ).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      anims.forEach((anim, i) => {
        setTimeout(() => {
          Animated.parallel([
            Animated.timing(anim.opacity,     { toValue: 1, duration: 1400, useNativeDriver: true }),
            Animated.timing(anim.translateY,  { toValue: 0, duration: 1400, useNativeDriver: true }),
          ]).start();
        }, i * 1400);
      });
    }, 1050);
    return () => clearTimeout(timer);
  }, []);

  return (
    <TouchableOpacity style={styles.container} activeOpacity={1} onPress={onPress}>
      <LoginLogo />
      {SPLASH_CARDS.map((card, i) => (
        <Animated.View
          key={i}
          style={[
            styles.splashCard,
            card.type === 'romantic' ? styles.romanticCard : styles.platonicCard,
            { opacity: anims[i].opacity, transform: [{ translateY: anims[i].translateY }] },
          ]}
        >
          <View style={styles.splashCardIcon}>
            <SplashHeartIcon />
          </View>
          <Text style={styles.splashCardText}>{card.text}</Text>
        </Animated.View>
      ))}
      <StatusBar style="auto" />
    </TouchableOpacity>
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

// ─── Feedback screen ─────────────────────────────────────────────────────────

function FeedbackScreen() {
  const [comments, setComments] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await fetch(`${BASE_URL}/api/users/feedback/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comments }),
      });
    } catch (_) {}
    setSubmitting(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <View style={styles.centered}>
        <Text style={styles.feedbackThankYou}>Thank you!</Text>
      </View>
    );
  }

  return (
    <View style={styles.centered}>
      <Text style={styles.feedbackPrompt}>
        Thanks for playing! Any feedback?
      </Text>
      <TextInput
        style={styles.feedbackInput}
        placeholder="constructive, destructive, or reductive"
        placeholderTextColor="#bbb"
        value={comments}
        onChangeText={setComments}
        multiline
      />
      <TouchableOpacity style={styles.feedbackButton} onPress={handleSubmit} disabled={submitting}>
        {submitting
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.feedbackButtonText}>Submit</Text>}
      </TouchableOpacity>
    </View>
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
  const [bannerMsg, setBannerMsg] = useState('');
  const [bannerColor, setBannerColor] = useState('#CC0000');
  const bannerAnim = useRef(new Animated.Value(-80)).current;

  const showBanner = (msg, color, onDone) => {
    setBannerMsg(msg);
    setBannerColor(color);
    Animated.sequence([
      Animated.timing(bannerAnim, { toValue: 0,   duration: 280, useNativeDriver: true }),
      Animated.delay(1500),
      Animated.timing(bannerAnim, { toValue: -80, duration: 280, useNativeDriver: true }),
    ]).start(() => onDone?.());
  };

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
  if (!profile) return <FeedbackScreen />;

  return (
    <View style={styles.swipeContainer}>
      <Animated.View
        style={[styles.killBanner, { backgroundColor: bannerColor, transform: [{ translateY: bannerAnim }] }]}
        pointerEvents="none"
      >
        <Text style={styles.killBannerText}>{bannerMsg}</Text>
      </Animated.View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 130 }}>
        <ProfileBody
          profile={profile}
          endorsements={endorsements}
          width={width}
          onPressEndorser={setSelectedEndorser}
        />
      </ScrollView>

      <BlurView intensity={8} tint="light" style={styles.actionRow}>
        <TouchableOpacity style={[styles.actionButton, styles.nopeButton]} onPress={advance}>
          <Text style={styles.actionButtonText}>✕</Text>
        </TouchableOpacity>
        {profile.can_try_to_kill && (
          <TouchableOpacity
            style={[styles.actionButton, styles.killButton]}
            onPress={() => {
              if (profile.is_unkillable) {
                showBanner('Haha, good luck with that', '#CC0000');
              } else {
                showBanner('Good Call', '#4CDE8F', advance);
              }
            }}
          >
            <Text style={[styles.actionButtonText, styles.killButtonText]}>KILL</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[styles.actionButton, styles.likeButton]} onPress={advance}>
          <Text style={styles.actionButtonText}>♥</Text>
        </TouchableOpacity>
      </BlurView>

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
  const [accessToken, setAccessToken] = useState(null);
  const { height } = useWindowDimensions();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const dismissTimer = useRef(null);
  const dismissed = useRef(false);

  const dismiss = () => {
    if (dismissed.current) return;
    dismissed.current = true;
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    Animated.timing(slideAnim, {
      toValue: -height,
      duration: 500,
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    const mountTime = Date.now();

    fetch(`${BASE_URL}/api/users/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@test.com', password: 'password' }),
    })
      .then(r => r.json())
      .then(({ access }) => {
        setAccessToken(access);
        const delay = Math.max(0, 7000 - (Date.now() - mountTime));
        dismissTimer.current = setTimeout(dismiss, delay);
      })
      .catch(() => {});
  }, []);

  return (
    <View style={{ flex: 1 }}>
      {accessToken && <SwipeView accessToken={accessToken} />}
      <Animated.View
        style={[StyleSheet.absoluteFill, { transform: [{ translateY: slideAnim }] }]}
      >
        <LoginSplash onPress={dismiss} />
      </Animated.View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Login
  container: {
    flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
  },

  errorText: { color: '#FF4458', fontSize: 14 },

  // Feedback screen
  feedbackPrompt: {
    fontSize: 20, fontWeight: '700', textAlign: 'center',
    color: '#111', paddingHorizontal: 32, marginBottom: 24, lineHeight: 28,
  },
  feedbackInput: {
    width: 300, minHeight: 100, borderWidth: 1, borderColor: '#ccc',
    borderRadius: 10, padding: 14, fontSize: 15, color: '#333',
    textAlignVertical: 'top', marginBottom: 16,
  },
  feedbackButton: {
    width: 300, backgroundColor: '#007AFF', borderRadius: 10,
    padding: 14, alignItems: 'center',
  },
  feedbackButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  feedbackThankYou: { fontSize: 28, fontWeight: '800', color: '#111' },

  // Splash cards
  splashCard: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderRadius: 12, padding: 12,
    marginBottom: 10, width: 280,
  },
  splashCardIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#E6F4FE',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  splashCardText: {
    flex: 1, fontSize: 14, color: '#333', fontStyle: 'italic',
  },

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
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center',
    gap: 40, paddingBottom: 40, paddingTop: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  actionButton: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center', elevation: 3,
  },
  killBanner: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
    paddingVertical: 18, alignItems: 'center',
  },
  killBannerText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },

  nopeButton: { backgroundColor: '#FF4458' },
  killButton: { backgroundColor: '#CC0000' },
  killButtonText: { fontSize: 18, letterSpacing: 1 },
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
