const fs = require('fs');
const path = require('path');

const targetPaddings = [
  'CreateWalletScreen.tsx',
  'LoginActivityScreen.tsx',
  'MatchesListScreen.tsx',
  'SecurityPrivacyScreen.tsx',
  'SettingsScreen.tsx',
  'TwoFactorAuthScreen.tsx',
  'UploadScreenshotScreen.tsx',
  'AccountVisibilityScreen.tsx',
  'BlockedPlayersScreen.tsx',
  'ComingSoonScreen.tsx',
  'JoinedMatchScreen.tsx',
  'PersonalizationScreen.tsx',
  'PrivacyPolicyScreen.tsx',
  'TermsOfServiceScreen.tsx'
];

const dir = 'd:\\batuk\\frontandback\\frontend\\src\\screens\\main';

targetPaddings.forEach(name => {
  const filePath = path.join(dir, name);
  if (!fs.existsSync(filePath)) {
    console.log(`- ${name} does not exist!`);
    return;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  console.log(`\n=== ${name} ===`);
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('paddingHorizontal') || line.includes('paddingLeft') || line.includes('paddingRight')) {
      console.log(`Line ${idx + 1}: ${line.trim()}`);
    }
  });
});
