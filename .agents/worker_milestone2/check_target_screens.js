const fs = require('fs');
const path = require('path');

const targetScreens = [
  'AchievementsScreen.tsx', 'AddCashScreen.tsx', 'CreateMatchScreen.tsx', 'CreateWalletScreen.tsx',
  'JoinRoomScreen.tsx', 'LoginActivityScreen.tsx', 'MatchDetailScreen.tsx', 'MatchesListScreen.tsx',
  'MediatorDashboardScreen.tsx', 'PaymentMethodScreen.tsx', 'ScanPayScreen.tsx', 'SecurityPrivacyScreen.tsx',
  'SendGiftScreen.tsx', 'SettingsScreen.tsx', 'TwoFactorAuthScreen.tsx', 'UploadScreenshotScreen.tsx',
  'WalletScreen.tsx', 'WalletSettingsScreen.tsx', 'WithdrawScreen.tsx'
];

const dir = 'd:\\batuk\\frontandback\\frontend\\src\\screens\\main';

console.log('Checking target main screens specifically for Alert.alert:');
targetScreens.forEach(name => {
  const filePath = path.join(dir, name);
  if (!fs.existsSync(filePath)) {
    console.log(`- ${name} does not exist!`);
    return;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const hasAlertAlert = content.includes('Alert.alert');
  console.log(`- ${name}: has Alert.alert? ${hasAlertAlert}`);
});
