const User = require('../models/User');
const Service = require('../models/Service');
const Counter = require('../models/Counter');
const Token = require('../models/Token');

const seedData = async () => {
  try {
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      console.log('📦 Database already has data. Skipping seed.');
      return;
    }

    console.log('🌱 Seeding initial QueueLess data...');

    // 1. Create Admin & Demo User
    const admin = await User.create({
      name: 'System Admin',
      email: 'admin@queueless.com',
      password: 'admin123',
      role: 'admin',
      officeAccessCode: 'MACE-OFFICE-2026',
    });

    const userAthul = await User.create({
      name: 'Athul',
      email: 'athul@example.com',
      password: 'user123',
      role: 'user',
    });

    const userPriya = await User.create({
      name: 'Priya Sharma',
      email: 'priya@example.com',
      password: 'user123',
      role: 'user',
    });

    const userRahul = await User.create({
      name: 'Rahul Nair',
      email: 'rahul@example.com',
      password: 'user123',
      role: 'user',
    });

    // 2. Create Services with College Access Keys
    const serviceOffice = await Service.create({
      serviceName: 'College Office',
      code: 'A',
      description: 'Fee collection, document submissions & hall ticket inquiries',
      avgServiceTimeMinutes: 5,
      status: 'ACTIVE',
      accessCode: 'MACE-OFFICE',
      requireAccessCode: true,
    });

    const serviceLab = await Service.create({
      serviceName: 'Laboratory',
      code: 'B',
      description: 'Equipment allocation, project evaluations & lab clearances',
      avgServiceTimeMinutes: 8,
      status: 'ACTIVE',
      accessCode: 'MACE-LAB',
      requireAccessCode: true,
    });

    const serviceClinic = await Service.create({
      serviceName: 'Clinic',
      code: 'C',
      description: 'Health consultations, first-aid & medical leave endorsements',
      avgServiceTimeMinutes: 7,
      status: 'ACTIVE',
      accessCode: 'MACE-CLINIC',
      requireAccessCode: true,
    });

    const serviceCert = await Service.create({
      serviceName: 'Certificate Section',
      code: 'D',
      description: 'Transcript issuance, bonafide & migration certificates',
      avgServiceTimeMinutes: 6,
      status: 'ACTIVE',
      accessCode: 'MACE-CERT',
      requireAccessCode: true,
    });

    // 3. Create Counters
    const counter1 = await Counter.create({
      counterName: 'Counter 1',
      service: serviceOffice._id,
      status: 'BUSY',
    });

    const counter2 = await Counter.create({
      counterName: 'Counter 2',
      service: serviceLab._id,
      status: 'ACTIVE',
    });

    const counter3 = await Counter.create({
      counterName: 'Counter 3',
      service: serviceClinic._id,
      status: 'ACTIVE',
    });

    const counter4 = await Counter.create({
      counterName: 'Counter 4',
      service: serviceCert._id,
      status: 'ACTIVE',
    });

    // 4. Create Initial Tokens
    // Completed history tokens
    await Token.create({
      tokenNumber: 'A015',
      sequenceNumber: 15,
      user: userAthul._id,
      service: serviceOffice._id,
      counter: counter1._id,
      status: 'COMPLETED',
      calledAt: new Date(Date.now() - 45 * 60 * 1000),
      completedAt: new Date(Date.now() - 40 * 60 * 1000),
    });

    await Token.create({
      tokenNumber: 'B008',
      sequenceNumber: 8,
      user: userPriya._id,
      service: serviceLab._id,
      counter: counter2._id,
      status: 'COMPLETED',
      calledAt: new Date(Date.now() - 30 * 60 * 1000),
      completedAt: new Date(Date.now() - 22 * 60 * 1000),
    });

    // Now Serving Token
    const servingToken = await Token.create({
      tokenNumber: 'A021',
      sequenceNumber: 21,
      user: userPriya._id,
      service: serviceOffice._id,
      counter: counter1._id,
      status: 'CALLED',
      calledAt: new Date(Date.now() - 3 * 60 * 1000),
    });

    counter1.currentServingToken = servingToken._id;
    await counter1.save();

    // Waiting queue
    await Token.create({
      tokenNumber: 'A022',
      sequenceNumber: 22,
      user: userRahul._id,
      service: serviceOffice._id,
      status: 'WAITING',
      estimatedWaitMinutes: 5,
    });

    await Token.create({
      tokenNumber: 'A023',
      sequenceNumber: 23,
      user: userPriya._id,
      service: serviceOffice._id,
      status: 'WAITING',
      estimatedWaitMinutes: 10,
    });

    await Token.create({
      tokenNumber: 'A024',
      sequenceNumber: 24,
      user: admin._id,
      service: serviceOffice._id,
      status: 'WAITING',
      estimatedWaitMinutes: 15,
    });

    console.log('✅ Demo Seed Data Loaded Successfully!');
    console.log('   Admin: admin@queueless.com / admin123');
    console.log('   User:  athul@example.com / user123');
  } catch (error) {
    console.error('Seed data error:', error);
  }
};

module.exports = seedData;
