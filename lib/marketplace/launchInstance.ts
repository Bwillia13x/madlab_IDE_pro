import { MarketplaceLaunch } from './launch';

export const marketplaceLaunch = new MarketplaceLaunch();

// Seed with a few mock creators/campaigns on first import (in-memory only)
let seeded = false;
async function seed() {
  if (seeded) return;
  seeded = true;
  try {
    // Create a couple of creators
    const c1 = await marketplaceLaunch.registerCreator({
      name: 'MAD LAB Team',
      email: 'team@madlab.com',
      bio: 'Official MAD LAB templates and tools',
      avatar: '/avatars/madlab.png',
      socialLinks: { github: 'https://github.com/madlab' }
    } as any);
    const c2 = await marketplaceLaunch.registerCreator({
      name: 'Options Expert',
      email: 'options@experts.io',
      bio: 'Advanced options analytics and strategies',
      avatar: '/avatars/options.png',
      socialLinks: { twitter: 'https://x.com/optionsexpert' }
    } as any);
    await marketplaceLaunch.verifyCreator(c1);
    await marketplaceLaunch.verifyCreator(c2);

    // Create a draft campaign
    await marketplaceLaunch.createCampaign({
      name: 'Launch Week Spotlight',
      description: 'Promote top community templates during launch week',
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      targetAudience: ['traders', 'analysts'],
      channels: ['email', 'social', 'in-app'],
      budget: 5000,
    });
  } catch {
    // ignore seeding errors
  }
}

seed();

