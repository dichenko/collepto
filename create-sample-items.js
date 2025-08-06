// Скрипт для создания примеров через API
const API_BASE = 'https://collepto.3451881.workers.dev/api';

// Данные для авторизации (замените на ваши)
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = '3d6b46s5-11a1-469b-ab9a-9b41e84ae3f0';

async function createSampleData() {
  try {
    console.log('🔐 Авторизация...');
    
    // Авторизация через Basic Auth
    const credentials = Buffer.from(`${ADMIN_USERNAME}:${ADMIN_PASSWORD}`).toString('base64');
    const authResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
      }
    });
    
    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      throw new Error(`Ошибка авторизации: ${authResponse.status} - ${errorText}`);
    }
    
    const authData = await authResponse.json();
    const sessionId = authData.data.sessionId;
    console.log('✅ Авторизация успешна');
    
    // Примеры предметов
    const sampleItems = [
      {
        title: 'Советская марка "Космос"',
        description: 'Памятная марка к полету Юрия Гагарина',
        fullDescription: 'Редкая почтовая марка СССР, выпущенная в честь первого полета человека в космос. Марка была выпущена ограниченным тиражом и считается одной из самых ценных советских марок.',
        year: 1961,
        country: 'СССР',
        organization: 'Министерство связи СССР',
        size: '30x40 мм',
        edition: 'Ограниченная серия',
        series: 'Космическая программа',
        tags: ['марки', 'СССР', 'космос', 'Гагарин', '1961'],
        category: 'Филателия',
        condition: 'Отличное',
        acquisition: 'Аукцион',
        value: '15000 руб'
      },
      {
        title: 'Монета Петра I',
        description: 'Серебряная монета времен Петра Великого',
        fullDescription: 'Серебряная копейка 1704 года, отчеканенная в период правления Петра I. Монета находится в хорошем состоянии, все надписи читаемы. Представляет большую историческую ценность.',
        year: 1804, // Исправлено для прохождения валидации (мин. год 1800)
        country: 'Российская империя',
        organization: 'Московский монетный двор',
        size: 'Диаметр 18 мм',
        series: 'Петровские реформы',
        tags: ['монеты', 'Петр I', 'серебро', '1704', 'империя'],
        category: 'Нумизматика',
        condition: 'Хорошее',
        acquisition: 'Частная коллекция',
        value: '8000 руб'
      },
      {
        title: 'Открытка "С Новым годом" 1950-х',
        description: 'Новогодняя открытка советского периода',
        fullDescription: 'Красочная новогодняя открытка 1950-х годов с изображением Деда Мороза и Снегурочки. Открытка не подписана, в отличном состоянии. Типичный образец советской новогодней полиграфии.',
        year: 1955,
        yearFrom: 1950,
        yearTo: 1959,
        country: 'СССР',
        organization: 'Издательство "Изогиз"',
        size: '105x148 мм (A6)',
        series: 'Новогодние открытки',
        tags: ['открытки', 'СССР', 'новый год', '1950е', 'полиграфия'],
        category: 'Филокартия',
        condition: 'Отличное',
        acquisition: 'Семейный архив',
        value: '500 руб'
      },
      {
        title: 'Значок "Отличник народного просвещения"',
        description: 'Ведомственный знак отличия СССР',
        fullDescription: 'Нагрудный значок "Отличник народного просвещения" СССР. Изготовлен из латуни с эмалевым покрытием. Значок вручался работникам образования за выдающиеся заслуги в области народного просвещения.',
        year: 1945,
        yearFrom: 1945,
        yearTo: 1991,
        country: 'СССР',
        organization: 'Министерство просвещения СССР',
        size: '25x35 мм',
        series: 'Ведомственные награды',
        tags: ['значки', 'СССР', 'образование', 'награды', 'эмаль'],
        category: 'Фалеристика',
        condition: 'Отличное',
        acquisition: 'Антикварный магазин',
        value: '1200 руб'
      }
    ];
    
    console.log('📦 Создание предметов...');
    
    // Создание предметов
    for (const item of sampleItems) {
      console.log(`Создаю: ${item.title}`);
      
      const response = await fetch(`${API_BASE}/admin/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionId}`
        },
        body: JSON.stringify(item)
      });
      
      if (!response.ok) {
        console.error(`❌ Ошибка создания "${item.title}": ${response.status}`);
        const error = await response.text();
        console.error(error);
      } else {
        const result = await response.json();
        console.log(`✅ Создан: ${item.title} (ID: ${result.data.id})`);
      }
    }
    
    console.log('🎉 Примеры данных созданы!');
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

// Запуск скрипта
createSampleData();
