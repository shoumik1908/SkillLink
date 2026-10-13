import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  await prisma.notification.deleteMany();
  await prisma.joinRequest.deleteMany();
  await prisma.listingMember.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.user.deleteMany();

  const defaultPassword = await bcrypt.hash('password123', 10);

  // Create Users
  const user1 = await prisma.user.create({
    data: {
      name: 'Shoumik Kumar',
      email: 'shoumik1908@gmail.com',
      passwordHash: defaultPassword,
      college: 'State University',
      yearOfStudy: 3,
      skills: ['React', 'UI/UX', 'Tailwind'],
      bio: 'Frontend enthusiast looking for hackathon teammates and web projects.',
    },
  });

  const user2 = await prisma.user.create({
    data: {
      name: 'Bob Jones',
      email: 'bob@uni.edu',
      passwordHash: defaultPassword,
      college: 'State University',
      yearOfStudy: 2,
      skills: ['Python', 'Machine Learning'],
      bio: 'AI researcher and data science nerd.',
    },
  });

  const user3 = await prisma.user.create({
    data: {
      name: 'Charlie Brown',
      email: 'charlie@uni.edu',
      passwordHash: defaultPassword,
      college: 'State University',
      yearOfStudy: 4,
      skills: ['Node.js', 'PostgreSQL', 'React'],
      bio: 'Fullstack developer preparing for graduation capstone project.',
    },
  });

  // Create Listings
  const listing1 = await prisma.listing.create({
    data: {
      ownerId: user2.id,
      title: 'AI Image Generator Hackathon',
      description: 'Looking for a frontend dev to build the UI for our AI image generation tool for the upcoming Spring Hackathon.',
      type: 'Hackathon Team',
      requiredSkills: ['React', 'Tailwind', 'UI/UX'],
      intendedTeamSize: 4,
      college: 'State University',
      status: 'OPEN',
      members: {
        create: { userId: user2.id },
      },
    },
  });

  const listing2 = await prisma.listing.create({
    data: {
      ownerId: user3.id,
      title: 'Campus Marketplace App',
      description: 'Building a marketplace for students to buy/sell textbooks. Need help with the frontend.',
      type: 'Project',
      requiredSkills: ['React', 'Node.js'],
      intendedTeamSize: 3,
      college: 'State University',
      status: 'OPEN',
      members: {
        create: { userId: user3.id },
      },
    },
  });

  // Create sample notification
  await prisma.notification.create({
    data: {
      userId: user1.id,
      message: 'Welcome to SkillLink! Browse project listings or match with team leads.',
    },
  });

  console.log('✅ Seed completed successfully:');
  console.log(`- Created users: ${user1.name}, ${user2.name}, ${user3.name}`);
  console.log(`- Password for all test users: password123`);
  console.log(`- Created listings: "${listing1.title}", "${listing2.title}"`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
