const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function createSimpleFavicon() {
  try {
    const svgPath = path.join(__dirname, '../apps/web/app/favicon.svg');
    const svgContent = fs.readFileSync(svgPath, 'utf8');

    // Generate PNG 32x32
    await sharp(Buffer.from(svgContent))
      .resize(32, 32, { fit: 'fill' })
      .png({ quality: 100 })
      .toFile(path.join(__dirname, '../apps/web/app/favicon-32.png'));

    console.log('✅ Generated favicon-32.png');

    // Create a simple favicon.ico from the 32x32 PNG
    const pngBuffer = await sharp(Buffer.from(svgContent))
      .resize(32, 32, { fit: 'fill' })
      .png()
      .toBuffer();

    // For now, just use the PNG as favicon (Next.js supports PNG favicon)
    fs.writeFileSync(path.join(__dirname, '../apps/web/app/favicon.png'), pngBuffer);

    console.log('✅ Generated favicon.png (Next.js compatible)');

    // Copy to public folder as well
    fs.writeFileSync(path.join(__dirname, '../apps/web/public/favicon-32.png'), pngBuffer);

    console.log('✅ Copied to public/favicon-32.png');

    // Remove the old large favicon.ico and use PNG instead
    const oldFaviconIco = path.join(__dirname, '../apps/web/app/favicon.ico');
    if (fs.existsSync(oldFaviconIco)) {
      fs.unlinkSync(oldFaviconIco);
      console.log('🗑️  Removed old large favicon.ico');
    }

    console.log('\n🎉 Favicon updated successfully!');
    console.log('\n📁 Files created/updated:');
    console.log('   - apps/web/app/favicon.svg (primary)');
    console.log('   - apps/web/app/favicon.png (Next.js compatible)');
    console.log('   - apps/web/public/favicon-32.png (backup)');

    console.log('\n💡 Next.js 13+ automatically uses favicon.ico or favicon.png from app/ directory');

  } catch (error) {
    console.error('❌ Error creating favicon:', error);
  }
}

createSimpleFavicon().catch(console.error);