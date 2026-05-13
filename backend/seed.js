const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Post = require('./models/Post');
const Comment = require('./models/Comment');

dotenv.config();

const users = [
  {
    username: 'alex_vibes',
    email: 'alex@example.com',
    password: 'password123',
    fullName: 'Alex Johnson',
    bio: 'Photographer and tech enthusiast. ✨',
    isVerified: true
  },
  {
    username: 'sarah_styles',
    email: 'sarah@example.com',
    password: 'password123',
    fullName: 'Sarah Miller',
    bio: 'Traveler. Foodie. Fashion lover. 👗✈️',
    isVerified: false
  },
  {
    username: 'dev_guy',
    email: 'dev@example.com',
    password: 'password123',
    fullName: 'David Smith',
    bio: 'Building the future of social media. 💻🚀',
    isVerified: true
  }
];

const posts = [
  {
    content: 'Just launched my new project! Check it out. 🚀 #coding #javascript #vibe',
    username: 'dev_guy'
  },
  {
    content: 'The sunset today was absolutely breathtaking. 🌅 #photography #nature #vibes',
    username: 'alex_vibes'
  },
  {
    content: 'Finally visited that new cafe downtown. The coffee is amazing! ☕️🧁',
    username: 'sarah_styles'
  },
  {
    content: 'Exploring the hidden gems of the city. 🏙️✨',
    username: 'sarah_styles'
  },
  {
    content: 'Coffee + Code = Perfection. ☕️💻',
    username: 'dev_guy'
  }
];

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB for seeding...');

    // Clear existing data
    await User.deleteMany({});
    await Post.deleteMany({});
    await Comment.deleteMany({});
    console.log('Cleared existing data.');

    // Create users
    const createdUsers = await User.create(users);
    console.log(`Created ${createdUsers.length} demo users.`);

    // Map usernames to IDs for post creation
    const userMap = {};
    createdUsers.forEach(u => userMap[u.username] = u._id);

    // Create posts
    const postData = posts.map(p => ({
      content: p.content,
      author: userMap[p.username]
    }));

    const createdPosts = await Post.create(postData);
    console.log(`Created ${createdPosts.length} sample posts.`);

    // Add some random likes
    for (const post of createdPosts) {
      const randomUsers = createdUsers
        .sort(() => 0.5 - Math.random())
        .slice(0, Math.floor(Math.random() * createdUsers.length));
      
      post.likes = randomUsers.map(u => u._id);
      await post.save();
    }
    console.log('Added random likes to posts.');

    console.log('Database seeded successfully! 🌱');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding database:', err);
    process.exit(1);
  }
};

seedDB();
