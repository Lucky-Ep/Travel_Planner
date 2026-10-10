// Only presentation metadata lives here. The backend POI id, name, location,
// category, rating and image remain the source of truth.
const SHANGHAI_DETAILS = {
  'poi-the-bund': {
    chineseName: '外滩',
    description: '沿着黄浦江漫步，欣赏历史建筑与浦东天际线。',
    tags: ['江景', '夜景', '城市地标'],
    fallbackImageUrl: '/pois/shanghai-skyline.svg',
  },
  'poi-yu-garden': {
    chineseName: '豫园',
    description: '拥有亭台、假山和池塘的古典园林，周围是热闹的老街。',
    tags: ['历史', '园林', '建筑'],
    fallbackImageUrl: '/pois/shanghai-garden.svg',
  },
  'poi-shanghai-museum': {
    chineseName: '上海博物馆',
    description: '以青铜器、陶瓷、书画等中国古代艺术收藏闻名。',
    tags: ['博物馆', '艺术', '历史'],
    fallbackImageUrl: '/pois/shanghai-museum.svg',
  },
  'poi-oriental-pearl': {
    chineseName: '东方明珠',
    description: '上海标志性的观光塔，可俯瞰城市与黄浦江。',
    tags: ['观景', '天际线', '亲子'],
    fallbackImageUrl: '/pois/shanghai-skyline.svg',
  },
  'poi-wukang-mansion': {
    chineseName: '武康大楼',
    description: '梧桐街区中的经典建筑，也是热门城市漫步地点。',
    tags: ['建筑', '摄影', '城市漫步'],
    fallbackImageUrl: '/pois/shanghai-street.svg',
  },
  'poi-xintiandi': {
    chineseName: '新天地',
    description: '石库门建筑与餐厅、咖啡馆和商店相结合的步行街区。',
    tags: ['购物', '美食', '夜生活'],
    fallbackImageUrl: '/pois/shanghai-street.svg',
  },
  'poi-tianzifang': {
    chineseName: '田子坊',
    description: '由小巷、工作室、小吃店和手工艺店组成的街区。',
    tags: ['小吃', '弄堂', '手作'],
    fallbackImageUrl: '/pois/shanghai-lane.svg',
  },
  'poi-disneyland': {
    chineseName: '上海迪士尼乐园',
    description: '适合安排一整天游玩的主题乐园。',
    tags: ['主题乐园', '亲子', '全天'],
    fallbackImageUrl: '/pois/shanghai-disney.svg',
  },
};

export const FALLBACK_POI_IMAGE = '/pois/shanghai-skyline.svg';

function getWikimediaSourceUrl(imageUrl) {
  const filename = imageUrl?.match(
    /\/wikipedia\/commons\/thumb\/[0-9a-f]\/[0-9a-f]{2}\/([^/]+)\//i,
  )?.[1];
  return filename ? `https://commons.wikimedia.org/wiki/File:${filename}` : null;
}

export function toExplorePoi(poi) {
  const details = SHANGHAI_DETAILS[poi.externalPlaceId] ?? {};
  return {
    ...poi,
    chineseName: details.chineseName ?? '',
    description: details.description ?? '',
    tags: details.tags ?? [],
    imageUrl: poi.imageUrl || details.fallbackImageUrl || FALLBACK_POI_IMAGE,
    fallbackImageUrl: details.fallbackImageUrl || FALLBACK_POI_IMAGE,
    photoSourceUrl: getWikimediaSourceUrl(poi.imageUrl),
  };
}

export function matchesPoi(poi, query) {
  const keyword = query.trim().toLocaleLowerCase();
  if (!keyword) return true;
  return [poi.name, poi.chineseName, poi.address, poi.category, ...poi.tags]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase()
    .includes(keyword);
}

export function formatRating(rating) {
  return typeof rating === 'number' && Number.isFinite(rating)
    ? rating.toFixed(1)
    : null;
}
