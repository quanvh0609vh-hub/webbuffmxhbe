import { Service } from '../models/index.js';

const SERVICES = [
  { name: 'Telegram Public Channel Members', category: 'Telegram', description: 'High quality members for public channels', pricePer1k: 0.95, minOrder: 50, maxOrder: 10000, sortOrder: 1 },
  { name: 'Telegram Private Group Members', category: 'Telegram', description: 'Members for private groups', pricePer1k: 1.20, minOrder: 50, maxOrder: 5000, sortOrder: 2 },
  { name: 'Telegram Post Views', category: 'Telegram', description: 'Instant post views', pricePer1k: 0.03, minOrder: 100, maxOrder: 500000, sortOrder: 3 },
  { name: 'Telegram Reactions', category: 'Telegram', description: 'Mix positive reactions', pricePer1k: 0.25, minOrder: 10, maxOrder: 10000, sortOrder: 4 },
  { name: 'YouTube Views', category: 'YouTube', description: 'High retention views', pricePer1k: 0.50, minOrder: 100, maxOrder: 100000, sortOrder: 5 },
  { name: 'YouTube Likes', category: 'YouTube', description: 'Real-looking likes', pricePer1k: 1.50, minOrder: 10, maxOrder: 50000, sortOrder: 6 },
  { name: 'YouTube Subscribers', category: 'YouTube', description: 'Subscribers with 30-day refill', pricePer1k: 4.00, minOrder: 10, maxOrder: 5000, sortOrder: 7 },
  { name: 'YouTube Watch Time', category: 'YouTube', description: 'Watch time hours for videos', pricePer1k: 3.00, minOrder: 100, maxOrder: 10000, sortOrder: 8 },
  { name: 'TikTok Followers', category: 'TikTok', description: 'TikTok followers - fast delivery', pricePer1k: 1.20, minOrder: 10, maxOrder: 50000, sortOrder: 9 },
  { name: 'TikTok Views', category: 'TikTok', description: 'TikTok video views', pricePer1k: 0.05, minOrder: 100, maxOrder: 1000000, sortOrder: 10 },
  { name: 'TikTok Likes', category: 'TikTok', description: 'TikTok video likes', pricePer1k: 0.30, minOrder: 10, maxOrder: 100000, sortOrder: 11 },
  { name: 'Instagram Followers', category: 'Instagram', description: 'Instagram followers - non drop', pricePer1k: 0.80, minOrder: 10, maxOrder: 100000, sortOrder: 12 },
  { name: 'Instagram Likes', category: 'Instagram', description: 'Instagram photo/video likes', pricePer1k: 0.15, minOrder: 10, maxOrder: 100000, sortOrder: 13 },
  { name: 'Instagram Views', category: 'Instagram', description: 'Instagram video views', pricePer1k: 0.08, minOrder: 100, maxOrder: 500000, sortOrder: 14 },
  { name: 'Facebook Page Likes', category: 'Facebook', description: 'Facebook page likes', pricePer1k: 1.00, minOrder: 50, maxOrder: 100000, sortOrder: 15 },
  { name: 'Facebook Post Likes', category: 'Facebook', description: 'Facebook post/photo likes', pricePer1k: 0.40, minOrder: 10, maxOrder: 50000, sortOrder: 16 },
  { name: 'Facebook Views', category: 'Facebook', description: 'Facebook video views', pricePer1k: 0.20, minOrder: 100, maxOrder: 1000000, sortOrder: 17 },
  { name: 'Twitter/X Followers', category: 'Twitter', description: 'Twitter followers', pricePer1k: 1.50, minOrder: 10, maxOrder: 50000, sortOrder: 18 },
  { name: 'Twitter/X Retweets', category: 'Twitter', description: 'Twitter retweets', pricePer1k: 0.80, minOrder: 10, maxOrder: 50000, sortOrder: 19 },
  { name: 'Twitter/X Likes', category: 'Twitter', description: 'Twitter likes/favorites', pricePer1k: 0.60, minOrder: 10, maxOrder: 50000, sortOrder: 20 },
];

export async function seedServices() {
  const count = await Service.countDocuments();
  if (count === 0) {
    await Service.insertMany(SERVICES);
    console.log('Seed services: 20 services inserted');
  }
}
