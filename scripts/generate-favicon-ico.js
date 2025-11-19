const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const BRAND_COLORS = {
  primary: '#002C4E',
  accent: '#FFF373',
  secondary: '#27DFFF'
};

async function generateFaviconICO() {
  try {
    // SVG for favicon
    const svg = `
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- Background circle with primary color -->
        <circle cx="16" cy="16" r="16" fill="${BRAND_COLORS.primary}"/>

        <!-- Stylized "M" and "P" letters representing "Meu Personal" -->
        <!-- Letter M -->
        <path d="M8 10h2v12h-2V14l2 4h2l2-4v8h2V10h-2l-3 6-3-6z" fill="${BRAND_COLORS.accent}"/>

        <!-- Letter P -->
        <path d="M18 10h4c2 0 3 1 3 3v2c0 2-1 3-3 3h-2v4h-2V10zm2 2v4h2c1 0 1 0 1-1v-2c0-1 0-1-1-1h-2z" fill="${BRAND_COLORS.accent}"/>

        <!-- Small accent dot -->
        <circle cx="26" cy="12" r="1.5" fill="${BRAND_COLORS.secondary}"/>
      </svg>
    `;

    // Generate ICO with multiple sizes
    const sizes = [16, 32, 48];
    const images = [];

    for (const size of sizes) {
      const image = await sharp(Buffer.from(svg))
        .resize(size, size, { fit: 'fill' })
        .png({ quality: 100 })
        .toBuffer();

      images.push({ input: image, size: size });
    }

    // Create ICO file
    await sharp(images)
      .toFile(path.join(__dirname, '../apps/web/app/favicon.ico'));

    console.log('✅ Generated favicon.ico with sizes:', sizes.join(', '), 'px');

    // Also update app/favicon.svg
    fs.writeFileSync(
      path.join(__dirname, '../apps/web/app/favicon.svg'),
      svg
    );

    console.log('✅ Updated app/favicon.svg');

    // Copy to public as backup
    fs.writeFileSync(
      path.join(__dirname, '../apps/web/public/favicon.ico'),
      await sharp(images).toBuffer()
    );

    console.log('✅ Copied favicon.ico to public/ folder');

    console.log('\n🎉 Favicon files generated successfully!');
    console.log('\n📁 Files updated:');
    console.log('   - apps/web/app/favicon.ico (main for Next.js)');
    console.log('   - apps/web/app/favicon.svg (modern browsers)');
    console.log('   - apps/web/public/favicon.ico (backup)');

  } catch (error) {
    console.error('❌ Error generating favicon.ico:', error);
  }
}

generateFaviconICO().catch(console.error);