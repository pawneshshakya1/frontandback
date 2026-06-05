import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING } from '../theme/colors';

interface ProfileHeaderProps {
  username: string;
  avatar?: string;
  coverImage?: string;
  badges: { icon: string; label: string }[];
  level?: string;
}

const defaultAvatar = 'https://lh3.googleusercontent.com/aida-public/AB6AXuD8SramNZdVi1A8A-J6l2KUxr-hdqaZXJsnAO0_xZjG3BDsC1UQPKiyudff4EEVYR78z4r-WcYTwSWIeDLuOSAVkg_K0mCdOGZZ4N8ot5c04pGmA50sirkGZoW5d3t1ZP536e3ro0c1U0Ooh7LO40NYk2-vUI7Bd2qNVCVykUhwMsQddSGeSwf0XbPrDsuynVt-jEciI8dOHpTgK4QX-aYM9avIdfBTRbYWYBI7CQcp0nwreHu-wZfJK2z5lGUp9DrkpXqlBDqnm4k';
const defaultCover = 'https://lh3.googleusercontent.com/aida-public/AB6AXuAh5AJVtKymLINB1Rn9KLf0PTMYIkgB3Q5LIzoxYUINBFDPzQKls6ZwkJRVwtMGgSP-izheoxRyYg5y3VnHsRTCrzjABw8IpQlH49m6qQgNjaXyQ75nJRP5zicKoCr3_OTd7cXc8wtgyKTK5_WBGmfX56S4sVxbxTwlYRcated-55EhAJOC1lWr1Z3_zIVl8ejuZV5mXk3_pqyBGlU1nma9h1VH3TqElVc3gciyzvzZVe4V02IROi7r8loAkIU2n5sFgMU7LZ-pI';

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({ username, avatar, coverImage, badges, level = 'PARTNER' }) => (
  <View style={styles.container}>
    <Image source={{ uri: coverImage || defaultCover }} style={styles.coverImage} />
    <LinearGradient colors={['rgba(13,13,13,0)', 'rgba(13,13,13,0.8)', 'rgba(13,13,13,1)']} style={styles.coverGradient} />
    <View style={styles.profileSection}>
      <View style={styles.avatarContainer}>
        <View style={styles.avatarBorder}>
          <Image source={{ uri: avatar || defaultAvatar }} style={styles.avatar} />
        </View>
        <View style={styles.levelBadge}>
          <Text style={styles.levelText}>{level}</Text>
        </View>
      </View>
      <Text style={styles.username}>{username}</Text>
      <View style={styles.badgesRow}>
        {badges.map((badge, i) => (
          <View key={i} style={styles.badge}>
            <Text style={styles.badgeIcon}>{badge.icon}</Text>
            <Text style={styles.badgeText}>{badge.label}</Text>
          </View>
        ))}
      </View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { width: '100%', height: 380, position: 'relative' },
  coverImage: { width: '100%', height: '100%' },
  coverGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '100%' },
  profileSection: { position: 'absolute', bottom: SPACING.xxl, left: 0, right: 0, alignItems: 'center' },
  avatarContainer: { position: 'relative', marginBottom: SPACING.lg },
  avatarBorder: { width: 96, height: 96, borderRadius: 48, borderWidth: 4, borderColor: COLORS.primary, padding: 4, backgroundColor: COLORS.backgroundDark },
  avatar: { width: '100%', height: '100%', borderRadius: 44 },
  levelBadge: { position: 'absolute', bottom: -4, right: -4, backgroundColor: COLORS.primary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, borderWidth: 2, borderColor: COLORS.backgroundDark },
  levelText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  username: { fontSize: 24, fontWeight: '900', fontStyle: 'italic', color: 'white', letterSpacing: -1, textTransform: 'uppercase' },
  badgesRow: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.sm },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  badgeIcon: { fontSize: 14 },
  badgeText: { fontSize: 12, fontWeight: 'bold', color: 'rgba(255,255,255,0.8)' },
});
