import { PrismaClient, ListingType, ListingStatus, PropertyType, RentPeriod, LandTenure, MeasurementUnit, HouseholdCategory, HouseholdCondition } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('FindamDemo123!', 12);
  const user = await prisma.user.upsert({ where: { email: 'demo@findam.app' }, update: {}, create: { email: 'demo@findam.app', passwordHash, firstName: 'Ada', lastName: 'Williams', phone: '+2348000000000', role: 'AGENT' } });
  const country = await prisma.country.upsert({ where: { code: 'NG' }, update: {}, create: { name: 'Nigeria', code: 'NG' } });
  const state = await prisma.state.upsert({ where: { countryId_name: { countryId: country.id, name: 'Cross River' } }, update: {}, create: { countryId: country.id, name: 'Cross River' } });
  const city = await prisma.city.upsert({ where: { stateId_name: { stateId: state.id, name: 'Calabar' } }, update: {}, create: { stateId: state.id, name: 'Calabar' } });
  const area = await prisma.area.upsert({ where: { cityId_name: { cityId: city.id, name: 'State Housing' } }, update: {}, create: { cityId: city.id, name: 'State Housing' } });
  await prisma.agentProfile.upsert({ where: { userId: user.id }, update: { agencyName: 'Findam Homes', bio: 'Trusted homes and land in Calabar.', areasCovered: ['State Housing', 'Ekorinim'], isVerified: true }, create: { userId: user.id, agencyName: 'Findam Homes', bio: 'Trusted homes and land in Calabar.', areasCovered: ['State Housing', 'Ekorinim'], isVerified: true } });

  const exists = await prisma.listing.count({ where: { ownerId: user.id } });
  if (exists === 0) {
    await prisma.listing.create({ data: { ownerId: user.id, type: ListingType.PROPERTY, title: 'Bright 2-bedroom apartment in State Housing', description: 'A modern furnished apartment with parking, water and secure access.', price: 1200000, status: ListingStatus.ACTIVE, countryId: country.id, stateId: state.id, cityId: city.id, areaId: area.id, latitude: 4.9757, longitude: 8.3417, propertyDetails: { create: { propertyType: PropertyType.APARTMENT, rentPeriod: RentPeriod.ANNUALLY, bedrooms: 2, bathrooms: 2, toilets: 2, parking: 1, isFurnished: true, amenities: ['Water', 'Security', 'Parking'], securityDeposit: 100000, agencyFee: 120000, legalFee: 120000, cautionFee: 50000, serviceCharge: 0, otherCharges: 0 } }, images: { create: [{ url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c', position: 0 }] } } });
    await prisma.listing.create({ data: { ownerId: user.id, type: ListingType.LAND, title: 'Residential land near Calabar city', description: 'Dry, accessible land suitable for a family home or investment.', price: 3500000, status: ListingStatus.ACTIVE, countryId: country.id, stateId: state.id, cityId: city.id, areaId: area.id, latitude: 4.98, longitude: 8.33, landDetails: { create: { tenure: LandTenure.SALE, numberOfPlots: 2, landSize: 1000, measurementUnit: MeasurementUnit.SQM, documentsAvailable: ['Registered survey'] } }, images: { create: [{ url: 'https://images.unsplash.com/photo-1500382017468-9049fed857ea', position: 0 }] } } });
    await prisma.listing.create({ data: { ownerId: user.id, type: ListingType.HOUSEHOLD, title: 'Clean used living room set', description: 'Comfortable sofa set in good condition, ready for pickup.', price: 180000, status: ListingStatus.ACTIVE, countryId: country.id, stateId: state.id, cityId: city.id, areaId: area.id, householdDetails: { create: { category: HouseholdCategory.FURNITURE, condition: HouseholdCondition.GOOD } }, images: { create: [{ url: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc', position: 0 }] } } });
  }
  const located = await prisma.listing.findMany({ where: { latitude: { not: null }, longitude: { not: null } }, select: { id: true, latitude: true, longitude: true } });
  for (const listing of located) if (listing.latitude !== null && listing.longitude !== null) await prisma.$executeRaw`UPDATE "Listing" SET location = ST_SetSRID(ST_MakePoint(${listing.longitude}, ${listing.latitude}), 4326)::geography WHERE id = ${listing.id}`;
  console.log('Seed complete. Demo login: demo@findam.app / FindamDemo123!');
}

main().finally(() => prisma.$disconnect());
