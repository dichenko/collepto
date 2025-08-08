// Script to generate slugs for existing items and blog posts
// Run this with: node generate_slugs_script.js

const API_BASE = 'https://collepto.3451881.workers.dev/api'; // Change to your API URL

// Simple transliteration map for Russian to English
const transliterationMap = {
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
  'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
  'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
  'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
  'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
  // Uppercase variants
  'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'Yo',
  'Ж': 'Zh', 'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M',
  'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U',
  'Ф': 'F', 'Х': 'H', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Sch',
  'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya'
};

function transliterate(text) {
  return text
    .split('')
    .map(char => transliterationMap[char] || char)
    .join('');
}

function createBasicSlug(text) {
  return transliterate(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

function createSlug(title, id) {
  const basicSlug = createBasicSlug(title);
  const shortId = id.substring(0, 4);
  
  if (!basicSlug || basicSlug.length < 2) {
    return `item_${shortId}`;
  }
  
  return `${basicSlug}_${shortId}`;
}

async function updateItemSlugs() {
  try {
    console.log('This is a template script for updating existing slugs.');
    console.log('Since we need admin authentication, you should:');
    console.log('');
    console.log('1. Login to admin panel');
    console.log('2. For each existing item without slug, generate slug using this pattern:');
    console.log('   slug = createSlug(item.title, item.id)');
    console.log('3. Update via admin API');
    console.log('');
    console.log('Or wait for new items to be created - they will automatically get slugs');
    console.log('');
    console.log('Example slug generation:');
    console.log('Title: "Советская монета 1 копейка", ID: "1a2b3c4d-..."');
    console.log('Slug:', createSlug('Советская монета 1 копейка', '1a2b3c4d-5e6f-7g8h-9i0j-k1l2m3n4o5p6'));
  } catch (error) {
    console.error('Error:', error);
  }
}

updateItemSlugs();
