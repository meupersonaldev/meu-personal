const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Cores da marca
const BRAND_COLORS = {
  primary: '#002C4E',
  accent: '#FFF373',
  secondary: '#27DFFF'
};

async function generateOGImage() {
  try {
    const width = 1200;
    const height = 630;

    // Create canvas
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${BRAND_COLORS.primary}"/>
            <stop offset="100%" style="stop-color:#003D6B"/>
          </linearGradient>
        </defs>

        <!-- Background -->
        <rect width="${width}" height="${height}" fill="url(#bg)"/>

        <!-- Content area -->
        <g transform="translate(80, 150)">
          <!-- Title -->
          <text x="0" y="0" font-family="Arial, sans-serif" font-size="72" font-weight="bold" fill="white">
            Meu Personal
          </text>

          <!-- Subtitle -->
          <text x="0" y="70" font-family="Arial, sans-serif" font-size="36" fill="${BRAND_COLORS.accent}">
            Plataforma de Personal Training
          </text>

          <!-- Description -->
          <text x="0" y="130" font-family="Arial, sans-serif" font-size="24" fill="white" opacity="0.9">
            Conectando professores e alunos para aulas
          </text>
          <text x="0" y="160" font-family="Arial, sans-serif" font-size="24" fill="white" opacity="0.9">
            personalizadas em academias franqueadas
          </text>

          <!-- CTA Button -->
          <rect x="0" y="200" width="250" height="60" rx="30" fill="${BRAND_COLORS.accent}"/>
          <text x="125" y="240" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="${BRAND_COLORS.primary}" text-anchor="middle">
            Comece Agora
          </text>
        </g>

        <!-- URL -->
        <text x="600" y="590" font-family="Arial, sans-serif" font-size="18" fill="white" opacity="0.7" text-anchor="middle">
          meupersonal.com.br
        </text>
      </svg>
    `;

    // Generate PNG from SVG
    await sharp(Buffer.from(svg))
      .png({ quality: 90 })
      .toFile(path.join(__dirname, '../apps/web/public/images/og-image.png'));

    console.log('✅ og-image.png generated successfully!');
  } catch (error) {
    console.error('❌ Error generating OG image:', error);
  }
}

async function generateOGSquare() {
  try {
    const size = 1200;

    // Create square version
    const svg = `
      <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${BRAND_COLORS.primary}"/>
            <stop offset="100%" style="stop-color:#003D6B"/>
          </linearGradient>
        </defs>

        <!-- Background -->
        <rect width="${size}" height="${size}" fill="url(#bg)"/>

        <!-- Content area -->
        <g transform="translate(${size/2}, ${size/2})">
          <!-- Title -->
          <text x="0" y="-100" font-family="Arial, sans-serif" font-size="64" font-weight="bold" fill="white" text-anchor="middle">
            Meu Personal
          </text>

          <!-- Subtitle -->
          <text x="0" y="-30" font-family="Arial, sans-serif" font-size="32" fill="${BRAND_COLORS.accent}" text-anchor="middle">
            Plataforma de Personal Training
          </text>

          <!-- Description -->
          <text x="0" y="40" font-family="Arial, sans-serif" font-size="22" fill="white" opacity="0.9" text-anchor="middle">
            Conectando professores e alunos
          </text>
          <text x="0" y="70" font-family="Arial, sans-serif" font-size="22" fill="white" opacity="0.9" text-anchor="middle">
            para aulas personalizadas
          </text>

          <!-- CTA Button -->
          <rect x="-125" y="120" width="250" height="60" rx="30" fill="${BRAND_COLORS.accent}"/>
          <text x="0" y="160" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="${BRAND_COLORS.primary}" text-anchor="middle">
            Comece Agora
          </text>
        </g>

        <!-- URL -->
        <text x="${size/2}" y="${size-50}" font-family="Arial, sans-serif" font-size="18" fill="white" opacity="0.7" text-anchor="middle">
          meupersonal.com.br
        </text>
      </svg>
    `;

    // Generate PNG from SVG
    await sharp(Buffer.from(svg))
      .png({ quality: 90 })
      .toFile(path.join(__dirname, '../apps/web/public/images/og-image-square.png'));

    console.log('✅ og-image-square.png generated successfully!');
  } catch (error) {
    console.error('❌ Error generating OG square image:', error);
  }
}

async function createOGImageWithPhoto() {
  try {
    // Create a more visual OG image using the fitness photo
    const photoPath = path.join(__dirname, '../apps/web/public/images/photo-1571019613454-1cb2f99b2d8b-1920.jpg');
    const logoPath = path.join(__dirname, '../apps/web/public/images/logo-fundobranco.png');

    // Check if files exist
    if (!fs.existsSync(photoPath)) {
      console.log('⚠️  Photo not found, using generated SVG instead');
      await generateOGImage();
      return;
    }

    const width = 1200;
    const height = 630;

    // Create composite image
    await sharp(photoPath)
      .resize(width, height, { fit: 'cover', position: 'center' })
      .composite([{
        input: Buffer.from(`
          <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="overlay" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:${BRAND_COLORS.primary};stop-opacity:0.1"/>
                <stop offset="100%" style="stop-color:${BRAND_COLORS.primary};stop-opacity:0.9"/>
              </linearGradient>
            </defs>

            <!-- Overlay gradient -->
            <rect width="${width}" height="${height}" fill="url(#overlay)"/>

            <!-- Content -->
            <g transform="translate(80, 200)">
              <!-- Title background for better contrast -->
              <rect x="-20" y="-80" width="600" height="280" rx="10" fill="${BRAND_COLORS.primary}" fill-opacity="0.8"/>

              <!-- Title -->
              <text x="0" y="0" font-family="Arial, sans-serif" font-size="72" font-weight="bold" fill="white">
                Meu Personal
              </text>

              <!-- Subtitle -->
              <text x="0" y="60" font-family="Arial, sans-serif" font-size="36" fill="${BRAND_COLORS.accent}">
                Plataforma de Personal Training
              </text>

              <!-- Description -->
              <text x="0" y="120" font-family="Arial, sans-serif" font-size="22" fill="white" opacity="0.9">
                Conectando professores e alunos para
              </text>
              <text x="0" y="150" font-family="Arial, sans-serif" font-size="22" fill="white" opacity="0.9">
                aulas personalizadas
              </text>
            </g>

            <!-- CTA Button -->
            <rect x="80" y="450" width="200" height="50" rx="25" fill="${BRAND_COLORS.accent}"/>
            <text x="180" y="485" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="${BRAND_COLORS.primary}" text-anchor="middle">
              Comece Agora
            </text>

            <!-- URL -->
            <text x="600" y="590" font-family="Arial, sans-serif" font-size="16" fill="white" opacity="0.7" text-anchor="middle">
              meupersonal.com.br
            </text>
          </svg>
        `),
        top: 0,
        left: 0
      }])
      .png({ quality: 90 })
      .toFile(path.join(__dirname, '../apps/web/public/images/og-image-v2.png'));

    console.log('✅ og-image-v2.png generated with photo background!');
  } catch (error) {
    console.error('❌ Error creating OG image with photo:', error);
    // Fallback to generated image
    await generateOGImage();
  }
}

// Generate all images
async function main() {
  console.log('🎨 Generating OG images...');

  await generateOGImage();
  await generateOGSquare();
  await createOGImageWithPhoto();

  console.log('🎉 All OG images generated successfully!');
  console.log('');
  console.log('📁 Files created:');
  console.log('   - apps/web/public/images/og-image.png (1200x630)');
  console.log('   - apps/web/public/images/og-image-square.png (1200x1200)');
  console.log('   - apps/web/public/images/og-image-v2.png (1200x630)');
  console.log('');
  console.log('🧪 Test your OG images at:');
  console.log('   - https://developers.facebook.com/tools/debug/');
  console.log('   - https://cards-dev.twitter.com/validator');
}

main().catch(console.error);