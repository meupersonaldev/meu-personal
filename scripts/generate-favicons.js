const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const BRAND_COLORS = {
  primary: '#002C4E',
  accent: '#FFF373',
  secondary: '#27DFFF'
};

async function generateFavicons() {
  const sizes = [16, 32, 48, 64, 96, 128, 192, 256, 512];

  // SVG logo
  const svgLogo = `
    <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
      <!-- Background circle -->
      <circle cx="256" cy="256" r="256" fill="${BRAND_COLORS.primary}"/>

      <!-- Stylized MP letters -->
      <g transform="translate(256, 256)">
        <!-- Letter M -->
        <path d="M-80 -20h20v80h-20V20l20 40h20l20-40v40h20v-80h-20l-30 60-30-60z" fill="${BRAND_COLORS.accent}"/>

        <!-- Letter P -->
        <path d="M40 -20h40c40 0 60 20 60 60v40c0 40-20 60-60 60h-20v40h-40v-200zm40 40v80h20c20 0 20 0 20-20v-40c0-20 0-20-20-20h-20z" fill="${BRAND_COLORS.accent}"/>

        <!-- Small accent dot -->
        <circle cx="140" cy="-10" r="12" fill="${BRAND_COLORS.secondary}"/>
      </g>
    </svg>
  `;

  const svgBuffer = Buffer.from(svgLogo);

  // Generate different sizes
  for (const size of sizes) {
    const filename = `favicon-${size}x${size}.png`;
    const outputPath = path.join(__dirname, '../apps/web/public/', filename);

    await sharp(svgBuffer)
      .resize(size, size, { fit: 'fill' })
      .png({
        compressionLevel: 9,
        quality: size <= 32 ? 100 : 90
      })
      .toFile(outputPath);

    console.log(`✅ Generated ${filename} (${size}x${size}px)`);
  }

  // Generate ICO file with multiple sizes
  const icoSizes = [16, 32, 48];
  const images = [];

  for (const size of icoSizes) {
    const image = await sharp(svgBuffer)
      .resize(size, size, { fit: 'fill' })
      .png()
      .toBuffer();

    images.push({ input: image, size: size });
  }

  await sharp(images)
    .toFile(path.join(__dirname, '../apps/web/public/favicon.ico'));

  console.log(`✅ Generated favicon.ico with sizes: ${icoSizes.join(', ')}px`);

  // Keep the SVG favicon for modern browsers
  const svgFavicon = `
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

  fs.writeFileSync(
    path.join(__dirname, '../apps/web/public/favicon.svg'),
    svgFavicon
  );

  console.log('✅ Generated favicon.svg for modern browsers');

  console.log('\n🎉 All favicons generated successfully!');
  console.log('\n📁 Files created:');
  sizes.forEach(size => {
    console.log(`   - favicon-${size}x${size}.png`);
  });
  console.log('   - favicon.ico (multi-size)');
  console.log('   - favicon.svg (vector)');
  console.log('\n💡 Update your HTML to use:');
  console.log('   <link rel="icon" href="/favicon.svg" type="image/svg+xml" />');
  console.log('   <link rel="icon" href="/favicon.ico" sizes="any" />');
  console.log('   <link rel="apple-touch-icon" href="/favicon-192x192.png" />');
}

generateFavicons().catch(console.error);